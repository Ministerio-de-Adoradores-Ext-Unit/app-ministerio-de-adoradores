const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const USER = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN = '22222222-2222-4222-8222-222222222222';
const CREATED = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const OBJECT = '55555555-5555-4555-8555-555555555555';
const OLD_PATH = `donations/${CAMPAIGN}/anterior.png`;
const INTERNAL = 'detalhe-interno-que-nao-deve-aparecer';
const asset = { base64: 'aW1hZ2Vt', mimeType: 'image/png', uri: 'file:///imagem-local.png' };
const input = () => ({ title: '  Campanha nova  ', imageAsset: asset });

function load(file, dependencies, extra = {}) {
  const filename = path.join(__dirname, '..', file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, Date, Uint8Array, ArrayBuffer,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada: ${name}`);
      return dependencies[name];
    },
    ...extra,
  }, { filename });
  return exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

function setup(options = {}) {
  const calls = [];
  const previous = {
    id: CAMPAIGN, title: 'Campanha anterior', subtitle: 'Subtítulo existente',
    description: 'Descrição existente', image_path: OLD_PATH, asset_key: null,
    created_at: '2026-11-20T12:00:00Z', ...options.previous,
  };
  const rows = new Map((options.rows || (options.missing ? [] : [previous])).map((row) => [row.id, row]));
  let reads = 0;
  let uploadedPath;
  const storage = {
    async upload(objectPath, bytes, settings) {
      uploadedPath = objectPath;
      calls.push(['upload', objectPath, bytes, settings]);
      if (options.uploadThrow) throw new Error(INTERNAL);
      return Object.hasOwn(options, 'uploadResult')
        ? options.uploadResult : { data: { path: objectPath }, error: null };
    },
    async remove(paths) {
      calls.push(['remove', ...paths]);
      if (options.removeThrow) throw new Error(INTERNAL);
      return Object.hasOwn(options, 'removeResult')
        ? options.removeResult : { data: paths.map((name) => ({ name })), error: null };
    },
  };
  const supabase = {
    storage: { from(bucket) { calls.push(['bucket', bucket]); assert.equal(bucket, 'media-images'); return storage; } },
    from(table) {
      assert.equal(table, 'donation_campaigns');
      calls.push(['table', table]);
      let operation = 'read', values, limit, columns;
      const filters = [];
      const matching = () => [...rows.values()].filter((row) => filters.every(([column, value]) => row[column] === value));
      const query = {
        select(selected) { columns = selected; calls.push(['select', selected]); return query; },
        order(column, settings) { calls.push(['order', column, settings]); return query; },
        limit(count) { limit = count; calls.push(['limit', count]); return query; },
        eq(column, value) { filters.push([column, value]); calls.push(['eq', column, value]); return query; },
        is(column, value) { filters.push([column, value]); calls.push(['is', column, value]); return query; },
        insert(payload) { operation = 'insert'; values = payload; calls.push(['insert', payload]); return query; },
        update(payload) { operation = 'update'; values = payload; calls.push(['update', payload]); return query; },
        delete() { operation = 'delete'; calls.push(['delete']); return query; },
        async maybeSingle() {
          if (operation === 'read') {
            reads += 1;
            calls.push(['read', filters.find(([column]) => column === 'id')?.[1]]);
            if (options.readFailureAt?.includes(reads)) throw new Error(INTERNAL);
            if (options.readErrorAt?.includes(reads)) return { data: null, error: { message: INTERNAL } };
            if (options.readResultAt?.[reads]) return options.readResultAt[reads];
            return { data: matching()[0] ?? null, error: null, status: 200 };
          }
          calls.push(['write', operation, plain(filters)]);
          if (options.rejection) return options.rejection;
          if (options.throwBeforeCommit) throw new Error(INTERNAL);
          if (options.zeroRowsMutation) return { data: null, error: null, status: 200 };
          if (options.concurrent) options.concurrent(rows, operation);
          let data;
          if (operation === 'insert') {
            if (rows.has(values.id)) return { data: null, error: { code: '23505', message: INTERNAL }, status: 409 };
            data = { ...values, created_at: '2026-11-20T14:00:00Z' };
            rows.set(data.id, data);
          } else {
            const current = matching()[0];
            if (!current) return { data: null, error: null, status: 200 };
            data = operation === 'update' ? { ...current, ...values } : current;
            if (operation === 'delete') rows.delete(data.id);
            else rows.set(data.id, data);
          }
          calls.push(['commit', operation, data.id]);
          if (options.afterCommit) options.afterCommit(rows, data, operation);
          if (options.throwAfterCommit) throw new Error(INTERNAL);
          if (options.malformedAfterCommit) return { data: null, error: null };
          if (options.errorAfterCommit) return options.errorAfterCommit;
          return { data, error: null, status: 200 };
        },
        then(resolve, reject) {
          assert.equal(operation, 'read');
          const references = columns === 'id' && filters.some(([column]) => column === 'image_path');
          calls.push([references ? 'references' : 'list', plain(filters)]);
          let response;
          if (references && options.referencesResult) response = options.referencesResult;
          else if (!references && options.listResult) response = options.listResult;
          else {
            let data = matching();
            if (references && options.referenceExists) data = [{ id: OTHER }];
            if (limit) data = data.slice(0, limit);
            response = { data, error: null, status: 200 };
          }
          if ((references && options.referencesThrow) || (!references && options.listThrow)) {
            return Promise.reject(new Error(INTERNAL)).then(resolve, reject);
          }
          return Promise.resolve(response).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const helper = load('src/utils/imageUploadData.js', {
    'base64-arraybuffer': require('base64-arraybuffer'),
  }, { crypto: { randomUUID: () => OBJECT } });
  const api = load('src/services/supabaseDonations.js', {
    '../lib/supabase': { supabase },
    './supabaseAuth': { async getAuthenticatedUser() {
      calls.push(['auth']);
      if (options.authThrow) throw new Error(INTERNAL);
      return Object.hasOwn(options, 'user') ? options.user : { id: USER };
    } },
    './supabaseData': { async resolvePrivateImageUrl(imagePath, bucket) {
      calls.push(['sign', imagePath, bucket]);
      if (options.signThrow) throw new Error(INTERNAL);
      return `https://images.invalid/${imagePath}`;
    } },
    '../utils/imageUploadData': helper,
  }, options.fallbackUuid ? {} : { crypto: { randomUUID: () => CREATED } });
  return { api, calls, rows, previous, uploadedPath: () => uploadedPath };
}

function friendly(error) {
  assert.ok(error.message.length > 0);
  assert.equal(error.message.includes(INTERNAL), false);
  return true;
}

const operations = (calls) => calls.map(([name]) => name);
const removedPaths = (calls) => calls.filter(([name]) => name === 'remove').flatMap(([, ...paths]) => paths);

test('leitura pública assina apenas fotos remotas e não autentica, grava ou restaura campanhas', async () => {
  const bundled = { id: OTHER, title: 'Agasalho', image_path: null, asset_key: 'agasalho-1' };
  const { api, calls } = setup({ rows: [bundled, { id: CAMPAIGN, title: 'Nova', image_path: OLD_PATH, asset_key: null }] });
  const listed = await api.listDonationCampaigns();
  assert.equal(listed.length, 2);
  assert.equal(listed[0].asset_key, 'agasalho-1');
  assert.equal(listed[0].imageUrl, null);
  assert.equal(listed[1].imageUrl, `https://images.invalid/${OLD_PATH}`);
  assert.deepEqual(calls.filter(([name]) => name === 'sign'), [['sign', OLD_PATH, 'media-images']]);
  assert.equal(operations(calls).some((name) => ['auth', 'insert', 'update', 'upload', 'delete'].includes(name)), false);
  assert.deepEqual(calls.filter(([name]) => name === 'order').map(([, column]) => column), ['created_at', 'id']);
  const empty = setup({ rows: [] });
  assert.equal((await empty.api.listDonationCampaigns()).length, 0);
  assert.equal(operations(empty.calls).some((name) => name === 'insert'), false);
});

test('erro ao assinar uma foto conserva as informações e as outras campanhas', async () => {
  const { api, previous } = setup({ signThrow: true });
  const rows = await api.listDonationCampaigns();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, previous.id);
  assert.equal(rows[0].imageUrl, null);
});

test('falha da lista não é apresentada como lista vazia nem vaza detalhes internos', async () => {
  for (const options of [
    { listThrow: true }, { listResult: { data: null, error: { message: INTERNAL } } },
    { listResult: { data: [], error: null, status: 403 } },
    { listResult: { error: null } },
  ]) await assert.rejects(setup(options).api.listDonationCampaigns(), friendly);
});

test('título, identificador e imagem são validados antes de acessar banco ou armazenamento', async () => {
  for (const invalid of [
    undefined, {}, { title: ' ' }, { ...input(), title: 123 },
    { title: 'Válido' }, { ...input(), id: '' }, { ...input(), id: 'temporário' },
    { ...input(), imageAsset: { uri: 'file:///sem-bytes.png' } },
    { ...input(), imageAsset: { ...asset, mimeType: 'application/pdf' } },
    { ...input(), imageAsset: { ...asset, fileSize: 11 * 1024 * 1024 } },
  ]) {
    const { api, calls } = setup();
    await assert.rejects(api.saveDonationCampaign(invalid), friendly);
    assert.equal(calls.length, 0);
  }
  const { api, calls } = setup();
  await assert.rejects(api.deleteDonationCampaign('temporário'), friendly);
  assert.equal(calls.length, 0);
});

test('criar, editar e excluir exigem sessão autenticada antes de qualquer acesso aos dados', async () => {
  for (const options of [{ user: null }, { user: {} }, { user: { id: 'inválido' } }, { authThrow: true }]) {
    for (const action of [
      (api) => api.saveDonationCampaign(input()),
      (api) => api.saveDonationCampaign({ id: CAMPAIGN, title: 'Alterado' }),
      (api) => api.deleteDonationCampaign(CAMPAIGN),
    ]) {
      const { api, calls } = setup(options);
      await assert.rejects(action(api), friendly);
      assert.deepEqual(operations(calls), ['auth']);
    }
  }
});

test('nova campanha envia bytes e salva caminho próprio com UUID definido antes da gravação', async () => {
  const { api, calls, rows } = setup();
  const { campaign, cleanupPending } = await api.saveDonationCampaign(input());
  const expectedPath = `donations/${CREATED}/${OBJECT}.png`;
  const upload = calls.find(([name]) => name === 'upload');
  assert.equal(upload[1], expectedPath);
  assert.equal(Buffer.from(upload[2]).toString(), 'imagem');
  assert.deepEqual(plain(upload[3]), { contentType: 'image/png', upsert: false });
  const payload = calls.find(([name]) => name === 'insert')[1];
  assert.deepEqual(plain(payload), {
    id: CREATED, title: 'Campanha nova', subtitle: '', description: '', image_path: expectedPath, asset_key: null,
  });
  assert.equal(JSON.stringify(payload).includes('file:'), false);
  assert.equal(rows.get(CREATED).image_path, expectedPath);
  assert.equal(campaign.id, CREATED);
  assert.equal(campaign.imageUrl, `https://images.invalid/${expectedPath}`);
  assert.equal(cleanupPending, false);
  assert.deepEqual(removedPaths(calls), []);
});

test('criação possui UUID válido mesmo sem crypto.randomUUID', async () => {
  const { api } = setup({ fallbackUuid: true });
  const { campaign } = await api.saveDonationCampaign(input());
  assert.match(campaign.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(campaign.image_path.startsWith(`donations/${campaign.id}/`));
});

test('editar somente o título preserva texto complementar e foto remota ou banner local', async () => {
  for (const previous of [{}, { image_path: null, asset_key: 'agasalho-2' }]) {
    const { api, calls, previous: original } = setup({ previous });
    const { campaign, cleanupPending } = await api.saveDonationCampaign({ id: CAMPAIGN.toUpperCase(), title: '  Novo título  ' });
    assert.equal(campaign.id, CAMPAIGN);
    assert.equal(campaign.title, 'Novo título');
    assert.equal(campaign.subtitle, original.subtitle);
    assert.equal(campaign.description, original.description);
    assert.equal(campaign.image_path, original.image_path);
    assert.equal(campaign.asset_key, original.asset_key);
    assert.deepEqual(plain(calls.find(([name]) => name === 'update')[1]), { title: 'Novo título' });
    assert.equal(operations(calls).some((name) => ['insert', 'upload', 'remove'].includes(name)), false);
    assert.equal(cleanupPending, false);
  }
});

test('trocar banner local grava nova foto remota sem tentar excluir arquivo do aplicativo', async () => {
  const { api, calls } = setup({ previous: { image_path: null, asset_key: 'agasalho-1' } });
  const { campaign } = await api.saveDonationCampaign({ ...input(), id: CAMPAIGN });
  assert.equal(campaign.asset_key, null);
  assert.equal(campaign.image_path, `donations/${CAMPAIGN}/${OBJECT}.png`);
  assert.deepEqual(removedPaths(calls), []);
});

test('troca remota compara o estado anterior e só limpa a foto antiga após confirmar a edição', async () => {
  const { api, calls } = setup();
  const { campaign, cleanupPending } = await api.saveDonationCampaign({ ...input(), id: CAMPAIGN });
  assert.equal(campaign.image_path, `donations/${CAMPAIGN}/${OBJECT}.png`);
  const filters = calls.find(([name]) => name === 'write')[2];
  assert.deepEqual(filters, [['id', CAMPAIGN], ['title', 'Campanha anterior'], ['image_path', OLD_PATH], ['asset_key', null]]);
  assert.ok(operations(calls).indexOf('commit') < operations(calls).indexOf('remove'));
  assert.deepEqual(removedPaths(calls), [OLD_PATH]);
  assert.equal(cleanupPending, false);
});

test('campanha inexistente ou leitura inválida não vira inserção nem dispara upload', async () => {
  for (const options of [
    { missing: true }, { readFailureAt: [1] }, { readErrorAt: [1] },
    { readResultAt: { 1: { data: null, error: null, status: 403 } } },
    { previous: { image_path: `donations/${OTHER}/alheia.png` } },
    { previous: { image_path: null, asset_key: 'desconhecida' } },
  ]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.saveDonationCampaign({ ...input(), id: CAMPAIGN }), friendly);
    assert.equal(operations(calls).some((name) => ['insert', 'update', 'upload', 'remove'].includes(name)), false);
  }
});

test('resposta perdida após criar ou editar é reconciliada sem duplicar nem remover a foto salva', async () => {
  for (const options of [
    { throwAfterCommit: true }, { malformedAfterCommit: true },
    { errorAfterCommit: { data: null, error: { code: '08007', message: INTERNAL }, status: 503 } },
    { errorAfterCommit: { data: null, error: { code: '40003', message: INTERNAL }, status: 500 } },
  ]) {
    for (const editing of [false, true]) {
      const { api, calls, rows, uploadedPath } = setup(options);
      const { campaign } = await api.saveDonationCampaign({ ...input(), ...(editing ? { id: CAMPAIGN } : {}) });
      assert.equal(campaign.id, editing ? CAMPAIGN : CREATED);
      assert.equal(rows.get(campaign.id).image_path, uploadedPath());
      assert.equal(removedPaths(calls).includes(uploadedPath()), false);
      assert.equal(calls.filter(([name]) => name === (editing ? 'update' : 'insert')).length, 1);
    }
  }
});

test('resposta incerta com confirmação indisponível conserva a nova foto e orienta conferir a lista', async () => {
  for (const editing of [false, true]) {
    const { api, calls } = setup({ throwAfterCommit: true, readFailureAt: [editing ? 2 : 1] });
    await assert.rejects(api.saveDonationCampaign({ ...input(), ...(editing ? { id: CAMPAIGN } : {}) }), (error) => {
      friendly(error);
      assert.match(error.message, /confirmar.*salva.*lista/);
      return true;
    });
    assert.deepEqual(removedPaths(calls), []);
  }
});

test('rejeição do banco ou ausência confirmada compensa exclusivamente a nova foto', async () => {
  for (const options of [
    { rejection: { data: null, error: { code: '42501', message: INTERNAL }, status: 403 } },
    { rejection: { data: null, error: { code: '23514', message: INTERNAL }, status: 400 } },
    { throwBeforeCommit: true },
  ]) {
    const { api, calls, rows, uploadedPath } = setup(options);
    await assert.rejects(api.saveDonationCampaign({ ...input(), id: CAMPAIGN }), friendly);
    assert.equal(rows.get(CAMPAIGN).image_path, OLD_PATH);
    assert.deepEqual(removedPaths(calls), [uploadedPath()]);
    assert.equal(removedPaths(calls).includes(OLD_PATH), false);
  }
});

test('edição concorrente não sobrescreve outra mudança nem apaga a imagem em uso', async () => {
  const changed = `donations/${CAMPAIGN}/outra-edicao.png`;
  for (const titleOnly of [false, true]) {
    const { api, calls, rows, uploadedPath } = setup({
      concurrent(map) { map.set(CAMPAIGN, { ...map.get(CAMPAIGN), title: 'Alterado em outro acesso', image_path: changed }); },
    });
    await assert.rejects(api.saveDonationCampaign({
      id: CAMPAIGN, title: 'Meu título', ...(titleOnly ? {} : { imageAsset: asset }),
    }), (error) => {
      friendly(error);
      assert.match(error.message, /outro acesso/);
      return true;
    });
    assert.equal(rows.get(CAMPAIGN).image_path, changed);
    assert.equal(rows.get(CAMPAIGN).title, 'Alterado em outro acesso');
    assert.deepEqual(removedPaths(calls), titleOnly ? [] : [uploadedPath()]);
  }
});

test('gravação com zero linhas pela RLS não é anunciada como sucesso', async () => {
  const { api, calls, uploadedPath } = setup({ missing: true, zeroRowsMutation: true });
  await assert.rejects(api.saveDonationCampaign(input()), friendly);
  assert.deepEqual(removedPaths(calls), [uploadedPath()]);
});

test('foto nova referenciada por edição posterior não é compensada após resposta perdida', async () => {
  const { api, calls, rows, uploadedPath } = setup({
    throwAfterCommit: true,
    afterCommit(map, row) { map.set(row.id, { ...row, title: 'Outra alteração posterior' }); },
  });
  await assert.rejects(api.saveDonationCampaign(input()), (error) => {
    friendly(error);
    assert.match(error.message, /confirmar.*salva/);
    return true;
  });
  assert.equal(rows.get(CREATED).image_path, uploadedPath());
  assert.deepEqual(removedPaths(calls), []);
});

test('falha na limpeza devolve pendência sem desfazer alteração confirmada', async () => {
  for (const options of [
    { removeThrow: true }, { removeResult: { data: null, error: { message: INTERNAL } } },
    { removeResult: { data: [], error: null, status: 403 } },
    { referencesResult: { data: null, error: { message: INTERNAL } } },
    { referencesResult: { data: [], error: null, status: 403 } },
  ]) {
    const { api, rows } = setup(options);
    const { campaign, cleanupPending } = await api.saveDonationCampaign({ ...input(), id: CAMPAIGN });
    assert.equal(cleanupPending, true);
    assert.equal(rows.get(CAMPAIGN).image_path, campaign.image_path);
    assert.notEqual(campaign.image_path, OLD_PATH);
  }
});

test('erro de salvamento também informa quando não foi possível limpar o novo upload', async () => {
  const { api, calls } = setup({
    rejection: { data: null, error: { code: '42501', message: INTERNAL }, status: 403 }, removeThrow: true,
  });
  await assert.rejects(api.saveDonationCampaign(input()), (error) => {
    friendly(error);
    assert.equal(error.cleanupPending, true);
    assert.match(error.message, /limpeza.*pendente/);
    return true;
  });
  assert.equal(removedPaths(calls).length, 1);
});

test('referência confirmada protege o arquivo e a falha não produz falsa confirmação de gravação', async () => {
  const { api, calls } = setup({
    referenceExists: true, rejection: { data: null, error: { code: '23505', message: INTERNAL }, status: 409 },
  });
  await assert.rejects(api.saveDonationCampaign(input()), (error) => {
    friendly(error);
    assert.match(error.message, /confirmar.*salva/);
    return true;
  });
  assert.deepEqual(removedPaths(calls), []);
});

test('resposta inválida do upload jamais remove caminho alheio ou grava URI local', async () => {
  const foreign = `donations/${OTHER}/alheia.png`;
  const { api, calls, uploadedPath } = setup({ uploadResult: { data: { path: foreign }, error: null } });
  await assert.rejects(api.saveDonationCampaign(input()), friendly);
  assert.deepEqual(removedPaths(calls), [uploadedPath()]);
  assert.equal(operations(calls).some((name) => name === 'insert' || name === 'update'), false);
  assert.equal(removedPaths(calls).includes(foreign), false);
});

test('falha ou rejeição do upload preserva o registro e a imagem anterior', async () => {
  for (const options of [
    { uploadThrow: true }, { uploadResult: { data: null, error: { message: INTERNAL } } },
    { uploadResult: { data: null, error: { message: INTERNAL, statusCode: '403' } } },
  ]) {
    const { api, calls, rows } = setup(options);
    await assert.rejects(api.saveDonationCampaign({ ...input(), id: CAMPAIGN }), (error) => {
      friendly(error);
      if (options.uploadResult?.error?.statusCode === '403') assert.equal(error.cleanupPending, undefined);
      else assert.equal(error.cleanupPending, true);
      return true;
    });
    assert.equal(rows.get(CAMPAIGN).image_path, OLD_PATH);
    assert.equal(operations(calls).some((name) => ['insert', 'update', 'remove'].includes(name)), false);
  }
});

test('exclusão de banner local remove somente o registro e não restaura sementes', async () => {
  const { api, calls, rows } = setup({ previous: { image_path: null, asset_key: 'agasalho-2' } });
  const { cleanupPending } = await api.deleteDonationCampaign(CAMPAIGN);
  assert.equal(cleanupPending, false);
  assert.equal(rows.has(CAMPAIGN), false);
  assert.equal((await api.listDonationCampaigns()).length, 0);
  assert.deepEqual(removedPaths(calls), []);
  assert.equal(operations(calls).some((name) => name === 'insert'), false);
});

test('exclusão remota compara o estado atual e confirma a remoção do registro antes de apagar a foto', async () => {
  const { api, calls, rows } = setup();
  const { cleanupPending } = await api.deleteDonationCampaign(CAMPAIGN);
  assert.equal(rows.has(CAMPAIGN), false);
  assert.equal(cleanupPending, false);
  assert.deepEqual(removedPaths(calls), [OLD_PATH]);
  assert.ok(operations(calls).indexOf('commit') < operations(calls).indexOf('remove'));
  assert.deepEqual(calls.find(([name]) => name === 'write')[2], [
    ['id', CAMPAIGN], ['title', 'Campanha anterior'], ['image_path', OLD_PATH], ['asset_key', null],
  ]);
});

test('exclusão com resposta perdida é confirmada antes da limpeza e é idempotente', async () => {
  for (const options of [{ throwAfterCommit: true }, { malformedAfterCommit: true }]) {
    const { api, calls, rows } = setup(options);
    assert.equal((await api.deleteDonationCampaign(CAMPAIGN)).cleanupPending, false);
    assert.equal(rows.has(CAMPAIGN), false);
    assert.deepEqual(removedPaths(calls), [OLD_PATH]);
    assert.equal((await api.deleteDonationCampaign(CAMPAIGN)).cleanupPending, false);
    assert.deepEqual(removedPaths(calls), [OLD_PATH]);
  }
});

test('exclusão negada ou concorrente não apaga registro nem arquivo de outro estado', async () => {
  for (const options of [
    { rejection: { data: null, error: { code: '42501', message: INTERNAL }, status: 403 } },
    { throwBeforeCommit: true },
    { concurrent(map) { map.set(CAMPAIGN, { ...map.get(CAMPAIGN), title: 'Título concorrente' }); } },
  ]) {
    const { api, calls, rows } = setup(options);
    await assert.rejects(api.deleteDonationCampaign(CAMPAIGN), friendly);
    assert.equal(rows.has(CAMPAIGN), true);
    assert.deepEqual(removedPaths(calls), []);
  }
});

test('confirmação de exclusão indisponível conserva o arquivo e informa a incerteza', async () => {
  const { api, calls } = setup({ throwAfterCommit: true, readFailureAt: [2] });
  await assert.rejects(api.deleteDonationCampaign(CAMPAIGN), (error) => {
    friendly(error);
    assert.match(error.message, /confirmar.*exclusão/);
    return true;
  });
  assert.deepEqual(removedPaths(calls), []);
});

test('exclusão confirmada com armazenamento indisponível informa somente a limpeza pendente', async () => {
  const { api, rows } = setup({ removeThrow: true });
  const result = await api.deleteDonationCampaign(CAMPAIGN);
  assert.equal(rows.has(CAMPAIGN), false);
  assert.equal(result.cleanupPending, true);
});

test('limpeza nunca apaga arquivo referenciado, externo ou de outra campanha', async () => {
  const protectedReference = setup({ referenceExists: true });
  assert.equal((await protectedReference.api.deleteDonationCampaign(CAMPAIGN)).cleanupPending, false);
  assert.deepEqual(removedPaths(protectedReference.calls), []);
  for (const foreign of [
    `donations/${OTHER}/foto.png`, 'https://externo.invalid/foto.png',
    `donations/${CAMPAIGN}/../alheia.png`, `donations/${CAMPAIGN}/fotoXpng`,
  ]) {
    const { api, calls } = setup({ previous: { image_path: foreign } });
    await assert.rejects(api.deleteDonationCampaign(CAMPAIGN), friendly);
    assert.deepEqual(removedPaths(calls), []);
    assert.equal(operations(calls).includes('delete'), false);
  }
});
