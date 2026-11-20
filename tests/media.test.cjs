const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const base64 = require('base64-arraybuffer');

const USER = '11111111-1111-4111-8111-111111111111';
const CATEGORY = '22222222-2222-4222-8222-222222222222';
const MEDIA = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const INTERNAL = 'resposta-interna-com-detalhes-que-nao-devem-aparecer';
const image = { base64: 'aW1hZ2Vt', mimeType: 'image/png', uri: 'file:///foto-local.png' };

function loadImageUploadData() {
  const filename = path.join(__dirname, '..', 'src/utils/imageUploadData.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, Uint8Array, ArrayBuffer,
    require(name) {
      assert.equal(name, 'base64-arraybuffer');
      return base64;
    },
  }, { filename });
  return exports;
}

function setup(options = {}) {
  const calls = [];
  let uploadedPath;
  let rowExists = false;
  let fileExists = false;
  let deleted = false;
  const stored = { id: MEDIA, category_id: CATEGORY, imagem_url: `${USER}/${CATEGORY}/foto.png` };
  const storage = {
    async upload(objectPath, bytes, settings) {
      uploadedPath = objectPath;
      calls.push(['upload', objectPath, bytes, settings]);
      if (options.uploadThrow) throw new Error(INTERNAL);
      const response = options.uploadResult ?? { data: { path: objectPath }, error: null };
      if (!response.error) fileExists = true;
      return response;
    },
    async remove(paths) {
      calls.push(['remove', paths]);
      if (options.removeThrow) throw new Error(INTERNAL);
      const response = options.removeResult ?? { data: [], error: null };
      if (!response.error && paths.includes(uploadedPath)) fileExists = false;
      return response;
    },
  };
  const supabase = {
    storage: { from(bucket) { calls.push(['bucket', bucket]); return storage; } },
    from(table) {
      calls.push(['table', table]);
      assert.equal(table, 'media');
      let operation = 'read';
      const filters = [];
      const query = {
        select(columns) { calls.push(['select', columns]); return query; },
        insert(values) { operation = 'insert'; calls.push(['insert', values]); return query; },
        delete() { operation = 'delete'; calls.push(['delete']); return query; },
        eq(column, value) { filters.push([column, value]); calls.push(['eq', column, value]); return query; },
        async single() {
          calls.push(['single', operation]);
          if (operation === 'insert') {
            if (options.commitBeforeResponse) rowExists = true;
            if (options.insertThrow) throw new Error(INTERNAL);
            return options.insertResult ?? {
              data: { ...stored, imagem_url: uploadedPath, data: null, created_at: '2026-11-14T12:00:00Z' },
              error: null,
            };
          }
          if (options.readThrow) throw new Error(INTERNAL);
          return options.readResult ?? { data: stored, error: null };
        },
        async maybeSingle() {
          calls.push(['recover']);
          if (options.recoveryThrow) throw new Error(INTERNAL);
          if (Object.hasOwn(options, 'recoveryResult')) return options.recoveryResult;
          if (filters.some(([column]) => column === 'id')) return { data: deleted ? null : stored, error: null };
          return {
            data: options.commitBeforeResponse
              ? { ...stored, imagem_url: uploadedPath, data: null, created_at: '2026-11-14T12:00:00Z' }
              : null,
            error: null,
          };
        },
        then(resolve, reject) {
          if (operation === 'read') {
            calls.push(['references']);
            const data = deleted ? [] : [stored];
            return Promise.resolve({ data, error: null, count: data.length }).then(resolve, reject);
          }
          assert.equal(operation, 'delete');
          if (options.deleteThrow) return Promise.reject(new Error(INTERNAL)).then(resolve, reject);
          const result = options.deleteResult ?? { data: [{ id: MEDIA }], error: null };
          if (!result.error && result.data?.some((row) => row.id === MEDIA)) deleted = true;
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const filename = path.join(__dirname, '..', 'src/services/supabaseMedia.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  const imageUploadData = loadImageUploadData();
  vm.runInNewContext(code, {
    exports, URL, Uint8Array, ArrayBuffer,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' } },
    require(name) {
      if (name === '../lib/supabase') return { supabase };
      if (name === '../utils/imageUploadData') return imageUploadData;
      assert.equal(name, './supabaseAuth');
      return { async getAuthenticatedUser() {
        calls.push(['auth']);
        if (options.authThrow) throw new Error(INTERNAL);
        return Object.hasOwn(options, 'user') ? options.user : { id: USER };
      } };
    },
  }, { filename });
  return { api: exports, calls, stored, state: () => ({ rowExists, fileExists }) };
}

function friendly(error) {
  assert.ok(error.message.length > 0);
  assert.ok(!error.message.includes(INTERNAL));
  return true;
}

test('mídia inválida não consulta a sessão nem envia arquivos', async () => {
  for (const input of [
    undefined,
    { categoryId: 'categoria-local', asset: image },
    { categoryId: CATEGORY, asset: { uri: 'file:///sem-bytes.jpg' } },
    { categoryId: CATEGORY, asset: { ...image, base64: 'não é base64' } },
    { categoryId: CATEGORY, asset: { ...image, mimeType: 'text/html' } },
    { categoryId: CATEGORY, asset: { ...image, fileSize: 10 * 1024 * 1024 + 1 } },
  ]) {
    const { api, calls } = setup();
    await assert.rejects(api.uploadMedia(input), friendly);
    assert.equal(calls.length, 0);
  }
});

test('limite de imagem considera bytes reais e não apenas metadados', async () => {
  const { api, calls } = setup();
  const oversized = Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64');
  await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: { ...image, base64: oversized } }), /10 MB/);
  assert.equal(calls.length, 0);
});

test('arquivo web pode fornecer ArrayBuffer; arquivo vazio ou ilegível é rejeitado', async () => {
  const success = setup();
  await success.api.uploadMedia({ categoryId: CATEGORY, asset: {
    file: { name: 'foto.webp', type: 'image/webp', size: 4, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer },
  } });
  const upload = success.calls.find(([type]) => type === 'upload');
  assert.equal(upload[2].byteLength, 4);
  assert.equal(upload[3].contentType, 'image/webp');
  for (const arrayBuffer of [async () => new ArrayBuffer(0), async () => { throw new Error(INTERNAL); }]) {
    const { api, calls } = setup();
    await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: { file: { type: 'image/png', arrayBuffer } } }), friendly);
    assert.equal(calls.length, 0);
  }
});

test('sem sessão confirmada nenhuma mídia é escrita ou apagada', async () => {
  for (const options of [{ user: null }, { user: {} }, { user: { id: 'id-inválido' } }, { authThrow: true }]) {
    const upload = setup(options);
    await assert.rejects(upload.api.uploadMedia({ categoryId: CATEGORY, asset: image }), friendly);
    assert.deepEqual(upload.calls.map(([type]) => type), ['auth']);
    const deletion = setup(options);
    await assert.rejects(deletion.api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA }), friendly);
    assert.deepEqual(deletion.calls.map(([type]) => type), ['auth']);
  }
});

test('upload envia bytes ao bucket e grava só caminho remoto e categoria real', async () => {
  const { api, calls } = setup();
  const row = await api.uploadMedia({ categoryId: CATEGORY, asset: image });
  const upload = calls.find(([type]) => type === 'upload');
  assert.ok(upload[1].startsWith(`${USER}/${CATEGORY}/`));
  assert.ok(upload[1].endsWith('.png'));
  assert.equal(Buffer.from(upload[2]).toString(), 'imagem');
  assert.equal(upload[3].upsert, false);
  assert.equal(upload[3].contentType, 'image/png');
  assert.deepEqual(calls.filter(([type]) => type === 'bucket').map(([, bucket]) => bucket), ['media-images']);
  const inserted = calls.find(([type]) => type === 'insert')[1];
  assert.equal(inserted.category_id, CATEGORY);
  assert.equal(inserted.imagem_url, upload[1]);
  assert.ok(!JSON.stringify(inserted).includes('file:'));
  assert.equal(row.id, MEDIA);
  assert.equal(row.imagem_url, upload[1]);
  assert.ok(calls.findIndex(([type]) => type === 'auth') < calls.findIndex(([type]) => type === 'upload'));
});

test('falha no upload não grava registro nem remove arquivos', async () => {
  for (const options of [{ uploadThrow: true }, { uploadResult: { data: null, error: { message: INTERNAL } } }]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: image }), friendly);
    assert.equal(calls.filter(([type]) => type === 'insert' || type === 'remove').length, 0);
  }
});

test('JPEG convertido pelo ImagePicker usa tipo e extensão dos bytes, não do arquivo original', async () => {
  const { api, calls } = setup();
  await api.uploadMedia({ categoryId: CATEGORY, asset: {
    base64: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64'),
    mimeType: 'image/heic', fileName: 'original.heic',
  } });
  const upload = calls.find(([type]) => type === 'upload');
  assert.equal(upload[3].contentType, 'image/jpeg');
  assert.ok(upload[1].endsWith('.jpg'));
});

test('falha ao registrar compensa somente o arquivo desta tentativa', async () => {
  for (const options of [
    { insertThrow: true },
    { insertResult: { data: null, error: { message: INTERNAL } } },
    { insertResult: { data: { id: MEDIA, category_id: OTHER, imagem_url: 'outro-arquivo.png' }, error: null } },
    { uploadResult: { data: { path: 'caminho-inesperado.png' }, error: null } },
  ]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: image }), (error) => {
      friendly(error);
      assert.match(error.message, /arquivo enviado foi removido/);
      return true;
    });
    const path = calls.find(([type]) => type === 'upload')[1];
    const removals = calls.filter(([type]) => type === 'remove');
    assert.equal(removals.length, 1);
    assert.equal(removals[0][1].length, 1);
    assert.equal(removals[0][1][0], path);
    if (options.uploadResult) {
      assert.equal(calls.some(([type]) => type === 'insert' || type === 'recover'), false,
        'Caminho de upload inesperado não deve chegar ao INSERT.');
    } else {
      assert.deepEqual(calls.filter(([type]) => type === 'eq').map(([, field, value]) => [field, value]), [
        ['category_id', CATEGORY], ['imagem_url', path],
      ]);
      assert.ok(calls.findIndex(([type]) => type === 'recover') < calls.findIndex(([type]) => type === 'remove'),
        'Compensa somente depois de confirmar que o registro não existe.');
    }
  }
});

test('resposta perdida depois do commit recupera o registro sem apagar sua imagem nem reinserir', async () => {
  const { api, calls, state } = setup({ insertThrow: true, commitBeforeResponse: true });
  const row = await api.uploadMedia({ categoryId: CATEGORY, asset: image });
  const uploadedPath = calls.find(([type]) => type === 'upload')[1];
  assert.equal(row.id, MEDIA);
  assert.equal(row.category_id, CATEGORY);
  assert.equal(row.imagem_url, uploadedPath);
  assert.deepEqual(state(), { rowExists: true, fileExists: true });
  assert.equal(calls.filter(([type]) => type === 'insert').length, 1);
  assert.equal(calls.filter(([type]) => type === 'recover').length, 1);
  assert.equal(calls.filter(([type]) => type === 'remove').length, 0);
  assert.deepEqual(calls.filter(([type]) => type === 'eq').map(([, field, value]) => [field, value]), [
    ['category_id', CATEGORY], ['imagem_url', uploadedPath],
  ]);
});

test('recuperação indisponível ou inconsistente mantém o arquivo e orienta conferir a lista antes de reenviar', async () => {
  for (const recovery of [
    { recoveryThrow: true },
    { recoveryResult: { data: null, error: { message: INTERNAL } } },
    { recoveryResult: undefined },
    { recoveryResult: {} },
    { recoveryResult: { data: { id: OTHER, category_id: OTHER, imagem_url: 'outro-arquivo.png' }, error: null } },
  ]) {
    const { api, calls, state } = setup({ insertThrow: true, commitBeforeResponse: true, ...recovery });
    await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: image }), (error) => {
      friendly(error);
      assert.match(error.message, /Reabra a lista antes de reenviar/);
      assert.match(error.message, /arquivo foi mantido/);
      return true;
    });
    assert.equal(calls.filter(([type]) => type === 'remove').length, 0);
    assert.deepEqual(state(), { rowExists: true, fileExists: true });
  }
});

test('falha na compensação informa pendência real sem vazar resposta interna', async () => {
  for (const options of [
    { insertThrow: true, removeThrow: true },
    { insertThrow: true, removeResult: { error: { message: INTERNAL } } },
  ]) {
    const { api } = setup(options);
    await assert.rejects(api.uploadMedia({ categoryId: CATEGORY, asset: image }), (error) => {
      friendly(error);
      assert.match(error.message, /conferir o armazenamento antes de reenviar/);
      return true;
    });
  }
});

test('exclusão valida parâmetros antes da consulta', async () => {
  for (const input of [undefined, { categoryId: CATEGORY }, { categoryId: 'categoria', mediaId: MEDIA }, { categoryId: CATEGORY, mediaId: 'foto-local' }]) {
    const { api, calls } = setup();
    await assert.rejects(api.deleteMedia(input), friendly);
    assert.equal(calls.length, 0);
  }
});

test('exclusão confirma DELETE por ID, categoria e caminho antes de limpar arquivo', async () => {
  const { api, calls, stored } = setup();
  const result = await api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA });
  assert.equal(result.deleted, true);
  assert.equal(result.filePreserved, false);
  assert.deepEqual(calls.filter(([type]) => type === 'eq').map(([, field, value]) => [field, value]), [
    ['id', MEDIA], ['category_id', CATEGORY], ['id', MEDIA], ['category_id', CATEGORY], ['imagem_url', stored.imagem_url],
  ]);
  assert.equal(calls.find(([type]) => type === 'remove')[1][0], stored.imagem_url);
  assert.ok(calls.findIndex(([type]) => type === 'delete') < calls.findIndex(([type]) => type === 'remove'));
});

test('registro ausente, de outra categoria ou negado não apaga arquivos', async () => {
  for (const options of [
    { readThrow: true },
    { readResult: { data: null, error: { code: 'PGRST116', message: INTERNAL } } },
    { readResult: { data: { id: MEDIA, category_id: OTHER }, error: null } },
    { readResult: { data: { id: OTHER, category_id: CATEGORY }, error: null } },
  ]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA }), friendly);
    assert.equal(calls.filter(([type]) => type === 'remove' || type === 'delete').length, 0);
  }
});

test('URLs antigas e caminhos sem ownership confirmado removem cadastro e preservam arquivo', async () => {
  for (const value of [
    '/media-images/congresso/foto.png',
    'https://project.supabase.co/storage/v1/object/sign/media-images/pasta/foto%20nova.jpg?token=expirado',
    'https://project.supabase.co/storage/v1/object/public/media-images/foto.jpg',
  ]) {
    const { api, calls } = setup({ readResult: { data: { id: MEDIA, category_id: CATEGORY, imagem_url: value }, error: null } });
    const result = await api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA });
    assert.equal(result.deleted, true);
    assert.equal(result.filePreserved, true);
    assert.equal(calls.some(([type]) => type === 'remove'), false);
  }
});

test('links externos ou de outro bucket removem só o cadastro, nunca o arquivo alheio', async () => {
  for (const value of [
    'https://externo.example/foto.jpg',
    'https://project.supabase.co/storage/v1/object/sign/event-images/foto.jpg?token=privado',
  ]) {
    const { api, calls } = setup({ readResult: { data: { id: MEDIA, category_id: CATEGORY, imagem_url: value }, error: null } });
    assert.equal((await api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA })).deleted, true);
    assert.equal(calls.filter(([type]) => type === 'remove').length, 0);
    assert.equal(calls.filter(([type]) => type === 'delete').length, 1);
  }
});

test('caminhos inválidos não são enviados ao Storage', async () => {
  for (const value of ['../outro-bucket/foto.jpg', 'pasta/%2e%2e/foto.jpg', 'pasta\\foto.jpg', 'file:///foto.jpg', 'pasta//foto.jpg']) {
    const { api, calls } = setup({ readResult: { data: { id: MEDIA, category_id: CATEGORY, imagem_url: value }, error: null } });
    await assert.rejects(api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA }), friendly);
    assert.equal(calls.filter(([type]) => type === 'remove' || type === 'delete').length, 0);
  }
});

test('falha na limpeza não restaura cadastro nem deixa foto publicada com arquivo apagado', async () => {
  for (const options of [{ removeThrow: true }, { removeResult: { error: { statusCode: '403', message: INTERNAL } } }]) {
    const { api, calls } = setup(options);
    const result = await api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA });
    assert.equal(result.deleted, true);
    assert.equal(result.filePreserved, true);
    assert.ok(calls.findIndex(([type]) => type === 'delete') < calls.findIndex(([type]) => type === 'remove'));
  }
});

test('arquivo já ausente permite repetir a exclusão do registro', async () => {
  const { api } = setup({ removeResult: { error: { statusCode: '404', message: INTERNAL } } });
  assert.equal((await api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA })).deleted, true);
});

test('DELETE sem linhas retornadas ou negado pelo banco não parece sucesso', async () => {
  for (const options of [
    { deleteThrow: true },
    { deleteResult: { data: [], error: null } },
    { deleteResult: { data: null, error: { message: INTERNAL } } },
    { deleteResult: { data: [{ id: OTHER }], error: null } },
  ]) {
    const { api } = setup(options);
    await assert.rejects(api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA }), friendly);
  }
});

// Banco em memória somente na fronteira do SDK, para exercitar CAS e respostas perdidas.
function replacementSetup(options = {}) {
  const calls = [];
  const oldPath = options.oldPath ?? `${USER}/${CATEGORY}/anterior.png`;
  const rows = new Map([[MEDIA, { id: MEDIA, category_id: CATEGORY, imagem_url: oldPath }]]);
  if (options.shared) rows.set(OTHER, { id: OTHER, category_id: OTHER, imagem_url: options.alias || oldPath });
  let reads = 0, newPath;
  const storage = {
    async upload(objectPath, bytes, settings) {
      calls.push(['upload', objectPath, settings]);
      newPath = objectPath;
      if (options.uploadThrow) throw new Error(INTERNAL);
      return options.uploadResult ?? { data: { path: objectPath }, error: null };
    },
    async remove(paths) {
      calls.push(['remove', Array.from(paths)]);
      if (options.removeThrow) throw new Error(INTERNAL);
      return { data: [], error: null };
    },
  };
  const supabase = {
    storage: { from(bucket) { assert.equal(bucket, 'media-images'); return storage; } },
    from(table) {
      assert.equal(table, 'media');
      let operation = 'read', values;
      const filters = [];
      const matching = () => [...rows.values()].filter(row => filters.every(([key, value]) => row[key] === value));
      const query = {
        select() { return query; },
        update(value) { operation = 'update'; values = value; calls.push(['update', value]); return query; },
        delete() { operation = 'delete'; calls.push(['delete']); return query; },
        eq(key, value) { filters.push([key, value]); calls.push(['eq', operation, key, value]); return query; },
        async single() {
          assert.equal(operation, 'read');
          calls.push(['read']);
          return { data: matching()[0] || null, error: null };
        },
        async maybeSingle() {
          if (operation === 'read') {
            reads += 1;
            calls.push(['read']);
            if (options.readFailAt?.includes(reads)) throw new Error(INTERNAL);
            return { data: matching()[0] || null, error: null };
          }
          assert.equal(operation, 'update');
          if (options.concurrentUpdate) rows.set(MEDIA, { ...rows.get(MEDIA), imagem_url: options.concurrentUpdate });
          calls.push(['write', filters.map(item => [...item])]);
          if (options.rejectUpdate) return { data: null, error: { code: '42501' }, status: 403 };
          if (options.throwBeforeCommit) throw new Error(INTERNAL);
          const row = matching()[0];
          if (!row) return { data: null, error: null, status: 200 };
          const saved = { ...row, ...values };
          rows.set(row.id, saved);
          if (options.throwAfterCommit) throw new Error(INTERNAL);
          return { data: saved, error: null, status: 200 };
        },
        then(resolve, reject) {
          if (operation === 'delete') {
            if (options.concurrentDelete) rows.set(MEDIA, { ...rows.get(MEDIA), imagem_url: options.concurrentDelete });
            const removed = matching();
            removed.forEach(row => rows.delete(row.id));
            calls.push(['deleted', filters.map(item => [...item])]);
            if (options.deleteResponseLost) return Promise.reject(new Error(INTERNAL)).then(resolve, reject);
            return Promise.resolve({ data: removed.map(row => ({ id: row.id })), error: null }).then(resolve, reject);
          }
          calls.push(['references']);
          const data = [...rows.values()];
          const response = options.referencesError ? { data: null, error: { message: INTERNAL } }
            : { data, error: null, count: options.incompleteReferences ? data.length + 1 : data.length };
          return Promise.resolve(response).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const filename = path.join(__dirname, '..', 'src/services/supabaseMedia.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const api = {};
  vm.runInNewContext(code, {
    exports: api, URL, Uint8Array, ArrayBuffer,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' } },
    require(name) {
      if (name === '../lib/supabase') return { supabase };
      if (name === '../utils/imageUploadData') return loadImageUploadData();
      assert.equal(name, './supabaseAuth');
      return { getAuthenticatedUser: async () => { calls.push(['auth']); return options.noUser ? null : { id: USER }; } };
    },
  }, { filename });
  return { api, rows, calls, oldPath, newPath: () => newPath,
    replace: (extra = {}) => api.replaceMedia({ categoryId: CATEGORY, mediaId: MEDIA, expectedPath: oldPath, asset: image, ...extra }) };
}

test('troca valida seleção, caminho esperado e sessão antes de enviar qualquer arquivo', async () => {
  for (const input of [undefined, { categoryId: CATEGORY, mediaId: MEDIA },
    { categoryId: 'categoria', mediaId: MEDIA, expectedPath: 'anterior.png', asset: image }]) {
    const h = replacementSetup();
    await assert.rejects(h.api.replaceMedia(input), friendly);
    assert.equal(h.calls.length, 0);
  }
  const anonymous = replacementSetup({ noUser: true });
  await assert.rejects(anonymous.replace(), /administrativa/);
  assert.equal(anonymous.calls.some(([type]) => type === 'upload' || type === 'update'), false);
  const stale = replacementSetup();
  await assert.rejects(stale.replace({ expectedPath: 'imagem-antiga-desatualizada.png' }), /alterada ou removida/);
  assert.equal(stale.calls.some(([type]) => type === 'upload'), false);
});

test('troca usa arquivo novo e UPDATE por ID, categoria e caminho esperado; limpa antigo depois de confirmar', async () => {
  const h = replacementSetup();
  const saved = await h.replace();
  assert.equal(saved.id, MEDIA);
  assert.equal(saved.imagem_url, h.newPath());
  assert.notEqual(h.newPath(), h.oldPath);
  assert.equal(h.calls.find(([type]) => type === 'upload')[2].upsert, false);
  assert.deepEqual(h.calls.find(([type]) => type === 'write')[1], [
    ['id', MEDIA], ['category_id', CATEGORY], ['imagem_url', h.oldPath],
  ]);
  assert.deepEqual(h.calls.filter(([type]) => type === 'remove').map(([, paths]) => paths), [[h.oldPath]]);
  assert.ok(h.calls.findIndex(([type]) => type === 'write') < h.calls.findIndex(([type]) => type === 'references'));
});

test('concorrência não substitui a imagem mais recente e compensa somente o arquivo novo sem referências', async () => {
  const newest = `${OTHER}/${CATEGORY}/mais-recente.png`;
  const h = replacementSetup({ concurrentUpdate: newest });
  await assert.rejects(h.replace(), /outro aparelho/);
  assert.equal(h.rows.get(MEDIA).imagem_url, newest);
  assert.deepEqual(h.calls.filter(([type]) => type === 'remove').map(([, paths]) => paths), [[h.newPath()]]);
});

test('resposta perdida após troca recupera registro sem remover sua nova imagem', async () => {
  const h = replacementSetup({ throwAfterCommit: true });
  const saved = await h.replace();
  assert.equal(saved.imagem_url, h.newPath());
  assert.equal(h.calls.filter(([type]) => type === 'update').length, 1);
  assert.equal(h.calls.some(([type, paths]) => type === 'remove' && paths.includes(h.newPath())), false);
});

test('resposta incerta sem reconciliação preserva ambos os arquivos e não repete a troca', async () => {
  const h = replacementSetup({ throwAfterCommit: true, readFailAt: [2] });
  await assert.rejects(h.replace(), /Reabra a lista antes de reenviar/);
  assert.equal(h.rows.get(MEDIA).imagem_url, h.newPath());
  assert.equal(h.calls.some(([type]) => type === 'remove'), false);
});

test('troca preserva arquivos compartilhados, de outro dono e com referências incompletas ou negadas', async () => {
  for (const options of [
    { shared: true },
    { shared: true, alias: `https://project.supabase.co/storage/v1/object/sign/media-images/${USER}/${CATEGORY}/anterior.png?token=antigo` },
    { oldPath: `${OTHER}/${CATEGORY}/anterior.png` },
    { oldPath: 'https://externo.example/anterior.png' },
    { incompleteReferences: true },
    { referencesError: true },
  ]) {
    const h = replacementSetup(options);
    assert.equal((await h.replace()).imagem_url, h.newPath());
    assert.equal(h.calls.some(([type]) => type === 'remove'), false);
  }
});

test('falha de gravação ou upload na troca preserva imagem anterior', async () => {
  for (const options of [{ rejectUpdate: true }, { throwBeforeCommit: true }, { uploadThrow: true }]) {
    const h = replacementSetup(options);
    await assert.rejects(h.replace(), friendly);
    assert.equal(h.rows.get(MEDIA).imagem_url, h.oldPath);
    assert.equal(h.calls.some(([type, paths]) => type === 'remove' && paths.includes(h.oldPath)), false);
  }
});

test('DELETE concorrente com troca não remove a foto nova nem arquivos anteriores', async () => {
  const newest = `${OTHER}/${CATEGORY}/mais-recente.png`;
  const h = replacementSetup({ concurrentDelete: newest });
  await assert.rejects(h.api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA }), /outro aparelho/);
  assert.equal(h.rows.get(MEDIA).imagem_url, newest);
  assert.equal(h.calls.some(([type]) => type === 'remove'), false);
});

test('DELETE com resposta perdida confirma ausência e preserva arquivo quando compartilhado', async () => {
  for (const shared of [false, true]) {
    const h = replacementSetup({ deleteResponseLost: true, shared });
    const result = await h.api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA });
    assert.equal(result.deleted, true);
    assert.equal(result.filePreserved, shared);
    assert.equal(h.rows.has(MEDIA), false);
    assert.equal(h.calls.filter(([type]) => type === 'remove').length, shared ? 0 : 1);
  }
});

test('exclusão com seleção desatualizada rejeita antes do DELETE e preserva a nova imagem', async () => {
  const h = replacementSetup();
  await assert.rejects(h.api.deleteMedia({ categoryId: CATEGORY, mediaId: MEDIA, expectedPath: 'foto-antiga-na-tela.png' }), /alterada em outro aparelho/);
  assert.equal(h.rows.get(MEDIA).imagem_url, h.oldPath);
  assert.equal(h.calls.some(([type]) => type === 'delete' || type === 'remove'), false);
});
