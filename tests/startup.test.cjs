const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');

// Executa App.jsx real, simulando apenas fontes, splash e a fronteira de navegação.
function startup() {
  const filename = path.join(__dirname, '..', 'App.jsx');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: [
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  const calls = [];
  let fonts = [false, null];
  let callback;
  let dependencies;
  const NavigationContainer = () => null;
  const StackN = () => null;
  const mocks = {
    '@react-navigation/native': { NavigationContainer },
    '@expo-google-fonts/league-spartan': {
      useFonts: () => fonts,
      LeagueSpartan_500Medium: 'fonte-medium',
      LeagueSpartan_400Regular: 'fonte-regular',
      LeagueSpartan_700Bold: 'fonte-bold',
    },
    'expo-splash-screen': {
      preventAutoHideAsync: async () => { calls.push('preventAutoHideAsync'); },
      hideAsync: async () => { calls.push('hideAsync'); },
    },
    react: {
      ...React,
      useCallback(next, nextDependencies) {
        if (!dependencies || nextDependencies.some((value, index) => !Object.is(value, dependencies[index]))) {
          callback = next;
          dependencies = [...nextDependencies];
        }
        return callback;
      },
      useEffect() {},
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    './src/Navigation/StackN': { __esModule: true, default: StackN },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in mocks, `Dependência não simulada: ${name}`);
      return mocks[name];
    },
  }, { filename });

  return {
    calls,
    NavigationContainer,
    StackN,
    render(nextFonts = fonts) {
      fonts = nextFonts;
      return exports.default();
    },
  };
}

async function assertNavigationReady(app, tree) {
  assert.ok(React.isValidElement(tree), 'A abertura deve montar a navegação.');
  assert.equal(tree.type, app.NavigationContainer);
  assert.equal(tree.props.children.type, app.StackN);
  assert.deepEqual(app.calls, ['preventAutoHideAsync'], 'O splash deve aguardar a navegação ficar pronta.');
  await tree.props.onReady();
  assert.deepEqual(app.calls, ['preventAutoHideAsync', 'hideAsync']);
}

test('abertura aguarda fontes pendentes sem montar navegação nem esconder o splash', () => {
  const app = startup();
  assert.equal(app.render([false, null]), null);
  assert.deepEqual(app.calls, ['preventAutoHideAsync']);
});

test('abertura prossegue após carregar as fontes e esconde splash quando a navegação fica pronta', async () => {
  const app = startup();
  assert.equal(app.render([false, null]), null);
  await assertNavigationReady(app, app.render([true, null]));
});

test('erro nas fontes libera a navegação e encerra o splash, sem bloquear a abertura', async () => {
  const app = startup();
  assert.equal(app.render([false, null]), null);
  await assertNavigationReady(app, app.render([false, new Error('Falha simulada ao carregar a fonte')]));
});
