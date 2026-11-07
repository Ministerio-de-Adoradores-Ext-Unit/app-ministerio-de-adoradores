const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Executa o utilitário real; simula somente os avisos oferecidos por cada plataforma.
function setup(platform) {
  const filename = path.join(__dirname, '..', 'src/utils/showMessage.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const calls = [];
  const exports = {};
  const context = {
    exports,
    require(name) {
      assert.equal(name, 'react-native');
      return {
        Platform: { OS: platform },
        Alert: { alert: (...args) => { calls.push(['native', ...args]); } },
      };
    },
  };
  // Android e iOS não possuem o alert global do navegador.
  if (platform === 'web') context.alert = (...args) => { calls.push(['browser', ...args]); };
  vm.runInNewContext(code, context, { filename });
  return { showMessage: exports.default, calls };
}

test('navegador apresenta título e corpo dos avisos, incluindo validações e erros', () => {
  const { showMessage, calls } = setup('web');
  const messages = [
    ['Pedido enviado', 'Seu pedido de oração foi enviado com sucesso.'],
    ['Não foi possível enviar', 'Preencha seu nome e o pedido de oração.'],
    ['Falha na conexão', 'Tente novamente.\nOs dados não foram enviados.'],
  ];
  for (const [title, message] of messages) showMessage(title, message);
  assert.deepEqual(calls, messages.map(([title, message]) => ['browser', `${title}\n\n${message}`]));
});

for (const platform of ['android', 'ios']) {
  test(`${platform} preserva o aviso nativo sem depender de APIs do navegador`, () => {
    const { showMessage, calls } = setup(platform);
    showMessage('Inscrição realizada', 'Sua inscrição foi enviada com sucesso.');
    assert.deepEqual(calls, [['native', 'Inscrição realizada', 'Sua inscrição foi enviada com sucesso.']]);
  });
}
