const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');

const filename = path.join(__dirname, '..', 'src/Screens/ManageEventsADM/index.jsx');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});

const databaseEvent = {
  id: 'fa911043-d573-457e-9569-24c5766a24d4',
  titulo: 'Evento confirmado no banco',
  data: '2026-12-20',
  horario: '19:45:00',
  local: 'Salão principal',
  imageUrl: 'https://imagem.example/capa-assinada.png',
};
const imageAsset = { uri: 'file://capa-local.png', mimeType: 'image/png', base64: 'aA==' };

function deferred() {
  let resolve, reject;
  const promise = new Promise((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

// Executa a tela real; simula somente hooks, navegação, seletor nativo e serviços externos.
function screenHarness(rows = []) {
  let hookIndex = 0, effects = [], tree, pickedAsset = imageAsset;
  let save = async () => databaseEvent;
  let unmounted = false, updatesAfterUnmount = 0;
  const slots = [], calls = [], messages = [], loaders = [], pickerOptions = [];
  const mockReact = {
    ...React,
    useState(initial) {
      const index = hookIndex++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (value) => {
        if (unmounted) updatesAfterUnmount += 1;
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
      }];
    },
    useRef(initial) {
      const index = hookIndex++;
      return slots[index] ??= { current: initial };
    },
    useCallback(callback, dependencies) {
      const index = hookIndex++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        slots[index] = { value: callback, dependencies };
      }
      return slots[index].value;
    },
    useEffect(callback, dependencies) {
      const index = hookIndex++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const native = Object.fromEntries([
    'View', 'Text', 'TextInput', 'TouchableOpacity', 'ScrollView', 'Modal', 'SafeAreaView', 'Image',
  ].map((name) => [name, name]));
  native.Platform = { OS: 'web' };
  const dependencies = {
    react: mockReact,
    'react-native': native,
    'react-native-vector-icons/Feather': 'Icon',
    '@react-native-community/datetimepicker': 'DateTimePicker',
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async (options) => {
        pickerOptions.push(options);
        return { canceled: false, assets: [pickedAsset] };
      },
    },
    '@react-navigation/native': { useNavigation: () => ({ goBack() {} }) },
    './style': {},
    '../../components/navBar': 'NavBar',
    '../../hooks/useScreenData': (loader, options) => {
      assert.equal(options.authenticated, true);
      if (loaders.at(-1) !== loader) loaders.push(loader);
      return { data: rows, loading: false, errorMessage: '' };
    },
    '../../services/supabaseData': { listEventsWithImages: async () => rows },
    '../../services/supabaseEvents': {
      saveEvent(input) { calls.push(input); return save(input); },
    },
    '../../utils/showMessage': (...args) => messages.push(args),
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, Date, setTimeout, clearTimeout,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada da tela de eventos: ${name}`);
      return dependencies[name];
    },
  }, { filename });

  function render() {
    hookIndex = 0;
    effects = [];
    tree = exports.default();
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return h;
  }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...React.Children.toArray(node.props?.children).flatMap((child) => nodes(child))];
  }
  const h = {
    render,
    button: (label) => nodes().find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === label),
    input: (placeholder) => nodes().find((node) => node.type === 'TextInput' && node.props.placeholder === placeholder),
    modal: () => nodes().find((node) => node.type === 'Modal'),
    dateInput: () => nodes().find((node) => node.type === 'input' && node.props.type === 'datetime-local'),
    eventLabels: () => nodes().filter((node) => node.props.accessibilityLabel?.startsWith('Editar evento:')).map((node) => node.props.accessibilityLabel),
    fill(placeholder, value) { h.input(placeholder).props.onChangeText(value); return h; },
    create() { h.button('Adicionar evento').props.onPress(); return render(); },
    chooseDate(value) {
      h.button('Escolher dia e horário').props.onPress();
      render();
      h.dateInput().props.onChange({ target: { value } });
      return render();
    },
    async pick(asset = imageAsset) {
      pickedAsset = asset;
      await h.button('Escolher capa do evento').props.onPress();
      return render();
    },
    setRows(next) { rows = next; return render(); },
    setSave(callback) { save = callback; },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); unmounted = true; },
    updatesAfterUnmount: () => updatesAfterUnmount,
    calls, messages, loaders, pickerOptions,
  };
  return render();
}

test('eventos administrativos exibem somente os registros do banco e aceitam lista vazia', async (t) => {
  const h = screenHarness([databaseEvent]);
  t.after(() => h.unmount());
  assert.deepEqual(h.eventLabels(), ['Editar evento: Evento confirmado no banco']);
  assert.equal((await h.loaders[0]())[0], databaseEvent);
  h.setRows([]);
  assert.deepEqual(h.eventLabels(), []);
});

test('criação envia data e hora locais e o arquivo selecionado, sem trocar o dia por conversão UTC', async (t) => {
  const h = screenHarness();
  t.after(() => h.unmount());
  h.create().fill('Título', 'Novo evento').fill('Local', 'Templo').render().chooseDate('2026-12-24T23:35');
  await h.pick();
  assert.equal(h.pickerOptions[0].base64, true);
  await h.button('Salvar evento').props.onPress();
  const payload = h.calls[0];
  assert.equal(payload.id, undefined);
  assert.equal(payload.title, 'Novo evento');
  assert.equal(payload.local, 'Templo');
  assert.equal(payload.imageAsset, imageAsset);
  assert.ok(payload.dateTime instanceof Date);
  assert.deepEqual([
    payload.dateTime.getFullYear(), payload.dateTime.getMonth() + 1, payload.dateTime.getDate(),
    payload.dateTime.getHours(), payload.dateTime.getMinutes(),
  ], [2026, 12, 24, 23, 35]);
});

test('edição preserva ID e horário do banco e não reenvia a URL assinada da capa antiga', async (t) => {
  const h = screenHarness([databaseEvent]);
  t.after(() => h.unmount());
  h.button('Editar evento: Evento confirmado no banco').props.onPress();
  h.render().fill('Título', 'Título atualizado').render();
  await h.button('Salvar evento').props.onPress();
  const payload = h.calls[0];
  assert.equal(payload.id, databaseEvent.id);
  assert.equal(payload.title, 'Título atualizado');
  assert.equal(payload.local, databaseEvent.local);
  assert.equal(payload.dateTime.getHours(), 19);
  assert.equal(payload.dateTime.getMinutes(), 45);
  assert.equal(payload.imageAsset, undefined);
  assert.equal(h.pickerOptions.length, 0);
});

test('envio duplicado é bloqueado; erro mantém o formulário e sucesso fecha e recarrega a lista', async (t) => {
  const h = screenHarness();
  t.after(() => h.unmount());
  h.create().fill('Título', 'Evento para tentar novamente').fill('Local', 'Auditório').render().chooseDate('2026-12-20T18:15');
  const request = deferred();
  h.setSave(() => request.promise);
  const save = h.button('Salvar evento').props.onPress;
  const first = save();
  await save();
  h.render();
  assert.equal(h.calls.length, 1);
  assert.equal(h.button('Salvar evento').props.disabled, true);
  request.reject(new Error('Falha controlada no servidor.'));
  await first;
  h.render();
  assert.equal(h.modal().props.visible, true);
  assert.equal(h.input('Título').props.value, 'Evento para tentar novamente');
  assert.equal(h.input('Local').props.value, 'Auditório');
  assert.equal(h.messages[0][0], 'Não foi possível salvar o evento');
  assert.equal(h.button('Salvar evento').props.disabled, false);
  assert.equal(h.loaders.length, 1);
  h.setSave(async () => databaseEvent);
  await h.button('Salvar evento').props.onPress();
  h.render();
  assert.equal(h.modal().props.visible, false);
  assert.equal(h.loaders.length, 2);
  assert.equal(h.messages[1][0], 'Evento salvo');
});

test('desmontar durante o envio impede atualização e aviso de sucesso tardios', async () => {
  const h = screenHarness();
  h.create().fill('Título', 'Evento').fill('Local', 'Templo').render().chooseDate('2026-12-20T18:15');
  const request = deferred();
  h.setSave(() => request.promise);
  const saving = h.button('Salvar evento').props.onPress();
  h.unmount();
  request.resolve(databaseEvent);
  await saving;
  assert.equal(h.updatesAfterUnmount(), 0);
  assert.equal(h.messages.length, 0);
});

test('retirar capa fica pendente até salvar e mantém o evento e a seleção em caso de falha', async (t) => {
  const h = screenHarness([databaseEvent]);
  t.after(() => h.unmount());
  h.button('Editar evento: Evento confirmado no banco').props.onPress();
  h.render();
  h.button('Remover capa do evento').props.onPress();
  h.render();
  assert.equal(h.calls.length, 0);
  h.setSave(async () => { throw new Error('Falha controlada na retirada.'); });
  await h.button('Salvar evento').props.onPress();
  h.render();
  assert.equal(h.calls[0].id, databaseEvent.id);
  assert.equal(h.calls[0].removeImage, true);
  assert.equal(h.calls[0].imageAsset, undefined);
  assert.equal(h.modal().props.visible, true);
  assert.equal(h.input('Título').props.value, databaseEvent.titulo);
  h.setSave(async () => databaseEvent);
  await h.button('Salvar evento').props.onPress();
  h.render();
  assert.equal(h.calls[1].removeImage, true);
  assert.equal(h.modal().props.visible, false);
});

test('escolher uma capa nova cancela a retirada e reabrir edição restaura a capa do banco', async (t) => {
  const h = screenHarness([databaseEvent]);
  t.after(() => h.unmount());
  h.button('Editar evento: Evento confirmado no banco').props.onPress();
  h.render();
  h.button('Remover capa do evento').props.onPress();
  h.render();
  await h.pick();
  await h.button('Salvar evento').props.onPress();
  assert.equal(h.calls[0].removeImage, false);
  assert.equal(h.calls[0].imageAsset, imageAsset);
  h.render();
  h.button('Editar evento: Evento confirmado no banco').props.onPress();
  h.render();
  assert.ok(h.button('Remover capa do evento'));
});

test('capa sem prévia assinada ainda pode ser retirada usando o caminho original do banco', async (t) => {
  const event = { ...databaseEvent, imageUrl: null, imagem_url: 'conta/evento/capa.png' };
  const h = screenHarness([event]);
  t.after(() => h.unmount());
  h.button('Editar evento: Evento confirmado no banco').props.onPress();
  h.render();
  assert.ok(h.button('Remover capa do evento'));
  h.button('Remover capa do evento').props.onPress();
  h.render();
  await h.button('Salvar evento').props.onPress();
  assert.equal(h.calls[0].removeImage, true);
  assert.equal(h.calls[0].expectedImagePath, event.imagem_url);
  assert.equal(h.calls[0].id, event.id);
});
