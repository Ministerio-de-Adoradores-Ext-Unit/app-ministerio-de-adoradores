import { supabase } from "../lib/supabase";
import { getAuthenticatedUser } from "./supabaseAuth";
import { resolvePrivateImageUrl } from "./supabaseData";
import { prepareImageAsset, createImageObjectName } from "../utils/imageUploadData";

const TABLE = "donation_campaigns";
const BUCKET = "media-images";
const COLUMNS = "id, title, subtitle, description, image_path, asset_key, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET_KEYS = new Set(["agasalho-1", "agasalho-2"]);
const SAVE_UNCERTAIN = "Não foi possível confirmar se a campanha foi salva. Reabra a lista e confira antes de reenviar.";
const DELETE_UNCERTAIN = "Não foi possível confirmar a exclusão da campanha. Reabra a lista antes de tentar novamente.";
const CONFLICT = "A campanha foi alterada ou excluída em outro acesso. Reabra a lista antes de tentar novamente.";
const SAVE_FAILED = "Não foi possível salvar a campanha. Verifique seu acesso e tente novamente.";

function operationError(message, cleanupPending = false) {
  const error = new Error(message);
  error.cleanupPending = cleanupPending;
  return error;
}

function canonicalId(id) {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Selecione uma campanha válida.");
  return id.toLowerCase();
}

function newCampaignId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID().toLowerCase();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (part) => {
    const random = Math.floor(Math.random() * 16);
    return (part === "x" ? random : (random & 3) | 8).toString(16);
  });
}

function ownedImagePath(value, id) {
  return typeof value === "string" && UUID.test(id || "")
    && new RegExp(`^donations/${id}/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp|gif|heic|heif|bmp)$`).test(value);
}

function validSource(campaign) {
  return (campaign.asset_key === null && ownedImagePath(campaign.image_path, campaign.id))
    || (campaign.image_path === null && ASSET_KEYS.has(campaign.asset_key));
}

async function requireUser() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    throw new Error("Não foi possível verificar sua sessão. Entre novamente.");
  }
  if (!UUID.test(user?.id || "")) throw new Error("Entre com a conta administrativa para gerenciar as campanhas.");
}

async function campaignWithImage(campaign) {
  let imageUrl = null;
  if (ownedImagePath(campaign.image_path, campaign.id)) {
    try {
      imageUrl = await resolvePrivateImageUrl(campaign.image_path, BUCKET);
    } catch {
      // Uma foto indisponível não oculta as outras campanhas.
    }
  }
  return { ...campaign, imageUrl };
}

export async function listDonationCampaigns() {
  let result;
  try {
    result = await supabase.from(TABLE).select(COLUMNS)
      .order("created_at", { ascending: false }).order("id", { ascending: false });
  } catch {
    throw new Error("Não foi possível carregar as campanhas. Tente novamente.");
  }
  if (result?.error || result?.status >= 400 || !Array.isArray(result?.data)) {
    throw new Error("Não foi possível carregar as campanhas. Tente novamente.");
  }
  return Promise.all(result.data.map(campaignWithImage));
}

async function readCampaign(id) {
  const result = await supabase.from(TABLE).select(COLUMNS).eq("id", id).maybeSingle();
  if (!result || result.error || result.status >= 400 || !("data" in result)) throw new Error();
  if (result.data !== null && (result.data?.id !== id || !validSource(result.data))) throw new Error();
  return result.data;
}

function withSnapshot(query, previous) {
  let filtered = query.eq("id", previous.id).eq("title", previous.title);
  for (const column of ["image_path", "asset_key"]) {
    filtered = previous[column] === null ? filtered.is(column, null) : filtered.eq(column, previous[column]);
  }
  return filtered;
}

function matches(campaign, id, values) {
  return campaign?.id === id && validSource(campaign)
    && Object.entries(values).every(([column, value]) => campaign[column] === value);
}

function rejected(result) {
  const code = result?.error?.code || "";
  // Falha de conexão/resolução da transação pode chegar depois do commit.
  if (/^08/.test(code) || code === "40003") return false;
  if (result?.status >= 400 && result.status < 500) return true;
  return /^[0-9A-Z]{5}$/.test(code) || /^PGRST\d+$/.test(code);
}

// Retorna o estado da limpeza sem apagar um caminho externo, de outra campanha ou ainda usado.
async function cleanupImage(path, id) {
  if (!path) return "none";
  if (!ownedImagePath(path, id)) return "pending";
  try {
    const references = await supabase.from(TABLE).select("id").eq("image_path", path).limit(1);
    if (references?.error || references?.status >= 400 || !Array.isArray(references?.data)) return "pending";
    if (references.data.length) return "referenced";
    const removed = await supabase.storage.from(BUCKET).remove([path]);
    return removed && !removed.error && !(removed.status >= 400) && Array.isArray(removed.data) ? "removed" : "pending";
  } catch {
    return "pending";
  }
}

async function failSave(path, id, message = SAVE_FAILED) {
  const cleanup = await cleanupImage(path, id);
  if (cleanup === "referenced") throw operationError(SAVE_UNCERTAIN);
  if (cleanup === "pending") {
    throw operationError(`${message} A limpeza da nova imagem ficou pendente; peça à responsável pelo banco para conferir o armazenamento.`, true);
  }
  throw operationError(message);
}

export async function saveDonationCampaign({ id, title, imageAsset } = {}) {
  const editing = id !== undefined && id !== null;
  const campaignId = editing ? canonicalId(id) : newCampaignId();
  if (typeof title !== "string" || !title.trim()) throw new Error("Informe o título da campanha.");
  if (!editing && imageAsset == null) throw new Error("Selecione uma imagem para a campanha.");
  const image = imageAsset == null ? null : await prepareImageAsset(imageAsset);
  await requireUser();

  let previous = null;
  if (editing) {
    try {
      previous = await readCampaign(campaignId);
    } catch {
      throw new Error("Não foi possível carregar a campanha para edição. Reabra a lista.");
    }
    if (!previous) throw new Error(CONFLICT);
  }

  let newPath = null;
  const values = { title: title.trim() };
  if (!editing) Object.assign(values, { subtitle: "", description: "", image_path: null, asset_key: null });
  if (image) {
    const path = `donations/${campaignId}/${createImageObjectName()}.${image.extension}`;
    let uploaded;
    try {
      uploaded = await supabase.storage.from(BUCKET).upload(path, image.bytes, { contentType: image.mime, upsert: false });
    } catch {
      throw operationError("Não foi possível confirmar o envio da imagem. Confira o armazenamento antes de reenviar.", true);
    }
    if (uploaded?.error) {
      const status = Number(uploaded.error.statusCode || uploaded.error.status || uploaded.status);
      if (!(status >= 400 && status < 500)) {
        throw operationError("Não foi possível confirmar o envio da imagem. Confira o armazenamento antes de reenviar.", true);
      }
      throw new Error("Não foi possível enviar a imagem da campanha. Verifique seu acesso e tente novamente.");
    }
    if (uploaded?.data?.path !== path) return failSave(path, campaignId);
    newPath = path;
    Object.assign(values, { image_path: path, asset_key: null });
  }
  const expected = editing
    ? { title: values.title, image_path: newPath || previous.image_path, asset_key: image ? null : previous.asset_key }
    : values;

  let result;
  try {
    const query = editing
      ? withSnapshot(supabase.from(TABLE).update(values), previous)
      : supabase.from(TABLE).insert({ id: campaignId, ...values });
    result = await query.select(COLUMNS).maybeSingle();
  } catch {
    // A gravação pode ter terminado antes de a conexão cair.
  }

  let saved = !result?.error && !(result?.status >= 400) && matches(result?.data, campaignId, expected)
    ? result.data : null;
  if (!saved) {
    if (rejected(result)) return failSave(newPath, campaignId, result?.error?.code === "PGRST116" ? CONFLICT : SAVE_FAILED);
    try {
      saved = await readCampaign(campaignId);
    } catch {
      throw operationError(SAVE_UNCERTAIN);
    }
    if (!matches(saved, campaignId, expected)) {
      return failSave(newPath, campaignId, editing ? CONFLICT : SAVE_FAILED);
    }
  }

  let cleanupPending = false;
  if (newPath && previous?.image_path && previous.image_path !== newPath) {
    cleanupPending = await cleanupImage(previous.image_path, campaignId) === "pending";
  }
  return { campaign: await campaignWithImage(saved), cleanupPending };
}

export async function deleteDonationCampaign(id) {
  const campaignId = canonicalId(id);
  await requireUser();
  let previous;
  try {
    previous = await readCampaign(campaignId);
  } catch {
    throw new Error("Não foi possível carregar a campanha para exclusão. Reabra a lista.");
  }
  if (!previous) return { cleanupPending: false };

  let result;
  try {
    result = await withSnapshot(supabase.from(TABLE).delete(), previous).select(COLUMNS).maybeSingle();
  } catch {
    // Confirma a ausência antes de remover o arquivo da campanha.
  }
  const snapshot = { title: previous.title, image_path: previous.image_path, asset_key: previous.asset_key };
  if (result?.error || result?.status >= 400 || !matches(result?.data, campaignId, snapshot)) {
    if (rejected(result)) throw new Error("Não foi possível apagar a campanha. Reabra a lista e tente novamente.");
    let current;
    try {
      current = await readCampaign(campaignId);
    } catch {
      throw new Error(DELETE_UNCERTAIN);
    }
    if (current) throw new Error(CONFLICT);
  }
  const cleanupPending = await cleanupImage(previous.image_path, campaignId) === "pending";
  return { cleanupPending };
}
