const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Executa os módulos reais; simula somente a fronteira com banco, navegação e SO.
function load(file, dependencies) {
  const filename = path.join(__dirname, '..', file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (name) => {
      if (!(name in dependencies)) throw new Error(`Dependência não simulada: ${name}`);
      return dependencies[name];
    },
    URL, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' } },
    setTimeout, clearTimeout, setInterval, clearInterval,
  }, { filename });
  return exports;
}

function setup({ rows = [], error = null, user = { id: 'admin' }, authError = null, missing = '' } = {}) {
  const calls = [];
  const query = {
    select: (...args) => { calls.push(['select', ...args]); return query; },
    eq: (...args) => { calls.push(['eq', ...args]); return query; },
    order: (...args) => { calls.push(['order', ...args]); return query; },
    insert: (data) => { calls.push(['insert', data]); return Promise.resolve({ error }); },
    then: (resolve, reject) => Promise.resolve({ data: rows, error }).then(resolve, reject),
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: (table) => { calls.push(['from', table]); return query; },
    storage: { from: (bucket) => ({ createSignedUrl: async (file, seconds) => {
      calls.push(['sign', bucket, file, seconds]);
      return file === missing ? { error: new Error('Arquivo ausente') }
        : { data: { signedUrl: `https://signed.example/${file}` } };
    } }) },
  };
  return { calls, api: load('src/services/supabaseData.js', { '../lib/supabase': { supabase } }) };
}

test('oração vazia não chega ao banco; dados válidos são normalizados', async () => {
  const { api, calls } = setup();
  await assert.rejects(api.createPrayerRequest({ nome: ' ', pedido: 'teste' }), /Preencha/);
  assert.equal(calls.length, 0);
  await api.createPrayerRequest({ nome: ' Eduardo ', pedido: ' Pedido de teste ' });
  assert.equal(calls[1][1].nome, 'Eduardo');
  assert.equal(calls[1][1].pedido, 'Pedido de teste');
});

test('inscrição valida evento, email e telefone antes do envio', async () => {
  const { api, calls } = setup();
  const valid = { eventId: 'evento', nomeCompleto: ' Eduardo ', telefone: '(11) 99999-0000', email: ' EDUARDO@example.com ' };
  for (const invalid of [{ eventId: '' }, { email: 'a@@b.com' }, { telefone: '(11) 9' }]) {
    await assert.rejects(api.createEventRegistration({ ...valid, ...invalid }));
  }
  assert.equal(calls.length, 0);
  await api.createEventRegistration(valid);
  assert.equal(calls[1][1].email, 'eduardo@example.com');
  assert.equal(calls[1][1].event_id, 'evento');
});

test('erros de gravação não são anunciados como sucesso', async () => {
  const { api } = setup({ error: new Error('Sem conexão') });
  await assert.rejects(api.createPrayerRequest({ nome: 'Nome', pedido: 'Pedido' }), /Sem conexão/);
});

test('consultas administrativas sem sessão não fingem lista vazia', async () => {
  for (const authError of [null, { name: 'AuthSessionMissingError' }]) {
    const { api, calls } = setup({ user: null, authError });
    await assert.rejects(api.listPrayerRequests(), /conta administrativa/);
    await assert.rejects(api.listEventRegistrations(), /conta administrativa/);
    assert.equal(calls.length, 0);
  }
});

test('sessão válida permite consultar pedidos e inscrições com o evento associado', async () => {
  const { api, calls } = setup({ rows: [{ id: 'pedido' }] });
  assert.equal((await api.listPrayerRequests())[0].id, 'pedido');
  await api.listEventRegistrations();
  assert.ok(calls.some(([type, fields]) => type === 'select' && fields.includes('events(titulo')));
});

test('falha de autenticação não é confundida com ausência de registros', async () => {
  const { api, calls } = setup({ user: null, authError: new Error('Falha de rede') });
  await assert.rejects(api.listPrayerRequests(), /Falha de rede/);
  assert.equal(calls.length, 0);
});

test('falha na consulta pública é diferente de resultado vazio', async () => {
  await assert.rejects(setup({ error: new Error('offline') }).api.listEvents(), /offline/);
  assert.equal((await setup().api.listEvents()).length, 0);
});

test('eventos públicos preservam seus parâmetros e usam o bucket de eventos', async () => {
  const event = { id: 'evento', titulo: 'Congresso', data: '2026-10-20', horario: '19:30:00', local: 'Igreja', imagem_url: '/event-images/congresso/capa.jpg' };
  const { api, calls } = setup({ rows: [event] });
  const result = await api.listEventsWithImages();
  for (const field of ['id', 'titulo', 'data', 'horario', 'local']) {
    assert.equal(result[0][field], event[field]);
  }
  assert.equal(result[0].imageUrl, 'https://signed.example/congresso/capa.jpg');
  assert.ok(calls.some(([type, bucket, file, seconds]) =>
    type === 'sign' && bucket === 'event-images' && file === 'congresso/capa.jpg' && seconds === 3600));
  assert.ok(calls.some(([type, field, options]) => type === 'order' && field === 'data' && options.ascending));
});

test('evento sem capa ou com arquivo ausente continua disponível; erro da consulta é propagado', async () => {
  const { api } = setup({ missing: 'ausente.jpg', rows: [
    { id: 'sem-capa', imagem_url: null },
    { id: 'ausente', imagem_url: 'ausente.jpg' },
    { id: 'url-antiga', imagem_url: 'https://project.supabase.co/storage/v1/object/sign/event-images/capa%20nova.jpg?token=expirado' },
  ] });
  const events = await api.listEventsWithImages();
  assert.equal(events.length, 3);
  assert.equal(events[0].imageUrl, null);
  assert.equal(events[1].imageUrl, null);
  assert.equal(events[2].imageUrl, 'https://signed.example/capa nova.jpg');
  await assert.rejects(setup({ error: new Error('offline') }).api.listEventsWithImages(), /offline/);
  assert.equal((await setup().api.listEventsWithImages()).length, 0);
});

test('categorias públicas usam os IDs e nomes reais, sem exigir sessão administrativa', async () => {
  const { api, calls } = setup({ user: null, rows: [{ id: 'uuid-categoria', categoria: 'Congresso' }] });
  const categories = await api.listMediaCategories();
  assert.equal(categories[0].id, 'uuid-categoria');
  assert.equal(categories[0].categoria, 'Congresso');
  assert.ok(calls.some(([type, table]) => type === 'from' && table === 'media_categories'));
  await assert.rejects(setup({ error: new Error('offline') }).api.listMediaCategories(), /offline/);
});

test('mídias sempre filtram a categoria; sem categoria não consultam tudo', async () => {
  const { api, calls } = setup();
  assert.equal((await api.listMediaByCategory(null)).length, 0);
  assert.equal(calls.length, 0);
  await api.listMediaByCategory('congresso');
  assert.ok(calls.some(([type, key, value]) => type === 'eq' && key === 'category_id' && value === 'congresso'));
});

test('arquivo quebrado não oculta as outras mídias; renova URL antiga do mesmo bucket', async () => {
  const { api, calls } = setup({ missing: 'ausente.jpg', rows: [
    { id: '1', imagem_url: '/media-images/congresso/foto.jpg' },
    { id: '2', imagem_url: 'ausente.jpg' },
    { id: '3', imagem_url: 'https://project.supabase.co/storage/v1/object/sign/media-images/pasta/foto%20nova.jpg?token=expirado' },
    { id: '4', imagem_url: 'https://externo.example/foto.jpg' },
  ] });
  const result = await api.listMediaByCategory('congresso');
  assert.equal(result[0].imageUrl, 'https://signed.example/congresso/foto.jpg');
  assert.equal(result[1].imageUrl, null);
  assert.equal(result[2].imageUrl, 'https://signed.example/pasta/foto nova.jpg');
  assert.equal(result[3].imageUrl, 'https://externo.example/foto.jpg');
  assert.equal(calls.filter(([type]) => type === 'sign').length, 3);
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
function hookHarness(loader, options = {}) {
  let state, focus, cleanup, resume, auth;
  const removed = [];
  const hook = load('src/hooks/useScreenData.js', {
    react: { useState: (initial) => { state = initial; return [state, (value) => { state = value; }]; }, useCallback: (fn) => fn },
    'react-native': { AppState: { addEventListener: (_, fn) => { resume = fn; return { remove: () => removed.push('app') }; } } },
    '@react-navigation/native': { useFocusEffect: (fn) => { focus = fn; } },
    '../lib/supabase': { supabase: { auth: { onAuthStateChange: (fn) => {
      auth = fn; return { data: { subscription: { unsubscribe: () => removed.push('auth') } } };
    } } } },
  }).default;
  hook(loader, options);
  return { state: () => state, focus: () => { cleanup = focus(); }, blur: () => cleanup(), resume: () => resume('active'), auth: (event) => auth(event), removed };
}

test('retomar o app e voltar à tela recarrega os dados', async () => {
  let count = 0;
  const h = hookHarness(async () => [++count]);
  h.focus(); await flush(); assert.equal(h.state().data[0], 1);
  h.resume(); await flush(); assert.equal(h.state().data[0], 2);
  h.blur(); h.focus(); await flush(); assert.equal(h.state().data[0], 3);
  h.blur();
});

test('resposta antiga não sobrescreve dados novos nem atualiza tela desmontada', async () => {
  const pending = [];
  const h = hookHarness(() => new Promise((resolve) => pending.push(resolve)));
  h.focus(); h.resume();
  pending[1](['novo']); await flush();
  pending[0](['antigo']); await flush();
  assert.equal(h.state().data[0], 'novo');
  h.resume(); h.blur(); pending[2](['desmontado']); await flush();
  assert.equal(h.state().data.length, 0);
});

test('logout limpa dados e invalida consulta anterior imediatamente', async () => {
  let finish;
  const h = hookHarness(() => new Promise((resolve) => { finish = resolve; }), { authenticated: true });
  h.focus(); const old = finish;
  h.auth('SIGNED_OUT');
  old(['privado']); await flush();
  assert.equal(h.state().data.length, 0);
  h.blur();
  assert.deepEqual(h.removed, ['app', 'auth']);
});
