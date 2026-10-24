const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Exercita o serviço real; somente a fronteira do SDK é simulada.
function loadAuth(supabase) {
  const filename = path.join(__dirname, '..', 'src/services/supabaseAuth.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.equal(name, '../lib/supabase');
      return { supabase };
    },
  }, { filename });
  return exports;
}

const credentials = { email: 'teste@example.com', password: 'senha-ficticia' };
const internalMarker = 'detalhe-interno-que-nao-deve-aparecer';

function validData() {
  const user = { id: 'usuario-ficticio' };
  return { user, session: { access_token: 'token-sintetico-de-teste', user } };
}

function setup(options = {}) {
  const calls = [];
  const signInData = validData();
  const signInResult = options.signInResult ?? { data: signInData, error: null };
  const getUserResult = options.getUserResult ?? { data: { user: signInData.user }, error: null };
  const supabase = {
    auth: {
      async signInWithPassword(input) {
        calls.push(['signInWithPassword', input]);
        if (options.signInThrow) throw options.signInThrow;
        return signInResult;
      },
      async getUser() {
        calls.push(['getUser']);
        if (options.getUserThrow) throw options.getUserThrow;
        return getUserResult;
      },
      async signOut(input) {
        calls.push(['signOut', input]);
        if (options.signOutThrow) throw options.signOutThrow;
        return options.signOutResult ?? { error: null };
      },
    },
    from() {
      throw new Error('O serviço de autenticação não deve consultar tabelas ou inventar papéis.');
    },
  };
  return { api: loadAuth(supabase), calls, signInData };
}

function assertFriendlyError(error) {
  assert.equal(typeof error.message, 'string');
  assert.ok(error.message.length > 0);
  assert.ok(!error.message.includes(internalMarker), 'Não deve expor detalhes internos do SDK.');
  return true;
}

test('serviço exporta somente as duas operações de autenticação combinadas', () => {
  const { api } = setup();
  assert.deepEqual(Object.keys(api).sort(), ['getAuthenticatedUser', 'signInWithEmail']);
});

test('login exige e-mail e senha preenchidos antes de chamar o Auth', async () => {
  for (const input of [
    {},
    { email: ' ', password: 'senha-ficticia' },
    { email: 'teste@example.com', password: '' },
    { email: 'teste@example.com', password: '   ' },
    { email: 'teste@example.com', password: null },
  ]) {
    const { api, calls } = setup();
    await assert.rejects(api.signInWithEmail(input), /Preencha o e-mail e a senha/);
    assert.equal(calls.length, 0);
  }
});

test('login rejeita formato inválido de e-mail sem requisição', async () => {
  for (const email of ['sem-arroba', 'a@@b.com', 'a@b', 'a b@example.com']) {
    const { api, calls } = setup();
    await assert.rejects(api.signInWithEmail({ ...credentials, email }), /e-mail válido/);
    assert.equal(calls.length, 0);
  }
});

test('login normaliza o e-mail, preserva exatamente a senha e retorna o usuário da sessão', async () => {
  const { api, calls, signInData } = setup();
  const password = '  Senha com espaços  ';
  const user = await api.signInWithEmail({ email: '  TESTE@Example.COM  ', password });
  assert.equal(user, signInData.user);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'signInWithPassword');
  assert.equal(calls[0][1].email, 'teste@example.com');
  assert.equal(calls[0][1].password, password);
});

test('credenciais inválidas são traduzidas sem expor a resposta interna', async () => {
  for (const error of [
    { code: 'invalid_credentials', message: internalMarker },
    { status: 400, message: internalMarker },
    { status: 401, message: internalMarker },
  ]) {
    const { api, calls } = setup({ signInResult: { data: { user: null, session: null }, error } });
    await assert.rejects(api.signInWithEmail(credentials), (failure) => {
      assert.equal(failure.message, 'E-mail ou senha inválidos.');
      return assertFriendlyError(failure);
    });
    assert.equal(calls.filter(([type]) => type === 'signOut').length, 0);
  }
});

test('e-mail não confirmado apresenta a orientação específica', async () => {
  const { api } = setup({
    signInResult: { data: null, error: { code: 'email_not_confirmed', status: 400, message: internalMarker } },
  });
  await assert.rejects(api.signInWithEmail(credentials), (error) => {
    assert.equal(error.message, 'Confirme seu e-mail antes de entrar.');
    return assertFriendlyError(error);
  });
});

test('limite de tentativas é traduzido pelo status ou código do Auth', async () => {
  for (const error of [{ status: 429 }, { code: 'over_request_rate_limit' }]) {
    const { api } = setup({ signInResult: { data: null, error: { ...error, message: internalMarker } } });
    await assert.rejects(api.signInWithEmail(credentials), (failure) => {
      assert.match(failure.message, /tentativas/i);
      return assertFriendlyError(failure);
    });
  }
});

test('falha de rede lançada no login é amigável e não revela detalhes do SDK', async () => {
  const { api } = setup({ signInThrow: new Error(internalMarker) });
  await assert.rejects(api.signInWithEmail(credentials), (error) => {
    assert.match(error.message, /conectar/i);
    return assertFriendlyError(error);
  });
});

test('erro não reconhecido retornado pelo Auth não vira acesso nem mensagem interna', async () => {
  const { api } = setup({
    signInResult: { data: null, error: { code: 'unexpected_error', status: 500, message: internalMarker } },
  });
  await assert.rejects(api.signInWithEmail(credentials), assertFriendlyError);
});

test('respostas com sessão incompleta ou IDs diferentes são rejeitadas e limpas somente localmente', async () => {
  const user = { id: 'usuario-ficticio' };
  for (const data of [
    { user: null, session: { access_token: 'token-sintetico', user } },
    { user: {}, session: { access_token: 'token-sintetico', user } },
    { user, session: {} },
    { user, session: { access_token: '', user } },
    { user, session: { access_token: 'token-sintetico', user: null } },
    { user, session: { access_token: 'token-sintetico', user: { id: 'outro-usuario' } } },
  ]) {
    const { api, calls } = setup({ signInResult: { data, error: null } });
    await assert.rejects(api.signInWithEmail(credentials), /Não foi possível iniciar a sessão/);
    const signOut = calls.filter(([type]) => type === 'signOut');
    assert.equal(signOut.length, 1);
    assert.equal(signOut[0][1].scope, 'local');
  }
});

test('retorno sem sessão não encerra uma sessão anterior', async () => {
  for (const data of [null, {}, { user: { id: 'usuario-ficticio' }, session: null }]) {
    const { api, calls } = setup({ signInResult: { data, error: null } });
    await assert.rejects(api.signInWithEmail(credentials), /Não foi possível iniciar a sessão/);
    assert.equal(calls.filter(([type]) => type === 'signOut').length, 0);
  }
});

test('falha ao limpar sessão parcial não libera acesso nem expõe detalhes', async () => {
  for (const cleanup of [
    { signOutThrow: new Error(internalMarker) },
    { signOutResult: { error: { message: internalMarker } } },
  ]) {
    const { api, calls } = setup({ signInResult: { data: { user: null, session: {} }, error: null }, ...cleanup });
    await assert.rejects(api.signInWithEmail(credentials), (error) => {
      assert.match(error.message, /Não foi possível iniciar a sessão/);
      return assertFriendlyError(error);
    });
    assert.equal(calls.filter(([type]) => type === 'signOut').length, 1);
  }
});

test('verificação de sessão consulta getUser e retorna o usuário confirmado pelo Auth', async () => {
  const user = { id: 'usuario-confirmado' };
  const { api, calls } = setup({ getUserResult: { data: { user }, error: null } });
  assert.equal(await api.getAuthenticatedUser(), user);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'getUser');
});

test('usuário ausente ou sem ID retorna null, sem inventar perfil administrativo', async () => {
  for (const data of [null, {}, { user: null }, { user: {} }]) {
    const { api } = setup({ getUserResult: { data, error: null } });
    assert.equal(await api.getAuthenticatedUser(), null);
  }
});

test('sessão ausente ou status 401 retornados pelo Auth são tratados como não autenticados', async () => {
  for (const error of [
    { name: 'AuthSessionMissingError', message: internalMarker },
    { name: 'AuthApiError', status: 401, message: internalMarker },
  ]) {
    const { api } = setup({ getUserResult: { data: { user: null }, error } });
    assert.equal(await api.getAuthenticatedUser(), null);
  }
});

test('sessão ausente ou status 401 lançados pelo SDK também retornam null', async () => {
  for (const error of [
    { name: 'AuthSessionMissingError', message: internalMarker },
    { status: 401, message: internalMarker },
  ]) {
    const { api } = setup({ getUserThrow: error });
    assert.equal(await api.getAuthenticatedUser(), null);
  }
});

test('falhas de verificação diferentes de 401 são rejeitadas e não parecem ausência de usuário', async () => {
  for (const status of [403, 500, 503]) {
    const { api } = setup({ getUserResult: { data: null, error: { status, message: internalMarker } } });
    await assert.rejects(api.getAuthenticatedUser(), (error) => {
      assert.match(error.message, /verificar sua sessão/i);
      return assertFriendlyError(error);
    });
  }
});

test('falha de rede ao verificar sessão rejeita com orientação amigável', async () => {
  const { api } = setup({ getUserThrow: new Error(internalMarker) });
  await assert.rejects(api.getAuthenticatedUser(), (error) => {
    assert.match(error.message, /verificar sua sessão/i);
    return assertFriendlyError(error);
  });
});

test('autenticação não inventa autorização baseada em user_metadata', async () => {
  const user = { id: 'usuario-confirmado', user_metadata: { role: 'visitante', is_admin: false } };
  const { api } = setup({ getUserResult: { data: { user }, error: null } });
  assert.equal(await api.getAuthenticatedUser(), user);
});

function guardHarness(initialState, { focused = true } = {}) {
  const filename = path.join(__dirname, '..', 'src/Navigation/withAuthenticatedScreen.jsx');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  let state = initialState;
  let effects = [];
  const references = [];
  let referenceIndex = 0;
  const screenProps = [];
  const resets = [];
  let sessionReads = 0;
  const mockReact = {
    ...React,
    useEffect(effect) { effects.push(effect); },
    useRef(initialValue) {
      const index = referenceIndex++;
      if (!references[index]) references[index] = { current: initialValue };
      return references[index];
    },
  };
  const dependencies = {
    react: mockReact,
    'react-native': {
      ActivityIndicator: (props) => React.createElement('span', {
        role: 'progressbar', 'aria-label': props.accessibilityLabel,
      }),
    },
    '@react-navigation/native': { useIsFocused: () => focused },
    '../hooks/useAuthSession': () => {
      sessionReads++;
      return state;
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada da guarda: ${name}`);
      return dependencies[name];
    },
  }, { filename });

  function PrivateScreen(props) {
    screenProps.push(props);
    return React.createElement('div', null, 'CONTEÚDO PRIVADO');
  }
  const GuardedScreen = exports.default(PrivateScreen);
  const navigation = { reset: (payload) => resets.push(payload) };
  const props = { navigation, route: { key: 'rota-teste' }, sample: 'prop-preservada' };

  return {
    render() {
      referenceIndex = 0;
      effects = [];
      // O renderer real executa PrivateScreen se a guarda o deixar passar.
      return renderToStaticMarkup(React.createElement(GuardedScreen, props));
    },
    flushEffects() {
      const pending = effects;
      effects = [];
      for (const effect of pending) effect();
    },
    setState(value) { state = value; },
    setFocused(value) { focused = value; },
    sessionReads: () => sessionReads,
    screenProps,
    resets,
    props,
  };
}

test('guarda mostra verificação sem renderizar conteúdo privado nem redirecionar durante loading', () => {
  for (const user of [null, { id: 'sessao-anterior' }]) {
    const h = guardHarness({ user, loading: true, errorMessage: '' });
    const html = h.render();
    assert.match(html, /role="progressbar"/);
    assert.match(html, /Verificando sessão/);
    assert.ok(!html.includes('CONTEÚDO PRIVADO'));
    assert.equal(h.screenProps.length, 0);
    h.flushEffects();
    assert.equal(h.resets.length, 0);
    assert.equal(h.sessionReads(), 1);
  }
});

test('guarda bloqueia sessão ausente ou erro e limpa o histórico privado para Login', () => {
  for (const state of [
    { user: null, loading: false, errorMessage: '' },
    { user: {}, loading: false, errorMessage: '' },
    { user: { id: 'usuario-anterior' }, loading: false, errorMessage: 'Falha ao verificar' },
  ]) {
    const h = guardHarness(state);
    assert.equal(h.render(), '');
    assert.equal(h.screenProps.length, 0);
    assert.equal(h.resets.length, 0);
    h.flushEffects();
    assert.equal(h.resets.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(h.resets[0])), {
      index: 0, routes: [{ name: 'Login' }],
    });
  }
});

test('guarda renderiza usuário confirmado e preserva as propriedades da tela', () => {
  const h = guardHarness({ user: { id: 'usuario-confirmado' }, loading: false, errorMessage: '' });
  assert.match(h.render(), /CONTEÚDO PRIVADO/);
  assert.equal(h.screenProps.length, 1);
  assert.equal(h.screenProps[0].navigation, h.props.navigation);
  assert.equal(h.screenProps[0].route, h.props.route);
  assert.equal(h.screenProps[0].sample, 'prop-preservada');
  h.flushEffects();
  assert.equal(h.resets.length, 0);
});

test('guarda remove o conteúdo privado ao invalidar e ao perder a sessão', () => {
  const h = guardHarness({ user: { id: 'usuario-confirmado' }, loading: false, errorMessage: '' });
  assert.match(h.render(), /CONTEÚDO PRIVADO/);
  h.flushEffects();

  h.setState({ user: null, loading: true, errorMessage: '' });
  assert.match(h.render(), /Verificando sessão/);
  h.flushEffects();
  assert.equal(h.screenProps.length, 1);
  assert.equal(h.resets.length, 0);

  h.setState({ user: null, loading: false, errorMessage: '' });
  assert.equal(h.render(), '');
  h.flushEffects();
  assert.equal(h.screenProps.length, 1);
  assert.equal(h.resets.length, 1);

  assert.equal(h.render(), '');
  h.flushEffects();
  assert.equal(h.resets.length, 1, 'A mesma instância não deve redirecionar repetidamente.');
});

test('guarda fora de foco não reseta o histórico até a rota ficar ativa', () => {
  const h = guardHarness({ user: null, loading: false, errorMessage: '' }, { focused: false });
  assert.equal(h.render(), '');
  h.flushEffects();
  assert.equal(h.screenProps.length, 0);
  assert.equal(h.resets.length, 0);

  h.setFocused(true);
  assert.equal(h.render(), '');
  h.flushEffects();
  assert.equal(h.resets.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.resets[0])), {
    index: 0, routes: [{ name: 'Login' }],
  });
});

const flushAuth = () => new Promise((resolve) => setImmediate(resolve));

function authSessionHarness() {
  const filename = path.join(__dirname, '..', 'src/hooks/useAuthSession.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  let state;
  let effect;
  let cleanup;
  let authListener;
  let appListener;
  let authSubscribed = true;
  let appSubscribed = true;
  let timerId = 0;
  const timers = new Map();
  const pending = [];
  const removed = [];
  const updates = [];
  const dependencies = {
    react: {
      useState(initial) {
        state = initial;
        return [state, (value) => {
          state = typeof value === 'function' ? value(state) : value;
          updates.push(state);
        }];
      },
      useRef: (value) => ({ current: value }),
      useEffect: (callback) => { effect = callback; },
    },
    'react-native': {
      AppState: { addEventListener: (event, callback) => {
        assert.equal(event, 'change');
        appListener = callback;
        return { remove: () => { appSubscribed = false; removed.push('app'); } };
      } },
    },
    '../lib/supabase': {
      supabase: { auth: { onAuthStateChange: (callback) => {
        authListener = callback;
        return { data: { subscription: {
          unsubscribe: () => { authSubscribed = false; removed.push('auth'); },
        } } };
      } } },
    },
    '../services/supabaseAuth': {
      getAuthenticatedUser: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada da sessão: ${name}`);
      return dependencies[name];
    },
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  }, { filename });
  exports.default();

  return {
    mount() { cleanup = effect(); },
    cleanup() { cleanup(); },
    state: () => state,
    app(status) { if (appSubscribed) appListener(status); },
    auth(event, session) { if (authSubscribed) return authListener(event, session); },
    runTimers() {
      const jobs = [...timers.values()];
      timers.clear();
      for (const job of jobs) job();
    },
    timerCount: () => timers.size,
    pending,
    removed,
    updates,
  };
}

test('hook inicia verificando e encerra o carregamento sem sessão', async () => {
  const h = authSessionHarness();
  assert.equal(h.state().loading, true);
  assert.equal(h.state().user, null);
  h.mount();
  assert.equal(h.pending.length, 1);
  h.pending[0].resolve(null);
  await flushAuth();
  assert.equal(h.state().loading, false);
  assert.equal(h.state().user, null);
  assert.equal(h.state().errorMessage, '');
  h.cleanup();
});

test('hook confirma usuário e ignora INITIAL_SESSION sem repetir a consulta', async () => {
  const h = authSessionHarness();
  const user = { id: 'usuario-confirmado' };
  h.mount();
  h.auth('INITIAL_SESSION', { user });
  assert.equal(h.pending.length, 1);
  assert.equal(h.timerCount(), 0);
  h.pending[0].resolve(user);
  await flushAuth();
  assert.equal(h.state().user, user);
  assert.equal(h.state().loading, false);
  h.app('background');
  assert.equal(h.pending.length, 1);
  h.cleanup();
});

test('retomar o app mantém usuário confirmado e não volta ao loading durante a revalidação', async () => {
  const h = authSessionHarness();
  const user = { id: 'mesmo-usuario' };
  h.mount();
  h.pending[0].resolve(user);
  await flushAuth();
  const verified = h.state();
  h.app('active');
  assert.equal(h.pending.length, 2);
  assert.equal(h.state(), verified);
  assert.equal(h.state().loading, false);
  h.pending[1].resolve({ id: 'mesmo-usuario' });
  await flushAuth();
  assert.equal(h.state().user.id, 'mesmo-usuario');
  assert.equal(h.state().loading, false);
  h.cleanup();
});

test('renovar token da mesma sessão preserva formulário e consulta Auth somente fora do callback', async () => {
  const h = authSessionHarness();
  const user = { id: 'mesmo-usuario' };
  h.mount();
  h.pending[0].resolve(user);
  await flushAuth();
  const verified = h.state();
  assert.equal(h.auth('TOKEN_REFRESHED', { user }), undefined);
  assert.equal(h.state(), verified);
  assert.equal(h.pending.length, 1);
  assert.equal(h.timerCount(), 1);
  h.runTimers();
  assert.equal(h.pending.length, 2);
  assert.equal(h.state(), verified);
  h.pending[1].resolve({ id: 'mesmo-usuario' });
  await flushAuth();
  assert.equal(h.state().loading, false);
  assert.equal(h.state().user.id, 'mesmo-usuario');
  h.cleanup();
});

test('sessão expirada retorna null e limpa o usuário após revalidação', async () => {
  const h = authSessionHarness();
  h.mount();
  h.pending[0].resolve({ id: 'usuario-anterior' });
  await flushAuth();
  h.app('active');
  // getAuthenticatedUser traduz AuthSessionMissingError/401 para null.
  h.pending[1].resolve(null);
  await flushAuth();
  assert.equal(h.state().user, null);
  assert.equal(h.state().loading, false);
  assert.equal(h.state().errorMessage, '');
  h.cleanup();
});

test('erro de verificação limpa o usuário e expõe somente a orientação do serviço', async () => {
  const h = authSessionHarness();
  h.mount();
  h.pending[0].resolve({ id: 'usuario-anterior' });
  await flushAuth();
  h.app('active');
  h.pending[1].reject(new Error('Não foi possível verificar sua sessão.'));
  await flushAuth();
  assert.equal(h.state().user, null);
  assert.equal(h.state().loading, false);
  assert.equal(h.state().errorMessage, 'Não foi possível verificar sua sessão.');
  h.cleanup();
});

test('logout limpa imediatamente e uma verificação anterior não restaura o usuário', async () => {
  const h = authSessionHarness();
  const user = { id: 'usuario-anterior' };
  h.mount();
  h.pending[0].resolve(user);
  await flushAuth();
  h.app('active');
  h.auth('SIGNED_OUT', null);
  assert.equal(h.state().user, null);
  assert.equal(h.state().loading, true);
  assert.equal(h.pending.length, 2);
  h.pending[1].resolve(user);
  await flushAuth();
  assert.equal(h.state().user, null);
  h.runTimers();
  assert.equal(h.pending.length, 3);
  h.pending[2].resolve(null);
  await flushAuth();
  assert.equal(h.state().user, null);
  assert.equal(h.state().loading, false);
  h.cleanup();
});

test('troca de ID invalida imediatamente o usuário anterior e confirma somente a conta nova', async () => {
  const h = authSessionHarness();
  const previous = { id: 'usuario-anterior' };
  const next = { id: 'usuario-novo' };
  h.mount();
  h.pending[0].resolve(previous);
  await flushAuth();
  h.app('active');
  h.auth('SIGNED_IN', { user: next });
  assert.equal(h.state().user, null);
  assert.equal(h.state().loading, true);
  h.pending[1].resolve(previous);
  await flushAuth();
  assert.equal(h.state().user, null);
  h.runTimers();
  h.pending[2].resolve(next);
  await flushAuth();
  assert.equal(h.state().user, next);
  assert.equal(h.state().loading, false);
  h.cleanup();
});

test('resposta mais antiga não sobrescreve a verificação mais recente', async () => {
  const h = authSessionHarness();
  h.mount();
  h.app('active');
  h.pending[1].resolve({ id: 'usuario-confirmado-agora' });
  await flushAuth();
  h.pending[0].resolve({ id: 'resposta-obsoleta' });
  await flushAuth();
  assert.equal(h.state().user.id, 'usuario-confirmado-agora');
  h.cleanup();
});

test('cleanup cancela consulta agendada, remove listeners e impede atualização pendente', async () => {
  const h = authSessionHarness();
  h.mount();
  h.auth('SIGNED_IN', { user: { id: 'usuario-ficticio' } });
  assert.equal(h.timerCount(), 1);
  const beforeCleanup = h.state();
  const updateCount = h.updates.length;
  h.cleanup();
  assert.deepEqual(h.removed, ['auth', 'app']);
  assert.equal(h.timerCount(), 0);
  h.runTimers();
  h.app('active');
  h.auth('SIGNED_OUT', null);
  h.pending[0].resolve({ id: 'resposta-apos-desmontar' });
  await flushAuth();
  assert.equal(h.pending.length, 1);
  assert.equal(h.updates.length, updateCount);
  assert.equal(h.state(), beforeCleanup);
});
