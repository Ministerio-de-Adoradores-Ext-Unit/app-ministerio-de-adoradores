const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const USER = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';
const CREATED = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const INTERNAL = 'detalhe-interno-que-nao-deve-ser-exposto';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asset = { base64: 'aW1hZ2Vt', mimeType: 'image/png', uri: 'file:///foto-do-aparelho.png' };
const valid = () => ({ title: '  Evento de teste  ', dateTime: new Date(2026, 10, 14, 23, 30, 45), local: '  Templo  ' });

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

function setup(options = {}) {
  const calls = [];
  const previous = {
    id: EVENT, titulo: 'Evento anterior', data: '2026-11-10', horario: '18:00:00',
    local: 'Local anterior', imagem_url: 'capa-antiga.jpg', created_at: '2026-11-10T12:00:00Z',
  };
  const rows = new Map(options.missingEvent ? [] : [[EVENT, previous]]);
  let reads = 0, uploadedPath;
  const storage = {
    async upload(objectPath, bytes, settings) {
      uploadedPath = objectPath;
      calls.push(['upload', objectPath, bytes, settings]);
      if (options.uploadThrow) throw new Error(INTERNAL);
      return options.uploadResult ?? { data: { path: objectPath }, error: null };
    },
    async remove(paths) {
      calls.push(['remove', paths]);
      if (options.removeThrow) throw new Error(INTERNAL);
      return options.removeResult ?? { data: [], error: null };
    },
  };
  const supabase = {
    storage: { from(bucket) { calls.push(['bucket', bucket]); return storage; } },
    from(table) {
      calls.push(['table', table]);
      assert.equal(table, 'events');
      let operation = 'read', values, id;
      const query = {
        select(columns) { calls.push(['select', columns]); return query; },
        insert(payload) { operation = 'insert'; values = payload; calls.push(['insert', payload]); return query; },
        update(payload) { operation = 'update'; values = payload; calls.push(['update', payload]); return query; },
        eq(column, value) { assert.equal(column, 'id'); id = value; calls.push(['eq', column, value]); return query; },
        async maybeSingle() {
          reads += 1;
          calls.push(['read', id]);
          if (options.readFailureAt?.includes(reads)) throw new Error(INTERNAL);
          if (options.readErrorAt?.includes(reads)) return { data: null, error: { message: INTERNAL } };
          return { data: rows.get(id) ?? null, error: null };
        },
        async single() {
          calls.push(['write', operation]);
          assert.notEqual(operation, 'read');
          if (options.rejection) return options.rejection;
          if (options.throwBeforeCommit) throw new Error(INTERNAL);
          const result = operation === 'insert'
            ? { ...values, created_at: '2026-11-14T12:00:00Z' }
            : { ...rows.get(id), ...values };
          rows.set(result.id, result);
          if (options.afterCommit) options.afterCommit(rows, result);
          if (options.throwAfterCommit) throw new Error(INTERNAL);
          if (options.malformedAfterCommit) return { data: null, error: null };
          return { data: result, error: null, status: 200 };
        },
      };
      return query;
    },
  };
  const helper = load('src/utils/imageUploadData.js', { 'base64-arraybuffer': require('base64-arraybuffer') });
  const api = load('src/services/supabaseEvents.js', {
    '../lib/supabase': { supabase },
    './supabaseAuth': { async getAuthenticatedUser() {
      calls.push(['auth']);
      if (options.authThrow) throw new Error(INTERNAL);
      return Object.hasOwn(options, 'user') ? options.user : { id: USER };
    } },
    '../utils/imageUploadData': helper,
  }, options.fallbackUuid ? {} : { crypto: { randomUUID: () => CREATED } });
  return { api, calls, rows, previous, uploadedPath: () => uploadedPath };
}

function friendly(error) {
  assert.ok(error.message.length > 0);
  assert.ok(!error.message.includes(INTERNAL));
  return true;
}

test('evento exige título, local, data válida e ID válido antes de qualquer requisição', async () => {
  for (const input of [
    undefined, {}, { ...valid(), title: ' ' }, { ...valid(), local: '' },
    { ...valid(), dateTime: null }, { ...valid(), dateTime: new Date('inválida') },
    { ...valid(), dateTime: '2026-11-14T23:30' }, { ...valid(), id: '' },
    { ...valid(), id: 'evento-local' }, { ...valid(), title: 123 },
    { ...valid(), imageAsset: { uri: 'file:///sem-bytes.png' } },
  ]) {
    const { api, calls } = setup();
    await assert.rejects(api.saveEvent(input), friendly);
    assert.equal(calls.length, 0);
  }
});

test('criação usa UUID definido antes do INSERT e campos reais da tabela', async () => {
  const { api, calls } = setup();
  const saved = await api.saveEvent(valid());
  const payload = calls.find(([operation]) => operation === 'insert')[1];
  assert.equal(payload.id, CREATED);
  assert.equal(payload.titulo, 'Evento de teste');
  assert.equal(payload.local, 'Templo');
  assert.equal(payload.data, '2026-11-14');
  assert.equal(payload.horario, '23:30:45');
  assert.equal(payload.imagem_url, null);
  assert.equal(saved.id, CREATED);
  assert.deepEqual(calls.filter(([operation]) => ['read', 'update', 'upload', 'remove'].includes(operation)), []);
});

test('UUID de criação possui fallback válido quando crypto.randomUUID não está disponível', async () => {
  const { api } = setup({ fallbackUuid: true });
  const saved = await api.saveEvent(valid());
  assert.match(saved.id, UUID);
  assert.equal(saved.id[14], '4');
});

test('persistência usa a data e o horário locais mesmo quando UTC já é outro dia', async () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/Sao_Paulo';
    const { api, calls } = setup();
    await api.saveEvent({ ...valid(), dateTime: new Date('2026-11-15T02:30:00.000Z') });
    const payload = calls.find(([operation]) => operation === 'insert')[1];
    assert.equal(payload.data, '2026-11-14');
    assert.equal(payload.horario, '23:30:00');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('evento sem sessão confirmada nunca chega à tabela ou ao armazenamento', async () => {
  for (const options of [{ user: null }, { user: {} }, { user: { id: 'inválido' } }, { authThrow: true }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.saveEvent({ ...valid(), imageAsset: asset }), friendly);
    assert.deepEqual(calls.map(([operation]) => operation), ['auth']);
  }
});

test('editar faz UPDATE filtrado pelo UUID existente e preserva a capa sem reenviar URL', async () => {
  const { api, calls, previous } = setup();
  const saved = await api.saveEvent({ ...valid(), id: EVENT });
  const update = calls.find(([operation]) => operation === 'update')[1];
  assert.equal(saved.id, EVENT);
  assert.equal(saved.imagem_url, previous.imagem_url);
  assert.equal(Object.hasOwn(update, 'imagem_url'), false);
  assert.equal(Object.hasOwn(update, 'id'), false);
  assert.equal(calls.some(([operation]) => operation === 'insert' || operation === 'upload'), false);
  assert.equal(calls.filter(([operation, column, value]) => operation === 'eq' && column === 'id' && value === EVENT).length, 2);
});

test('evento ausente ou consulta de edição negada não cria outro evento nem envia capa', async () => {
  for (const options of [{ missingEvent: true }, { readFailureAt: [1] }, { readErrorAt: [1] }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.saveEvent({ ...valid(), id: EVENT, imageAsset: asset }), friendly);
    assert.equal(calls.some(([operation]) => ['insert', 'update', 'upload', 'remove'].includes(operation)), false);
  }
});

test('nova capa envia bytes ao bucket correto e grava caminho remoto, sem URI local', async () => {
  const { api, calls } = setup();
  const saved = await api.saveEvent({ ...valid(), imageAsset: asset });
  const upload = calls.find(([operation]) => operation === 'upload');
  assert.ok(upload[1].startsWith(`${USER}/${CREATED}/`));
  assert.ok(upload[1].endsWith('.png'));
  assert.equal(Buffer.from(upload[2]).toString(), 'imagem');
  assert.equal(upload[3].contentType, 'image/png');
  assert.equal(upload[3].upsert, false);
  assert.equal(saved.imagem_url, upload[1]);
  assert.equal(JSON.stringify(calls.find(([operation]) => operation === 'insert')[1]).includes('file:'), false);
  assert.deepEqual(calls.filter(([operation]) => operation === 'bucket').map(([, bucket]) => bucket), ['event-images']);
});

test('substituir capa não apaga automaticamente o arquivo antigo ou outros arquivos', async () => {
  const { api, calls, previous } = setup();
  const saved = await api.saveEvent({ ...valid(), id: EVENT, imageAsset: asset });
  assert.notEqual(saved.imagem_url, previous.imagem_url);
  assert.ok(saved.imagem_url.startsWith(`${USER}/${EVENT}/`));
  assert.equal(calls.some(([operation]) => operation === 'remove'), false);
});

test('upload rejeitado ou com falha de rede não grava o evento', async () => {
  for (const options of [{ uploadThrow: true }, { uploadResult: { data: null, error: { message: INTERNAL } } }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.saveEvent({ ...valid(), imageAsset: asset }), friendly);
    assert.equal(calls.some(([operation]) => operation === 'insert' || operation === 'update'), false);
    assert.equal(calls.some(([operation]) => operation === 'remove'), false);
  }
});

test('rejeição confirmada pelo banco compensa somente a capa recém-enviada', async () => {
  for (const rejection of [
    { data: null, error: { code: '42501', message: INTERNAL }, status: 403 },
    { data: null, error: { code: '23505', message: INTERNAL }, status: 409 },
    { data: null, error: { code: 'PGRST116', message: INTERNAL }, status: 406 },
  ]) {
    const { api, calls, uploadedPath } = setup({ rejection });
    await assert.rejects(api.saveEvent({ ...valid(), id: EVENT, imageAsset: asset }), /nova capa enviada foi removida/);
    const removals = calls.filter(([operation]) => operation === 'remove');
    assert.equal(removals.length, 1);
    assert.deepEqual(Array.from(removals[0][1]), [uploadedPath()]);
    assert.notEqual(removals[0][1][0], 'capa-antiga.jpg');
  }
});

test('DELETE de compensação que falha informa a pendência sem expor erro interno', async () => {
  for (const options of [{ removeThrow: true }, { removeResult: { error: null } }, { removeResult: { data: null, error: { message: INTERNAL } } }]) {
    const { api } = setup({ ...options, rejection: { data: null, error: { code: '42501' }, status: 403 } });
    await assert.rejects(api.saveEvent({ ...valid(), imageAsset: asset }), (error) => {
      friendly(error);
      assert.match(error.message, /nem remover a nova capa/);
      return true;
    });
  }
});

test('resposta perdida após commit é recuperada pelo UUID, sem remover capa salva', async () => {
  for (const editing of [false, true]) {
    for (const options of [{ throwAfterCommit: true }, { malformedAfterCommit: true }]) {
      const { api, calls } = setup(options);
      const saved = await api.saveEvent({ ...valid(), ...(editing ? { id: EVENT } : {}), imageAsset: asset });
      assert.equal(saved.id, editing ? EVENT : CREATED);
      assert.equal(calls.filter(([operation]) => operation === 'read').length, editing ? 2 : 1);
      assert.equal(calls.filter(([operation]) => operation === 'insert' || operation === 'update').length, 1);
      assert.equal(calls.some(([operation]) => operation === 'remove'), false);
    }
  }
});

test('falha de rede sem commit e ausência confirmada remove só o upload novo', async () => {
  const { api, calls, uploadedPath } = setup({ throwBeforeCommit: true });
  await assert.rejects(api.saveEvent({ ...valid(), imageAsset: asset }), /nova capa enviada foi removida/);
  assert.equal(calls.filter(([operation]) => operation === 'read').length, 1);
  assert.deepEqual(Array.from(calls.find(([operation]) => operation === 'remove')[1]), [uploadedPath()]);
});

test('falha ao reconciliar não apaga capa que pode estar referenciada após commit', async () => {
  for (const editing of [false, true]) {
    const { api, calls } = setup({ throwAfterCommit: true, readFailureAt: [editing ? 2 : 1] });
    await assert.rejects(api.saveEvent({ ...valid(), ...(editing ? { id: EVENT } : {}), imageAsset: asset }), /Reabra a lista e confira antes/);
    assert.equal(calls.some(([operation]) => operation === 'remove'), false);
  }
});

test('registro com dados diferentes não vira sucesso nem perde a capa ainda referenciada', async () => {
  const { api, calls } = setup({
    throwAfterCommit: true,
    afterCommit(rows, row) { rows.set(row.id, { ...row, titulo: 'Outra alteração' }); },
  });
  await assert.rejects(api.saveEvent({ ...valid(), imageAsset: asset }), /Reabra a lista e confira antes/);
  assert.equal(calls.some(([operation]) => operation === 'remove'), false);
});

test('UPDATE negado ou sem linhas retornadas não é anunciado como salvo', async () => {
  const { api, calls } = setup({ rejection: { data: null, error: { code: 'PGRST116' }, status: 406 } });
  await assert.rejects(api.saveEvent({ ...valid(), id: EVENT }), /Não foi possível salvar o evento/);
  assert.equal(calls.some(([operation]) => operation === 'insert' || operation === 'remove'), false);
});
