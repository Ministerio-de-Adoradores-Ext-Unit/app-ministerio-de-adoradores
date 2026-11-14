import { supabase } from "../lib/supabase";
import { getAuthenticatedUser, signInWithEmail } from "./supabaseAuth";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para alterar a senha.";

function passwordErrorMessage(error) {
  if (error?.status === 401 || ["session_not_found", "refresh_token_not_found", "bad_jwt"].includes(error?.code)) {
    return SESSION_EXPIRED;
  }
  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  }
  if (error?.code === "weak_password") {
    return "A nova senha não atende às exigências de segurança. Escolha outra senha.";
  }
  if (error?.code === "same_password") {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (error?.code === "reauthentication_needed" || error?.code === "reauthentication_not_valid") {
    return "Entre novamente na sua conta antes de alterar a senha.";
  }
  return "Não foi possível alterar a senha. Tente novamente.";
}

export async function changePassword({ currentPassword, newPassword, confirmation } = {}) {
  if ([currentPassword, newPassword, confirmation].some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error("Preencha todos os campos para continuar.");
  }
  if (newPassword.length < 6) {
    throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
  }
  if (newPassword !== confirmation) {
    throw new Error("A nova senha e a confirmação não coincidem.");
  }

  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    throw new Error("Não foi possível verificar sua sessão. Entre novamente.");
  }
  if (!user?.id || !user.email) throw new Error(SESSION_EXPIRED);

  let verifiedUser;
  try {
    // Confere a senha atual mesmo se a exigência de current_password estiver desativada no servidor.
    verifiedUser = await signInWithEmail({ email: user.email, password: currentPassword });
  } catch (error) {
    if (error?.message === "E-mail ou senha inválidos.") {
      throw new Error("A senha atual está incorreta.");
    }
    if (error?.message === "Muitas tentativas de acesso. Aguarde um pouco e tente novamente.") {
      throw new Error("Muitas tentativas. Aguarde um pouco e tente novamente.");
    }
    throw new Error("Não foi possível confirmar a senha atual. Tente novamente.");
  }
  if (verifiedUser?.id !== user.id) throw new Error(SESSION_EXPIRED);

  let response;
  try {
    // Preserva as senhas exatamente como foram digitadas, inclusive espaços.
    response = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });
  } catch (error) {
    throw new Error(passwordErrorMessage(error));
  }
  if (response?.error) throw new Error(passwordErrorMessage(response.error));
  if (response?.data?.user?.id !== user.id) {
    throw new Error("Não foi possível confirmar a alteração da senha. Entre novamente.");
  }
  return response.data.user;
}
