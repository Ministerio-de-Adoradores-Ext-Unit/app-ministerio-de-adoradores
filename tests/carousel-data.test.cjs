const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const USER = '11111111-1111-4111-8111-111111111111';
const CATEGORY = { id: '3a47c385-00dc-4f87-8d23-e1730933f350', categoria: 'Carrossel da Home' };
const INTERNAL = 'detalhe-interno-que-nao-deve-aparecer';

function setup(options = {}) {
  const calls = [];
  let category = options.category ?? null;
  let reads = 0, createdCount = 0;
  const supabase = {
    from(table) {
      calls.push(['table', table]);
      assert.equal(table, 'media_categories');
      return {
        select(columns) {
          calls.push(['select', columns]);
          assert.equal(columns, 'id, categoria');
          return {
            eq(column, value) {
              calls.push(['eq', column, value]);
              assert.equal(column, 'id');
              assert.equal(value, CATEGORY.id);
              return { async maybeSingle() {
                reads += 1;
                calls.push(['read']);
                if (options.readThrowAt?.includes(reads)) throw new Error(INTERNAL);
                if (options.readErrorAt?.includes(reads)) return { data: null, error: { message: INTERNAL } };
                if (options.malformedReadAt?.includes(reads)) return { error: null };
                return { data: category, error: null };
              } };
            },
          };
        },
        upsert(values, settings) {
          calls.push(['upsert', values, settings]);
          assert.equal(settings.onConflict, 'id');
          assert.equal(settings.ignoreDuplicates, true);
          return { then(resolve, reject) {
            return Promise.resolve().then(() => {
              if (options.concurrentCategory) category = options.concurrentCategory;
              if (options.throwBeforeCommit) throw new Error(INTERNAL);
              if (options.upsertError) return { data: null, error: { message: INTERNAL } };
              if (!category) {
                createdCount += 1;
                category = { ...values };
              }
              if (options.throwAfterCommit) throw new Error(INTERNAL);
              return { data: null, error: null };
            }).then(resolve, reject);
          } };
        },
      };
    },
  };
  const filename = path.join(__dirname, '..', 'src/services/supabaseCarousel.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === '../lib/supabase') return { supabase };
      if (name === './supabaseAuth') return { async getAuthenticatedUser() {
        calls.push(['auth']);
        if (options.authThrow) throw new Error(INTERNAL);
        return Object.hasOwn(options, 'user') ? options.user : { id: USER };
      } };
      assert.equal(name, './supabaseData');
      return { async listMediaByCategory(id) {
        calls.push(['list', id]);
        if (options.listThrow) throw new Error(INTERNAL);
        return options.photos ?? [];
      } };
    },
  }, { filename });
  return { api: exports, calls, category: () => category, createdCount: () => createdCount };
}

function friendly(error) {
  assert.ok(error.message.length > 0);
  assert.ok(!error.message.includes(INTERNAL));
  return true;
}

test('carrossel usa categoria fixa e leitura pública não autentica nem cria registros', async () => {
  const visible = { id: 'foto-valida', imageUrl: 'https://images.example/foto.jpg' };
  const { api, calls } = setup({ photos: [visible, { imageUrl: null }, { imageUrl: '' }, { imageUrl: '   ' }, {}] });
  assert.equal(api.HOME_CAROUSEL_CATEGORY.id, CATEGORY.id);
  assert.equal(api.HOME_CAROUSEL_CATEGORY.categoria, CATEGORY.categoria);
  assert.equal(calls.length, 0);
  const photos = await api.listHomeCarouselMedia();
  assert.equal(photos.length, 1);
  assert.equal(photos[0], visible);
  assert.deepEqual(calls, [['list', CATEGORY.id]]);
});

test('carrossel vazio permanece vazio; falha da leitura não finge ausência de imagens', async () => {
  assert.equal((await setup().api.listHomeCarouselMedia()).length, 0);
  const { api, calls } = setup({ listThrow: true });
  await assert.rejects(api.listHomeCarouselMedia(), (error) => {
    friendly(error);
    assert.match(error.message, /carregar as imagens/);
    return true;
  });
  assert.deepEqual(calls, [['list', CATEGORY.id]]);
});

test('preparar categoria exige sessão confirmada antes de consultar ou gravar', async () => {
  for (const options of [{ user: null }, { user: {} }, { user: { id: 'id-local' } }, { authThrow: true }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.ensureHomeCarouselCategory(), friendly);
    assert.deepEqual(calls, [['auth']]);
  }
});

test('categoria já existente é confirmada sem nova gravação', async () => {
  const existing = { ...CATEGORY };
  const { api, calls } = setup({ category: existing });
  assert.equal(await api.ensureHomeCarouselCategory(), existing);
  assert.equal(calls.filter(([operation]) => operation === 'read').length, 1);
  assert.equal(calls.some(([operation]) => operation === 'upsert'), false);
});

test('primeira gravação cria apenas ID e nome e relê a categoria para confirmar', async () => {
  const { api, calls, createdCount } = setup();
  const category = await api.ensureHomeCarouselCategory();
  assert.equal(category.id, CATEGORY.id);
  assert.equal(category.categoria, CATEGORY.categoria);
  const [, values, settings] = calls.find(([operation]) => operation === 'upsert');
  assert.deepEqual(Object.keys(values).sort(), ['categoria', 'id']);
  assert.equal(values.id, CATEGORY.id);
  assert.equal(values.categoria, CATEGORY.categoria);
  assert.equal(settings.onConflict, 'id');
  assert.equal(settings.ignoreDuplicates, true);
  assert.equal(calls.filter(([operation]) => operation === 'read').length, 2);
  assert.equal(createdCount(), 1);
});

test('duas primeiras gravações simultâneas convergem para a mesma categoria sem sobrescrever', async () => {
  const { api, calls, createdCount } = setup();
  const [first, second] = await Promise.all([api.ensureHomeCarouselCategory(), api.ensureHomeCarouselCategory()]);
  assert.equal(first.id, CATEGORY.id);
  assert.equal(second.id, CATEGORY.id);
  assert.equal(createdCount(), 1);
  assert.equal(calls.filter(([operation]) => operation === 'upsert').length, 2);
});

test('categoria com o ID reservado e nome diferente não é renomeada nem usada', async () => {
  const existing = { id: CATEGORY.id, categoria: 'Outra categoria' };
  const { api, calls, category } = setup({ category: existing });
  await assert.rejects(api.ensureHomeCarouselCategory(), /configuração diferente/);
  assert.equal(category(), existing);
  assert.equal(calls.some(([operation]) => operation === 'upsert'), false);
});

test('consulta inicial falha ou incompleta impede tentativa de criação', async () => {
  for (const options of [{ readThrowAt: [1] }, { readErrorAt: [1] }, { malformedReadAt: [1] }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.ensureHomeCarouselCategory(), friendly);
    assert.equal(calls.some(([operation]) => operation === 'upsert'), false);
  }
});

test('resposta perdida após criar é confirmada pela releitura, sem duplicar o registro', async () => {
  const { api, createdCount } = setup({ throwAfterCommit: true });
  const category = await api.ensureHomeCarouselCategory();
  assert.equal(category.id, CATEGORY.id);
  assert.equal(category.categoria, CATEGORY.categoria);
  assert.equal(createdCount(), 1);
});

test('falha de criação ou confirmação é amigável e não retorna sucesso falso', async () => {
  for (const options of [
    { upsertError: true }, { throwBeforeCommit: true },
    { readThrowAt: [2] }, { readErrorAt: [2] }, { malformedReadAt: [2] },
  ]) {
    const { api } = setup(options);
    await assert.rejects(api.ensureHomeCarouselCategory(), (error) => {
      friendly(error);
      assert.match(error.message, /preparar a categoria/);
      return true;
    });
  }
});

test('concorrência com nome conflitante não altera a categoria que surgiu no intervalo', async () => {
  const concurrent = { id: CATEGORY.id, categoria: 'Categoria de outra finalidade' };
  const { api, category, createdCount } = setup({ concurrentCategory: concurrent });
  await assert.rejects(api.ensureHomeCarouselCategory(), /configuração diferente/);
  assert.equal(category(), concurrent);
  assert.equal(createdCount(), 0);
});
