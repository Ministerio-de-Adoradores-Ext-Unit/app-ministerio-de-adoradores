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

function setupConfirmation(platform, answer = false) {
  const filename = path.join(__dirname, '..', 'src/utils/confirmAction.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const calls = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    confirm: (message) => { calls.push(['browser', message]); return answer; },
    require(name) {
      assert.equal(name, 'react-native');
      return { Platform: { OS: platform }, Alert: { alert: (...args) => calls.push(['native', ...args]) } };
    },
  }, { filename });
  return { confirmAction: exports.default, calls };
}

test('confirmação no navegador respeita cancelar e confirmar, sem apagar implicitamente', async () => {
  for (const answer of [false, true]) {
    const { confirmAction, calls } = setupConfirmation('web', answer);
    assert.equal(await confirmAction('Apagar?', 'Uma imagem.', 'Apagar'), answer);
    assert.deepEqual(calls, [['browser', 'Apagar?\n\nUma imagem.']]);
  }
});

for (const platform of ['android', 'ios']) {
  test(`confirmação ${platform} só permite apagar após ação explícita e aceita dispensar`, async () => {
    for (const action of ['cancel', 'confirm', 'dismiss']) {
      const { confirmAction, calls } = setupConfirmation(platform);
      const decision = confirmAction('Apagar?', 'Uma imagem.', 'Apagar');
      const [, title, message, buttons, options] = calls[0];
      assert.equal(title, 'Apagar?');
      assert.equal(message, 'Uma imagem.');
      if (action === 'dismiss') options.onDismiss();
      else buttons[action === 'confirm' ? 1 : 0].onPress();
      assert.equal(await decision, action === 'confirm');
    }
  });
}
