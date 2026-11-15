# Ministério de Adoradores

Aplicativo em Expo/React Native com integração ao Supabase.

## Baixar e instalar no Android

[**Baixar APK — Ministério de Adoradores 1.0.0**](https://github.com/Ministerio-de-Adoradores-Ext-Unit/app-ministerio-de-adoradores/releases/download/v1.0.0-teste.1/Ministerio-de-Adoradores-1.0.0.apk)

Versão de testes para Android 7.0 ou posterior.

1. Abra o link acima no celular e baixe o arquivo `.apk`.
2. Abra o arquivo e, se o Android solicitar, autorize a instalação pelo aplicativo usado para baixar.
3. Toque em **Instalar** e abra o app.

Não precisa de Expo Go, QR Code ou computador ligado. O acesso aos dados e os
envios precisam de internet. A área administrativa usa a conta existente da equipe.

[Ver versões e notas de teste](https://github.com/Ministerio-de-Adoradores-Ext-Unit/app-ministerio-de-adoradores/releases).

## Executar

Testado com Node.js 24.15.0. Para o SDK 58, use Node.js 24 a partir de 24.3
ou Node.js 22 a partir de 22.13; versões antigas usadas com o SDK 54 podem
precisar de atualização. Atualize também o Expo Go do celular para SDK 58.

Na raiz do projeto:

```sh
npm ci
npx expo start --clear
```

Abra pelo Expo Go compatível com o SDK 58 ou use `npm run web` para o navegador.
O `--clear` evita reaproveitar o código antigo após atualizar o projeto.

O Expo Go é instalado e atualizado no celular pela loja. O pacote `expo` deste
projeto define o SDK; as duas versões precisam ser compatíveis. No Android, a
página oficial da versão atual está em https://expo.dev/go?sdkVersion=58&platform=android&device=true.

Se a rede local impedir o acesso ao computador, use:

```sh
npm run start:go
```

Esse comando usa o túnel ngrok explicitamente. No SDK 58, o túnel padrão exige
login em uma conta Expo. Mantenha o terminal aberto e escaneie o QR da execução
atual; um QR antigo deixa de funcionar quando o servidor ou o túnel é encerrado.

O APK de testes disponível em Releases foi compilado separadamente a partir da
configuração Expo SDK 58. As pastas nativas versionadas continuam na versão
anterior; para novas compilações, gere o Android compatível em uma cópia separada
do projeto, preservando as configurações nativas da equipe.

## Configuração compartilhada

O arquivo `.env` do repositório já contém a URL e a chave **publicável** do projeto.
O Expo carrega esses valores automaticamente: não é necessário criar nem preencher
`.env.local` para utilizar o projeto padrão da equipe.

Esses dois valores identificam o aplicativo público; não são senha de administrador
nem senha do banco. Nunca adicione senha, `service_role`, chave `sb_secret_` ou
tokens de sessão a arquivos versionados. O acesso aos dados depende das políticas
RLS e, nas operações administrativas, da autenticação.

Para usar outro projeto, opcionalmente copie `.env.example` para `.env.local` e
preencha os dois valores. Esse arquivo tem prioridade sobre o padrão e continua
fora do Git. Após mudar de configuração, reinicie o Expo e recarregue o aplicativo.

O projeto no Supabase precisa estar ativo. Se estiver pausado, retome-o no painel;
nenhuma configuração local consegue carregar dados de um banco pausado.

## Login administrativo

O caminho Perfil → Login autentica uma conta já existente no Supabase Auth.
O aplicativo verifica a sessão antes de abrir as rotas administrativas e volta ao
login quando ela deixa de ser válida. Não é necessário digitar a senha novamente
para reutilizar uma sessão válida salva pelo SDK.

O administrador entra com a conta já configurada no Supabase Auth. A tela
contém somente os campos de e-mail e senha e o botão Entrar; não oferece cadastro
de novas contas pelo aplicativo.

O cadastro público foi desativado no Supabase Auth com autorização da equipe:
a API não deve aceitar novas inscrições de usuários. A conta administrativa
existente continua entrando normalmente. As políticas RLS das tabelas foram
preservadas e permitem operações administrativas a usuários autenticados;
somente a responsável pelo projeto deve criar outras contas no painel.

## Conexão das novas telas administrativas

Em Mídia, as categorias e fotos vêm do Supabase. O pop-up envia as imagens ao
bucket privado `media-images`, grava o caminho e o ID da categoria em `media`
e recarrega os registros depois de salvar ou apagar. A área pública usa os mesmos
registros. Imagens de até 10 MB são aceitas; falhas parciais mantêm as imagens
pendentes para nova tentativa e não são anunciadas como sucesso.

Em Configurações, Salvar senha confirma a sessão, reautentica a senha atual e
aguarda a resposta do Supabase Auth antes de limpar os campos. A integração
preserva as senhas exatamente como digitadas e mantém os campos em caso de erro.

Em Gerenciar Eventos, criar e editar grava na tabela `events`; a capa escolhida
vai para o bucket privado `event-images`. As telas públicas e o Participe leem os
mesmos registros. Data e horário são salvos sem converter a seleção local para
UTC. O seletor existente continua nativo no Android/iOS e possui entrada de
data/hora no navegador. Título, data/hora e local são obrigatórios.

A pesquisa pública recebe o texto do cabeçalho e filtra os eventos, categorias e
opções de inscrição já carregados. Em Doações, filtra somente as campanhas locais;
não consulta uma tabela de campanhas inexistente nem interfere no pedido de oração.

A tela de campanhas de doação ainda usa o estado local criado no design.
O banco existente não tem uma tabela de campanhas nem um bucket destinado a
elas. A conexão dessa tela e dos banners públicos depende dessa estrutura ser
preparada pela responsável pelo banco; esta entrega não cria tabelas, buckets
ou políticas de acesso para campanhas.

Arquivos desta integração:

- Mídias: `src/Screens/MidiaScreen/index.jsx`, `src/Screens/MidiaScreen/PopUp/index.jsx`
  e `src/services/supabaseMedia.js`.
- Senha: `src/Screens/SettingsScreen/index.jsx` e `src/services/supabaseSettings.js`.
- Eventos: `src/Screens/ManageEventsADM/index.jsx`, `src/services/supabaseEvents.js`
  e `src/utils/imageUploadData.js` (preparação de imagem compartilhada com mídia).
- Pesquisa: `src/components/header/searchHeader.jsx`, `src/Screens/EventsAndMedia/index.jsx`,
  `src/Screens/SocialMedia/index.jsx` e `src/Screens/DonationsRequests/index.jsx`.
- Rotas e confirmações: `src/Navigation/StackN.jsx` e `src/utils/confirmAction.js`.
- Dependências e execução: `package.json`, `package-lock.json` e este `README.md`.
- Verificações: `tests/integration.test.cjs`, `tests/feedback.test.cjs`,
  `tests/media.test.cjs`, `tests/media-popup.test.cjs`, `tests/settings.test.cjs`,
  `tests/events.test.cjs` e `tests/events-screen.test.cjs`.

As versões do Expo SDK 58 da equipe foram preservadas. `expo install --check`
indica patches mais novos disponíveis; eles não foram aplicados nesta integração.

## Testes

```sh
npm test
```

Os testes verificam também o carregamento automático do `.env` sem configuração
local e a prioridade das substituições opcionais.
