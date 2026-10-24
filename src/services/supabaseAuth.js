import { supabase } from "../lib/supabase";

function loginErrorMessage(error) {
  if (error?.code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return "Muitas tentativas de acesso. Aguarde um pouco e tente novamente.";
  }
  if (error?.code === "invalid_credentials" || error?.status === 400 || error?.status === 401) {
    return "E-mail ou senha inválidos.";
  }
  return "Não foi possível conectar ao serviço de autenticação. Tente novamente.";
}

export async function signInWithEmail({ email, password }) {
  if (!email?.trim() || typeof password !== "string" || !password.trim()) {
    throw new Error("Preencha o e-mail e a senha.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Informe um endereço de e-mail válido.");
  }

  let response;
  try {
    // A senha é enviada exatamente como digitada, sem trim ou normalização.
    response = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  } catch (error) {
    throw new Error(loginErrorMessage(error));
  }
  const { data, error } = response ?? {};
  if (error) throw new Error(loginErrorMessage(error));

  if (!data?.user?.id || !data?.session?.access_token || data.session.user?.id !== data.user.id) {
    if (data?.session) {
      // Descarta somente a sessão local recém-aberta, nunca a de outros dispositivos.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // O acesso permanece bloqueado, inclusive se a limpeza falhar por rede.
      }
    }
    throw new Error("Não foi possível iniciar a sessão. Tente novamente.");
  }
  return data.user;
}

export async function getAuthenticatedUser() {
  let response;
  try {
    response = await supabase.auth.getUser();
  } catch (error) {
    if (error?.name === "AuthSessionMissingError" || error?.status === 401) return null;
    throw new Error("Não foi possível verificar sua sessão. Tente entrar novamente.");
  }
  const { data, error } = response ?? {};
  if (error?.name === "AuthSessionMissingError" || error?.status === 401) return null;
  if (error) throw new Error("Não foi possível verificar sua sessão. Tente entrar novamente.");

  // Confirma a sessão no Auth; as permissões dos dados continuam a cargo do RLS.
  return data?.user?.id ? data.user : null;
}
