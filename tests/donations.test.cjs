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
      if (name in dependencies) return dependencies[name];
      if (name.endsWith('.png')) return name;
      throw new Error(`Dependência não simulada: ${name}`);
    },
  }, { filename });
  return exports;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

function screenHarness(file, options = {}) {
  let hookIndex = 0, tree, effects = [], unmounted = false;
  const slots = [], messages = [], prayerCalls = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = hookIndex++;
      slots[index] ??= { value: initial };
      return [slots[index].value, (value) => {
        if (unmounted) throw new Error('Atualização após desmontagem.');
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
      }];
    },
    useCallback(callback) { return callback; },
    useRef(initial) { return slots[hookIndex++] ??= { current: initial }; },
    useEffect(callback, dependencies) {
      const index = hookIndex++;
      if (!slots[index]) effects.push(() => { slots[index] = { cleanup: callback(), dependencies }; });
    },
  };
  const native = Object.fromEntries(['Image', 'Modal', 'SafeAreaView', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [name, name]));
  const data = load('src/Screens/DonationADM/data.js', {});
  const Screen = load(file, {
    react, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-image-picker': options.imagePicker || {},
    'react-native-vector-icons/Feather': 'Icon',
    '@react-navigation/native': { useNavigation: () => ({ goBack() {} }) },
    './style': {}, './data': data, '../DonationADM/data': data,
    '../../components/navBar': 'NavBar',
    '../../components/header/searchHeader': 'SearchHeader',
    '../../components/inputs': 'InputComponent',
    '../../components/titles': 'TitleComponent',
    '../../components/button/buttonsForm': 'ButtonForm',
    '../../services/supabaseData': { createPrayerRequest: async (input) => prayerCalls.push(input) },
    '../../utils/showMessage': (...args) => messages.push(args),
    '../../utils/confirmAction': options.confirmAction || (async () => true),
    '../../hooks/useScreenData': {
      default: () => ({data: options.campaigns?.() || [], loading: false, errorMessage: ''}),
      __esModule: true,
      PUBLIC_CONTENT_REFRESH_MS: 30000,
    },
    '../../services/supabaseDonations': {
      listDonationCampaigns: async () => [],
      saveDonationCampaign: options.saveDonationCampaign,
      deleteDonationCampaign: options.deleteDonationCampaign,
    },
  }).default;
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...(node.props?.children ?? []).flat(Infinity).flatMap((child) => nodes(child))];
  }
  const h = {
    render() { hookIndex = 0; effects = []; tree = Screen(); effects.forEach((effect) => effect()); return h; },
    button: (label) => nodes().find((node) => node.props.accessibilityLabel === label),
    input: (placeholder) => nodes().find((node) => node.props.placeholder === placeholder),
    images: () => nodes().filter((node) => node.type === 'Image'),
    prayerButton: () => nodes().find((node) => node.type === 'ButtonForm'),
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); unmounted = true; },
    messages, prayerCalls,
  };
  return h.render();
}

const adminFile = 'src/Screens/DonationADM/index.jsx';
const publicFile = 'src/Screens/DonationsRequests/index.jsx';
const first = { id: 'donation-1', title: 'Campanha inicial', asset_key: 'agasalho-1' };
const second = { id: 'donation-2', title: 'Segunda campanha', asset_key: 'agasalho-2' };

test('atualizar a lista pública após a exclusão mantém os campos do pedido de oração', async () => {
  let published = [first, second];
  const screen = screenHarness(publicFile, { campaigns: () => published });
  screen.input('Nome completo...').props.setValor('Pessoa de teste');
  screen.input('Informações...').props.setValor('Pedido de oração.');
  published = [second];
  screen.render();
  assert.equal(screen.images().length, 1);
  assert.equal(screen.images()[0].props.accessibilityLabel, 'Segunda campanha');
  await screen.prayerButton().props.onPress();
  assert.equal(screen.prayerCalls.length, 1);
  assert.equal(screen.prayerCalls[0].nome, 'Pessoa de teste');
  assert.equal(screen.prayerCalls[0].pedido, 'Pedido de oração.');
  screen.unmount();
});

test('exclusão exige confirmação, evita envio concorrente e mostra falha do serviço', async () => {
  const pending = deferred();
  let confirmed = false;
  const deleted = [];
  const screen = screenHarness(adminFile, {
    campaigns: () => [first, second],
    confirmAction: async () => confirmed,
    deleteDonationCampaign(id) { deleted.push(id); return pending.promise; },
  });
  const remove = screen.button('Apagar campanha: Campanha inicial').props.onPress;
  await remove();
  assert.deepEqual(deleted, []);
  confirmed = true;
  const saving = remove();
  await remove();
  await flush();
  assert.deepEqual(deleted, [first.id]);
  assert.equal(screen.render().button('Apagar campanha: Campanha inicial').props.disabled, true);
  pending.reject(new Error('Tente novamente.'));
  await saving;
  assert.equal(screen.render().images().length, 2);
  assert.equal(screen.messages[0][0], 'Não foi possível apagar a campanha');
  screen.unmount();
});

test('trocar imagem pelo modal envia o arquivo para a campanha existente', async () => {
  const asset = { uri: 'file:///temporario.png', base64: 'imagem-de-teste' };
  const saves = [];
  const screen = screenHarness(adminFile, {
    campaigns: () => [first],
    imagePicker: {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async (options) => {
        assert.equal(options.base64, true);
        return { canceled: false, assets: [asset] };
      },
    },
    async saveDonationCampaign(payload) { saves.push(payload); return { cleanupPending: false }; },
  });
  screen.button('Editar campanha: Campanha inicial').props.onPress();
  await screen.render().button('Trocar imagem da campanha').props.onPress();
  assert.equal(saves.length, 0);
  await screen.render().button('Salvar campanha').props.onPress();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].id, first.id);
  assert.equal(saves[0].title, first.title);
  assert.equal(saves[0].imageAsset, asset);
  screen.unmount();
});
