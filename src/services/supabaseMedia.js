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

async function noMediaReferences(path) {
  try {
    const result = await supabase.from("media").select("id, imagem_url", { count: "exact" });
    if (!result || result.error || result.status >= 400 || !Array.isArray(result.data)
      || !Number.isInteger(result.count) || result.data.length !== result.count) return false;
    return result.data.every((row) => storedObjectPath(row.imagem_url) !== path);
  } catch {
    return false;
  }
}

async function cleanPreviousImage(value, userId, categoryId) {
  try {
    const path = storedObjectPath(value);
    // URLs antigas, arquivos alheios ou listas incompletas ficam preservados.
    if (path !== value || !path.startsWith(`${userId}/${categoryId}/`)) return false;
    if (!await noMediaReferences(path)) return false;
    return await removeNewUpload(supabase.storage.from(BUCKET), path);
  } catch {
    // A troca já foi confirmada. Falha na limpeza não desfaz a imagem publicada.
    return false;
  }
}

async function readMedia(categoryId, mediaId) {
  const result = await supabase.from("media").select(MEDIA_COLUMNS)
    .eq("id", mediaId).eq("category_id", categoryId).maybeSingle();
  if (!result || result.error || result.status >= 400 || !("data" in result)) throw new Error();
  if (result.data !== null && (result.data?.id !== mediaId || result.data?.category_id !== categoryId)) throw new Error();
  return result.data;
}

export async function replaceMedia({ categoryId, mediaId, expectedPath, asset } = {}) {
  if (!UUID.test(categoryId || "") || !UUID.test(mediaId || "")
    || typeof expectedPath !== "string" || !expectedPath.trim()) {
    throw new Error("Selecione uma imagem salva desta categoria para trocar.");
  }
  const { bytes, mime, extension } = await prepareImageAsset(asset);
  const user = await requireUser();
  let previous;
  try {
    previous = await readMedia(categoryId, mediaId);
  } catch {
    throw new Error("Não foi possível conferir a imagem atual. Reabra a categoria antes de trocar.");
  }
  if (!previous || previous.imagem_url !== expectedPath) {
    throw new Error("Esta imagem foi alterada ou removida. Reabra a categoria antes de trocar.");
  }

  const storage = supabase.storage.from(BUCKET);
  const path = `${user.id}/${categoryId}/${createImageObjectName()}.${extension}`;
  let uploaded;
  try {
    uploaded = await storage.upload(path, bytes, { contentType: mime, upsert: false });
  } catch {
    throw new Error("Não foi possível confirmar o envio da nova imagem. A imagem anterior foi preservada; confira a lista antes de reenviar.");
  }
  if (uploaded?.error) throw new Error("Não foi possível enviar a nova imagem. A imagem anterior foi preservada.");
  if (uploaded?.data?.path !== path) {
    const cleaned = await removeNewUpload(storage, path);
    throw new Error(cleaned
      ? "Não foi possível confirmar o arquivo enviado. A imagem anterior foi preservada."
      : "Não foi possível confirmar nem limpar a nova imagem. Peça à responsável pelo banco para conferir o armazenamento.");
  }

  let result;
  try {
    result = await supabase.from("media").update({ imagem_url: path })
      .eq("id", mediaId).eq("category_id", categoryId).eq("imagem_url", expectedPath)
      .select(MEDIA_COLUMNS).maybeSingle();
  } catch {
    // A resposta pode ter se perdido depois da gravação; consulta antes de compensar.
  }
  const matches = (row) => row?.id === mediaId && row?.category_id === categoryId && row?.imagem_url === path;
  let saved = !result?.error && !(result?.status >= 400) && matches(result?.data) ? result.data : null;
  if (!saved) {
    let confirmed;
    try {
      confirmed = await readMedia(categoryId, mediaId);
    } catch {
      throw new Error(SAVE_UNCERTAIN);
    }
    if (matches(confirmed)) saved = confirmed;
    else {
      // Só compensa um arquivo sem referências confirmadas; nunca a foto anterior.
      if (!await noMediaReferences(path)) throw new Error(SAVE_UNCERTAIN);
      if (!await removeNewUpload(storage, path)) {
        throw new Error("Não foi possível trocar a imagem nem limpar o arquivo novo. A imagem anterior não foi apagada; confira o armazenamento antes de reenviar.");
      }
      throw new Error("Não foi possível trocar a imagem. Ela pode ter sido alterada em outro aparelho; reabra a categoria e tente novamente.");
    }
  }
  await cleanPreviousImage(expectedPath, user.id, categoryId);
  return saved;
}

export async function deleteMedia({ categoryId, mediaId, expectedPath } = {}) {
  if (!UUID.test(categoryId || "") || !UUID.test(mediaId || "")
    || (expectedPath !== undefined && typeof expectedPath !== "string")) {
    throw new Error("Selecione uma imagem válida desta categoria.");
  }
  const user = await requireUser();
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
  if (expectedPath !== undefined && row.imagem_url !== expectedPath) {
    throw new Error("Esta imagem foi alterada em outro aparelho. Reabra a categoria antes de apagar.");
  }

  const path = storedObjectPath(row.imagem_url);
  let deleted = false;
  try {
    const { data, error, status } = await supabase.from("media")
      .delete()
      .eq("id", mediaId)
      .eq("category_id", categoryId)
      .eq("imagem_url", row.imagem_url)
      .select("id");
    deleted = !error && !(status >= 400) && data?.length === 1 && data[0].id === mediaId;
  } catch {
    // Confirma abaixo: a resposta pode ter se perdido depois do DELETE.
  }
  if (!deleted) {
    let confirmed;
    try {
      confirmed = await readMedia(categoryId, mediaId);
    } catch {
      throw new Error("Não foi possível confirmar a exclusão. Reabra a categoria antes de tentar novamente; nenhum arquivo foi apagado.");
    }
    if (confirmed !== null) {
      throw new Error("Não foi possível remover esta imagem. Ela pode ter sido alterada em outro aparelho; reabra a categoria e tente novamente.");
    }
  }
  const cleaned = !path || await cleanPreviousImage(row.imagem_url, user.id, categoryId);
  return { deleted: true, filePreserved: !cleaned };
}
