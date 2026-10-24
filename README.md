# Ministério de Adoradores

Aplicativo em Expo/React Native com integração ao Supabase.

## Executar

Na raiz do projeto:

```sh
npm ci
npx expo start --clear
```

Abra pelo Expo Go compatível com o SDK 54 ou use `npm run web` para o navegador.
O `--clear` evita reaproveitar o código antigo após atualizar o projeto.

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

A primeira conta deve ser criada pela responsável pelo Supabase no painel de
Authentication. O botão Cadastrar apenas orienta solicitar esse acesso; não cria
contas nem concede privilégios pelo aplicativo.

**Antes do uso público:** nas regras verificadas em 24/10/2026, o banco permite
operações administrativas a qualquer usuário autenticado e o Auth aceita cadastro
público. A responsável deve revisar essa autorização e o cadastro no Supabase.
Ocultar o botão de cadastro não restringe a API. Esta integração verifica a sessão,
mas não altera RLS, papéis, configurações de autenticação ou dados do banco.

## Testes

```sh
npm test
```

Os testes verificam também o carregamento automático do `.env` sem configuração
local e a prioridade das substituições opcionais.
