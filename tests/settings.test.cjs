const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(file, dependencies) {
  const filename = path.join(__dirname, '..', file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

const user = { id: 'administrador-de-teste', email: 'admin@example.com' };
const input = { currentPassword: 'senha-atual', newPassword: 'senha-nova', confirmation: 'senha-nova' };
const internalMarker = 'detalhe-interno-sigiloso';

function setup(options = {}) {
  const calls = [];
  const supabase = { auth: {
    async updateUser(attributes) {
      calls.push(['update', attributes]);
      if (options.updateThrow) throw options.updateThrow;
      return options.updateResult ?? { data: { user }, error: null };
    },
  } };
  const api = load('src/services/supabaseSettings.js', {
    '../lib/supabase': { supabase },
    './supabaseAuth': {
      async getAuthenticatedUser() {
        calls.push(['getUser']);
        if (options.getUserThrow) throw options.getUserThrow;
        return Object.hasOwn(options, 'user') ? options.user : user;
      },
      async signInWithEmail(credentials) {
        calls.push(['reauthenticate', credentials]);
        if (options.reauthenticateThrow) throw options.reauthenticateThrow;
        return Object.hasOwn(options, 'verifiedUser') ? options.verifiedUser : user;
      },
    },
  });
  return { api, calls };
}

test('senha exige os três campos antes de consultar o Auth', async () => {
  for (const values of [undefined, {}, { ...input, currentPassword: ' ' }, { ...input, newPassword: '' }, { ...input, confirmation: null }]) {
    const { api, calls } = setup();
    await assert.rejects(api.changePassword(values), /Preencha todos os campos/);
    assert.equal(calls.length, 0);
  }
});

test('senha curta e confirmação diferente são rejeitadas antes de qualquer consulta', async () => {
  const { api, calls } = setup();
  await assert.rejects(api.changePassword({ ...input, newPassword: '12345', confirmation: '12345' }), /pelo menos 6/);
  await assert.rejects(api.changePassword({ ...input, confirmation: 'outra-senha' }), /não coincidem/);
  assert.equal(calls.length, 0);
});

test('alteração reautentica o administrador e preserva exatamente as duas senhas', async () => {
  const { api, calls } = setup();
  const currentPassword = '  Senha atual com espaços  ';
  const newPassword = '  Senha nova com espaços  ';
  assert.equal(await api.changePassword({ currentPassword, newPassword, confirmation: newPassword }), user);
  assert.deepEqual(calls.map(([operation]) => operation), ['getUser', 'reauthenticate', 'update']);
  assert.equal(calls[1][1].email, user.email);
  assert.equal(calls[1][1].password, currentPassword);
  assert.equal(calls[2][1].password, newPassword);
  assert.equal(calls[2][1].current_password, currentPassword);
  assert.deepEqual(Object.keys(calls[2][1]).sort(), ['current_password', 'password']);
});

test('sessão ausente ou sem identidade de e-mail impede reautenticação e alteração', async () => {
  for (const account of [null, {}, { id: user.id }, { email: user.email }]) {
    const { api, calls } = setup({ user: account });
    await assert.rejects(api.changePassword(input), /sessão expirou/);
    assert.deepEqual(calls.map(([operation]) => operation), ['getUser']);
  }
});

test('falha ao confirmar a sessão não revela detalhes nem altera a senha', async () => {
  const { api, calls } = setup({ getUserThrow: new Error(internalMarker) });
  await assert.rejects(api.changePassword(input), (error) => {
    assert.match(error.message, /verificar sua sessão/);
    assert.ok(!error.message.includes(internalMarker));
    return true;
  });
  assert.equal(calls.length, 1);
});

test('senha atual incorreta não chega ao updateUser', async () => {
  const { api, calls } = setup({ reauthenticateThrow: new Error('E-mail ou senha inválidos.') });
  await assert.rejects(api.changePassword(input), /senha atual está incorreta/);
  assert.deepEqual(calls.map(([operation]) => operation), ['getUser', 'reauthenticate']);
});

test('limite de tentativas e falha de rede na reautenticação não viram sucesso', async () => {
  for (const message of ['Muitas tentativas de acesso. Aguarde um pouco e tente novamente.', internalMarker]) {
    const { api, calls } = setup({ reauthenticateThrow: new Error(message) });
    await assert.rejects(api.changePassword(input), (error) => {
      assert.ok(!error.message.includes(internalMarker));
      assert.match(error.message, /tentativas|confirmar a senha atual/);
      return true;
    });
    assert.equal(calls.some(([operation]) => operation === 'update'), false);
  }
});

test('reautenticação com ID diferente ou incompleto nunca altera a senha', async () => {
  for (const verifiedUser of [null, {}, { id: 'outro-usuario' }]) {
    const { api, calls } = setup({ verifiedUser });
    await assert.rejects(api.changePassword(input), /sessão expirou/);
    assert.equal(calls.some(([operation]) => operation === 'update'), false);
  }
});

test('respostas de erro do updateUser são amigáveis e nunca anunciam sucesso', async () => {
  for (const [error, expected] of [
    [{ code: 'weak_password' }, /exigências de segurança/],
    [{ code: 'same_password' }, /diferente da senha atual/],
    [{ status: 401 }, /sessão expirou/],
    [{ status: 429 }, /Muitas tentativas/],
    [{ code: 'reauthentication_needed' }, /Entre novamente/],
    [{ status: 500 }, /Não foi possível alterar/],
  ]) {
    const { api } = setup({ updateResult: { data: null, error: { ...error, message: internalMarker } } });
    await assert.rejects(api.changePassword(input), (failure) => {
      assert.match(failure.message, expected);
      assert.ok(!failure.message.includes(internalMarker));
      return true;
    });
  }
});

test('exceção de rede no updateUser é traduzida e não parece senha salva', async () => {
  const { api } = setup({ updateThrow: new Error(internalMarker) });
  await assert.rejects(api.changePassword(input), (error) => {
    assert.equal(error.message, 'Não foi possível alterar a senha. Tente novamente.');
    return true;
  });
});

test('retorno de alteração sem o mesmo ID não é anunciado como sucesso', async () => {
  for (const data of [null, {}, { user: {} }, { user: { id: 'outro-usuario' } }]) {
    const { api } = setup({ updateResult: { data, error: null } });
    await assert.rejects(api.changePassword(input), /confirmar a alteração/);
  }
});

function screenHarness(changePassword) {
  const state = [], refs = [], messages = [], updates = [];
  let stateIndex = 0, refIndex = 0, effect, cleanup, tree;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = value; updates.push(index); }];
    },
    useRef(initial) {
      const index = refIndex++;
      return refs[index] ??= { current: initial };
    },
    useEffect(callback) { effect = callback; },
  };
  const native = Object.fromEntries(['KeyboardAvoidingView', 'SafeAreaView', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map(name => [name, name]));
  native.Platform = { OS: 'web' };
  const Screen = load('src/Screens/SettingsScreen/index.jsx', {
    react: React,
    'react-native': native,
    'react-native-vector-icons/Feather': () => null,
    '@react-navigation/native': { useNavigation: () => ({ goBack() {} }) },
    './style': {},
    '../../services/supabaseSettings': { changePassword },
    '../../utils/showMessage': (...args) => messages.push(args),
  }).default;
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...(node.props?.children ?? []).flat(Infinity).flatMap(child => nodes(child))];
  }
  const h = {
    render() { stateIndex = 0; refIndex = 0; tree = Screen(); return h; },
    fill(placeholder, value) { nodes().find(node => node.type === 'TextInput' && node.props.placeholder === placeholder).props.onChangeText(value); return h; },
    values: () => nodes().filter(node => node.type === 'TextInput').map(node => node.props.value),
    inputs: () => nodes().filter(node => node.type === 'TextInput'),
    save: () => nodes().find(node => node.props.accessibilityLabel === 'Salvar senha').props,
    unmount: () => cleanup(),
    messages,
    updates,
  };
  h.render();
  cleanup = effect();
  return h;
}

function filledScreen(changePassword) {
  return screenHarness(changePassword)
    .fill('Senha atual', input.currentPassword)
    .fill('Nova senha', input.newPassword)
    .fill('Confirmar nova senha', input.confirmation)
    .render();
}

test('tela bloqueia clique duplicado e só limpa campos após confirmação do servidor', async () => {
  let resolveRequest;
  const calls = [];
  const h = filledScreen((values) => {
    calls.push(values);
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  const save = h.save().onPress;
  const request = save();
  await save();
  h.render();
  assert.equal(calls.length, 1);
  assert.equal(h.save().disabled, true);
  assert.ok(h.inputs().every(node => node.props.editable === false));
  assert.deepEqual(h.values(), [input.currentPassword, input.newPassword, input.confirmation]);
  assert.equal(h.messages.length, 0);
  resolveRequest(user);
  await request;
  h.render();
  assert.deepEqual(h.values(), ['', '', '']);
  assert.equal(h.save().disabled, false);
  assert.equal(h.messages[0][0], 'Sucesso');
  h.unmount();
});

test('tela mantém campos e permite nova tentativa quando a gravação falha', async () => {
  const h = filledScreen(async () => { throw new Error('A senha atual está incorreta.'); });
  await h.save().onPress();
  h.render();
  assert.deepEqual(h.values(), [input.currentPassword, input.newPassword, input.confirmation]);
  assert.equal(h.save().disabled, false);
  assert.equal(h.messages[0][0], 'Não foi possível alterar a senha');
  assert.equal(h.messages[0][1], 'A senha atual está incorreta.');
  h.unmount();
});

test('tela desmontada não limpa campos nem abre aviso quando a requisição termina', async () => {
  let resolveRequest;
  const h = filledScreen(() => new Promise(resolve => { resolveRequest = resolve; }));
  const request = h.save().onPress();
  h.unmount();
  const before = h.updates.length;
  resolveRequest(user);
  await request;
  assert.equal(h.updates.length, before);
  assert.equal(h.messages.length, 0);
});
