import { supabase } from "../lib/supabase";
import { getAuthenticatedUser } from "./supabaseAuth";
import { prepareImageAsset, createImageObjectName } from "../utils/imageUploadData";

const BUCKET = "media-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_COLUMNS = "id, category_id, imagem_url, data, created_at";
const SAVE_UNCERTAIN = "Não foi possível confirmar se a imagem foi salva. Reabra a lista antes de reenviar; o arquivo foi mantido para evitar perda de dados.";

async function requireUser() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    throw new Error("Não foi possível verificar sua sessão. Entre novamente.");
  }
  if (!UUID.test(user?.id || "")) {
    throw new Error("Entre com a conta administrativa para gerenciar as mídias.");
  }
  return user;
}

async function removeNewUpload(storage, path) {
  try {
    const result = await storage.remove([path]);
    return !!result && !result.error && Array.isArray(result.data);
  } catch {
    return false;
  }
}

export async function uploadMedia({ categoryId, asset } = {}) {
  if (!UUID.test(categoryId || "")) {
    throw new Error("Escolha uma categoria válida para adicionar a imagem.");
  }
  const { bytes, mime, extension } = await prepareImageAsset(asset);
  const user = await requireUser();
  const path = `${user.id}/${categoryId}/${createImageObjectName()}.${extension}`;
  const storage = supabase.storage.from(BUCKET);

  let uploaded;
  try {
    uploaded = await storage.upload(path, bytes, { contentType: mime, upsert: false });
  } catch {
    throw new Error("Não foi possível enviar a imagem. Tente novamente.");
  }
  if (uploaded?.error) {
    throw new Error("Não foi possível enviar a imagem. Verifique seu acesso e tente novamente.");
  }

  let insertAttempted = false;
  try {
    if (uploaded?.data?.path !== path) throw new Error();
    insertAttempted = true;
    const { data, error } = await supabase.from("media")
      .insert({ category_id: categoryId, imagem_url: path })
      .select(MEDIA_COLUMNS)
      .single();
    if (error || !UUID.test(data?.id || "") || data.category_id !== categoryId || data.imagem_url !== path) {
      throw new Error();
    }
    return data;
  } catch {
    if (insertAttempted) {
      // A conexão pode cair depois do commit: não remove a imagem de um registro salvo.
      let recovered;
      try {
        recovered = await supabase.from("media")
          .select(MEDIA_COLUMNS)
          .eq("category_id", categoryId)
          .eq("imagem_url", path)
          .maybeSingle();
      } catch {
        throw new Error(SAVE_UNCERTAIN);
      }
      if (!recovered || recovered.error || recovered.data === undefined) {
        throw new Error(SAVE_UNCERTAIN);
      }
      if (recovered.data !== null) {
        if (UUID.test(recovered.data.id || "") && recovered.data.category_id === categoryId && recovered.data.imagem_url === path) {
          return recovered.data;
        }
        throw new Error(SAVE_UNCERTAIN);
      }
    }
    // Compensa somente o arquivo criado nesta tentativa, nunca um arquivo existente.
    const cleaned = await removeNewUpload(storage, path);
    if (!cleaned) {
      throw new Error("Não foi possível registrar a imagem nem remover o arquivo enviado. Peça à responsável pelo banco para conferir o armazenamento antes de reenviar.");
    }
    throw new Error("Não foi possível registrar a imagem. O arquivo enviado foi removido; tente novamente.");
  }
}

function storedObjectPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
      const prefix = `/storage/v1/object/`;
      const object = url.pathname.slice(prefix.length).match(/^(?:sign|public|authenticated)\/media-images\/(.+)$/);
      if (url.origin !== project.origin || !url.pathname.startsWith(prefix) || !object) return null;
      path = decodeURIComponent(object[1]);
    } catch {
      throw new Error("Não foi possível identificar o arquivo desta imagem.");
    }
  } else {
    path = path.replace(/^\/+/, "");
    if (path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
  }
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new Error("Não foi possível identificar o arquivo desta imagem.");
  }
  if (!path || /[\\\x00-\x1f:?#]/.test(decoded) || decoded.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Não foi possível identificar o arquivo desta imagem.");
  }
  return path;
}

export async function deleteMedia({ categoryId, mediaId } = {}) {
  if (!UUID.test(categoryId || "") || !UUID.test(mediaId || "")) {
    throw new Error("Selecione uma imagem válida desta categoria.");
  }
  await requireUser();
  let row;
  try {
    const { data, error } = await supabase.from("media")
      .select("id, category_id, imagem_url")
      .eq("id", mediaId)
      .eq("category_id", categoryId)
      .single();
    if (error || data?.id !== mediaId || data?.category_id !== categoryId) throw new Error();
    row = data;
  } catch {
    throw new Error("Não foi possível localizar a imagem nesta categoria. Reabra a lista e tente novamente.");
  }

  const path = storedObjectPath(row.imagem_url);
  if (path) {
    // Mantém o registro caso o Storage recuse a remoção, permitindo tentar novamente.
    try {
      const result = await supabase.storage.from(BUCKET).remove([path]);
      if (!result || (result.error && String(result.error.statusCode || result.error.status) !== "404")) throw new Error();
    } catch {
      throw new Error("Não foi possível apagar o arquivo. A imagem continua cadastrada; tente novamente.");
    }
  }

  try {
    const { data, error } = await supabase.from("media")
      .delete()
      .eq("id", mediaId)
      .eq("category_id", categoryId)
      .select("id");
    if (error || data?.length !== 1 || data[0].id !== mediaId) throw new Error();
  } catch {
    throw new Error("Não foi possível remover o cadastro da imagem. Reabra a lista e tente novamente.");
  }
  return true;
}
