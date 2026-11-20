const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');

const filename = path.join(__dirname, '..', 'src/Screens/MidiaScreen/PopUp/index.jsx');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename,
  configFile: false,
  babelrc: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

// Executa os handlers do componente real; simula apenas hooks, SO e serviços externos.
function popupHarness(options = {}) {
  let hookIndex = 0;
  let effects = [];
  let tree;
  let unmounted = false;
  let updatesAfterUnmount = 0;
  const slots = [];
  const calls = [];
  const messages = [];
  let props = {
    visible: true,
    category: { id: 'categoria-a', categoria: 'Categoria A' },
    onClose: () => calls.push(['close']),
    ...options.props,
  };
  let upload = async () => {};
  let replacement = async () => {};
  let deletion = async () => {};
  let confirmation = () => Promise.resolve(true);
  let pickedAssets = [];

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
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
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
  const dependencies = {
    react: mockReact,
    'react-native': Object.fromEntries(
      ['FlatList', 'Image', 'Modal', 'Text', 'TouchableOpacity', 'View'].map((name) => [name, name]),
    ),
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => ({ canceled: false, assets: pickedAssets }),
    },
    'react-native-vector-icons/Feather': 'Icon',
    './style': {},
    '../../../hooks/useScreenData': () => ({ data: options.rows || [], loading: false, errorMessage: '' }),
    '../../../services/supabaseData': { listMediaByCategory: async () => [] },
    '../../../services/supabaseMedia': {
      uploadMedia(input) {
        calls.push(['upload', input]);
        return upload(input);
      },
      deleteMedia(input) {
        calls.push(['delete', input]);
        return deletion(input);
      },
      replaceMedia(input) {
        calls.push(['replace', input]);
        return replacement(input);
      },
    },
    '../../../utils/showMessage': (...args) => messages.push(args),
    '../../../utils/confirmAction': (...args) => confirmation(...args),
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Dependência não simulada do pop-up: ${name}`);
      return dependencies[name];
    },
  }, { filename });

  function render() {
    hookIndex = 0;
    effects = [];
    tree = exports.default(props);
    const pendingEffects = effects;
    effects = [];
    pendingEffects.forEach((effect) => effect());
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return null;
  }
  const button = (label) => find(tree, (node) =>
    node.type === 'TouchableOpacity' && node.props.accessibilityLabel === label);
  const grid = () => find(tree, (node) => node.type === 'FlatList');

  render();
  render();
  return {
    render,
    button,
    calls,
    messages,
    items: () => grid().props.data,
    selectSaved(id) {
      const item = grid().props.data.find((photo) => photo.key === `saved-${id}`);
      grid().props.renderItem({ item }).props.onPress();
      render();
    },
    async replaceWith(asset) {
      pickedAssets = [asset];
      await button('Trocar imagem selecionada').props.onPress();
      render();
    },
    updatesAfterUnmount: () => updatesAfterUnmount,
    async add(assets) {
      pickedAssets = assets;
      const addItem = grid().props.data.find((item) => item.kind === 'add');
      await grid().props.renderItem({ item: addItem }).props.onPress();
      render();
    },
    setUpload(callback) { upload = callback; },
    setReplacement(callback) { replacement = callback; },
    setDeletion(callback) { deletion = callback; },
    setConfirmation(callback) { confirmation = callback; },
    setCategory(category) {
      props = { ...props, category, visible: !!category };
      render();
      render();
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
      unmounted = true;
    },
  };
}

const images = [
  { uri: 'file://primeira', base64: 'aA==' },
  { uri: 'file://segunda', base64: 'aA==' },
];

test('pop-up bloqueia lote duplicado e mantém apenas imagens não salvas após falha parcial', async (t) => {
  const h = popupHarness();
  t.after(() => h.unmount());
  await h.add(images);
  const pending = deferred();
  let attempts = 0;
  h.setUpload(async () => {
    attempts += 1;
    if (attempts === 1) return pending.promise;
    throw new Error('Falha controlada no segundo arquivo.');
  });

  const first = h.button('Salvar mídias').props.onPress();
  const repeated = h.button('Salvar mídias').props.onPress();
  assert.equal(h.calls.filter(([type]) => type === 'upload').length, 1);
  pending.resolve();
  await first;
  await repeated;
  h.render();

  const remaining = h.items().filter((item) => item.kind === 'pending');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].uri, images[1].uri);
  assert.match(h.messages[0][0], /Não foi possível salvar/);

  h.setUpload(async () => {});
  await h.button('Salvar mídias').props.onPress();
  h.render();
  assert.equal(h.items().filter((item) => item.kind === 'pending').length, 0);
  assert.deepEqual(h.calls.filter(([type]) => type === 'upload').map(([, input]) => input.asset.uri), [
    images[0].uri, images[1].uri, images[1].uri,
  ]);
});

test('desmontar o pop-up durante upload interrompe o lote e impede atualizações ou sucesso tardios', async () => {
  const h = popupHarness();
  await h.add(images);
  const pending = deferred();
  h.setUpload(() => pending.promise);

  const saving = h.button('Salvar mídias').props.onPress();
  h.unmount();
  pending.resolve();
  await saving;

  assert.equal(h.calls.filter(([type]) => type === 'upload').length, 1);
  assert.equal(h.messages.length, 0);
  assert.equal(h.updatesAfterUnmount(), 0);
});

test('confirmação de descarte da categoria anterior não fecha a categoria atual', async (t) => {
  const h = popupHarness();
  t.after(() => h.unmount());
  await h.add(images.slice(0, 1));
  const confirmation = deferred();
  h.setConfirmation(() => confirmation.promise);

  const closing = h.button('Fechar mídias').props.onPress();
  h.setCategory({ id: 'categoria-b', categoria: 'Categoria B' });
  confirmation.resolve(true);
  await closing;

  assert.equal(h.calls.filter(([type]) => type === 'close').length, 0);
});

const savedPhoto = { id: 'foto-salva', imagem_url: 'categoria/foto-antiga.png', imageUrl: 'https://imagem.example/anterior.png' };

test('troca exibe prévia e publica somente ao salvar, mantendo ID, categoria e caminho esperado', async (t) => {
  const h = popupHarness({ rows: [savedPhoto] });
  t.after(() => h.unmount());
  assert.equal(h.button('Trocar imagem selecionada').props.disabled, true);
  h.selectSaved(savedPhoto.id);
  await h.replaceWith(images[0]);
  assert.equal(h.calls.length, 0);
  assert.equal(h.items().find(item => item.kind === 'saved').uri, images[0].uri);
  assert.equal(h.button('Apagar imagens selecionadas').props.disabled, true);
  await h.button('Salvar mídias').props.onPress();
  h.render();
  const calls = h.calls.filter(([type]) => type === 'replace');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].mediaId, savedPhoto.id);
  assert.equal(calls[0][1].categoryId, 'categoria-a');
  assert.equal(calls[0][1].expectedPath, savedPhoto.imagem_url);
  assert.equal(calls[0][1].asset, images[0]);
  assert.equal(h.button('Cancelar troca da imagem'), null);
});

test('cancelar troca restaura a prévia antiga sem escrever e falha preserva a nova seleção', async (t) => {
  const h = popupHarness({ rows: [savedPhoto] });
  t.after(() => h.unmount());
  h.selectSaved(savedPhoto.id);
  await h.replaceWith(images[0]);
  h.button('Cancelar troca da imagem').props.onPress();
  h.render();
  assert.equal(h.items().find(item => item.kind === 'saved').uri, savedPhoto.imageUrl);
  assert.equal(h.calls.length, 0);
  await h.replaceWith(images[1]);
  h.setReplacement(async () => { throw new Error('Falha controlada na troca.'); });
  await h.button('Salvar mídias').props.onPress();
  h.render();
  assert.equal(h.items().find(item => item.kind === 'saved').uri, images[1].uri);
  assert.ok(h.button('Cancelar troca da imagem'));
  assert.match(h.messages[0][0], /Não foi possível salvar/);
});

test('troca bloqueia envio duplicado e não atualiza tela desmontada', async () => {
  const h = popupHarness({ rows: [savedPhoto] });
  h.selectSaved(savedPhoto.id);
  await h.replaceWith(images[0]);
  const pending = deferred();
  h.setReplacement(() => pending.promise);
  const saving = h.button('Salvar mídias').props.onPress();
  await h.button('Salvar mídias').props.onPress();
  assert.equal(h.calls.filter(([type]) => type === 'replace').length, 1);
  h.unmount();
  pending.resolve();
  await saving;
  assert.equal(h.messages.length, 0);
  assert.equal(h.updatesAfterUnmount(), 0);
});

test('carrossel prepara a categoria somente ao salvar; falha preserva a seleção', async (t) => {
  let preparations = 0;
  const h = popupHarness({ props: { embedded: true, beforeUpload: async () => {
    preparations += 1;
    throw new Error('Falha controlada ao preparar.');
  } } });
  t.after(() => h.unmount());
  await h.add(images);
  assert.equal(preparations, 0);
  await h.button('Salvar mídias').props.onPress();
  h.render();
  assert.equal(preparations, 1);
  assert.equal(h.calls.filter(([type]) => type === 'upload').length, 0);
  assert.equal(h.items().filter(item => item.kind === 'pending').length, 2);
  assert.match(h.messages[0][0], /preparar/);
});

test('exclusão confirmada limpa seleção e informa quando um arquivo precisa ser preservado', async (t) => {
  const h = popupHarness({ rows: [savedPhoto] });
  t.after(() => h.unmount());
  h.selectSaved(savedPhoto.id);
  h.setDeletion(async () => ({ deleted: true, filePreserved: true }));
  await h.button('Apagar imagens selecionadas').props.onPress();
  h.render();
  assert.equal(h.calls.filter(([type]) => type === 'delete').length, 1);
  assert.equal(h.calls.find(([type]) => type === 'delete')[1].expectedPath, savedPhoto.imagem_url);
  assert.equal(h.button('Apagar imagens selecionadas').props.disabled, true);
  assert.equal(h.messages[0][0], 'Imagens retiradas da categoria');
  assert.match(h.messages[0][1], /mantidos no armazenamento/);
});
