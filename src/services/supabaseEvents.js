import { supabase } from "../lib/supabase";
import { getAuthenticatedUser } from "./supabaseAuth";
import { prepareImageAsset, createImageObjectName } from "../utils/imageUploadData";

const BUCKET = "event-images";
const COLUMNS = "id, titulo, data, horario, local, imagem_url, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNCONFIRMED = "Não foi possível confirmar se o evento foi salvo. Reabra a lista e confira antes de tentar novamente.";

function newEventId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (part) => {
    const random = Math.floor(Math.random() * 16);
    return (part === "x" ? random : (random & 3) | 8).toString(16);
  });
}

function eventValues(title, dateTime, local) {
  if (typeof title !== "string" || !title.trim() || typeof local !== "string" || !local.trim()) {
    throw new Error("Preencha o título e o local do evento.");
  }
  if (Object.prototype.toString.call(dateTime) !== "[object Date]" || !Number.isFinite(dateTime.getTime())) {
    throw new Error("Escolha o dia e o horário do evento.");
  }
  const year = dateTime.getFullYear();
  if (year < 1 || year > 9999) throw new Error("Escolha uma data válida para o evento.");
  const two = (value) => String(value).padStart(2, "0");
  // O banco usa date/time sem fuso: não converter a seleção local para UTC.
  return {
    titulo: title.trim(),
    data: `${String(year).padStart(4, "0")}-${two(dateTime.getMonth() + 1)}-${two(dateTime.getDate())}`,
    horario: `${two(dateTime.getHours())}:${two(dateTime.getMinutes())}:${two(dateTime.getSeconds())}`,
    local: local.trim(),
  };
}

async function requireUser() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    throw new Error("Não foi possível verificar sua sessão. Entre novamente.");
  }
  if (!UUID.test(user?.id || "")) {
    throw new Error("Entre com a conta administrativa para gerenciar os eventos.");
  }
  return user;
}

async function readEvent(id) {
  const result = await supabase.from("events").select(COLUMNS).eq("id", id).maybeSingle();
  if (!result || result.error || !("data" in result)) throw new Error();
  if (result.data !== null && result.data?.id !== id) throw new Error();
  return result.data;
}

function matches(row, id, values) {
  return row?.id === id && Object.entries(values).every(([column, value]) => (
    column === "horario" ? typeof row.horario === "string" && row.horario.slice(0, 8) === value : row[column] === value
  ));
}

function rejected(result) {
  // Respostas HTTP 4xx e erros do Postgres são rejeições, não perda da resposta de sucesso.
  if (result?.status >= 400 && result.status < 500) return true;
  const code = result?.error?.code || "";
  return /^[0-9A-Z]{5}$/.test(code) || /^PGRST\d+$/.test(code);
}

async function removeNewImage(path) {
  if (!path) return true;
  try {
    const result = await supabase.storage.from(BUCKET).remove([path]);
    return !!result && !result.error && Array.isArray(result.data);
  } catch {
    return false;
  }
}

async function failSave(newPath) {
  if (!await removeNewImage(newPath)) {
    throw new Error("Não foi possível salvar o evento nem remover a nova capa enviada. Peça à responsável pelo banco para conferir o armazenamento antes de reenviar.");
  }
  throw new Error(newPath
    ? "Não foi possível salvar o evento. A nova capa enviada foi removida; tente novamente."
    : "Não foi possível salvar o evento. Verifique seu acesso e tente novamente.");
}

async function cleanPreviousImage(value, userId, eventId) {
  // Só arquivos canônicos enviados por esta conta podem ser limpos automaticamente.
  if (typeof value !== "string" || !value.startsWith(`${userId}/${eventId}/`)
    || /[\\\x00-\x1f:?#%]/.test(value) || value.split("/").some((part) => !part || part === "." || part === "..")) return;
  try {
    const references = await supabase.from("events").select("id, imagem_url", { count: "exact" });
    if (!references || references.error || !Array.isArray(references.data)
      || !Number.isInteger(references.count) || references.data.length !== references.count) return;
    // Links legados podem ser aliases do mesmo arquivo: na dúvida, preserva.
    if (references.data.some((row) => {
      if (row.imagem_url == null) return false;
      if (typeof row.imagem_url !== "string" || /^https?:/i.test(row.imagem_url) || row.imagem_url.includes("%")) return true;
      const normalized = row.imagem_url.replace(/^\/+/, "").replace(/^event-images\//, "");
      return normalized === value;
    })) return;
    await removeNewImage(value);
  } catch {
    // A mudança no evento já foi confirmada; manter arquivo antigo é seguro.
  }
}

export async function saveEvent({ id, title, dateTime, local, imageAsset, removeImage = false, expectedImagePath } = {}) {
  const editing = id !== undefined && id !== null;
  if (editing && !UUID.test(id || "")) throw new Error("Escolha um evento válido para editar.");
  if (typeof removeImage !== "boolean" || (removeImage && (!editing || imageAsset != null))) {
    throw new Error("Escolha entre trocar ou remover a capa de um evento existente.");
  }
  if (expectedImagePath !== undefined && expectedImagePath !== null && typeof expectedImagePath !== "string") {
    throw new Error("Reabra o evento antes de alterar sua capa.");
  }
  const values = eventValues(title, dateTime, local);
  const image = imageAsset == null ? null : await prepareImageAsset(imageAsset);
  const user = await requireUser();
  const eventId = editing ? id : newEventId();

  let previous;
  if (editing) {
    try {
      previous = await readEvent(eventId);
    } catch {
      throw new Error("Não foi possível carregar o evento para edição. Reabra a lista e tente novamente.");
    }
    if (!previous) throw new Error("Este evento não está mais disponível para edição. Reabra a lista.");
    if ((image || removeImage) && expectedImagePath !== undefined
      && previous.imagem_url !== expectedImagePath) {
      throw new Error("A capa foi alterada em outro aparelho. Reabra o evento antes de trocar ou remover a imagem.");
    }
  } else {
    values.imagem_url = null;
  }
  if (removeImage) values.imagem_url = null;

  let newPath = null;
  if (image) {
    const path = `${user.id}/${eventId}/${createImageObjectName()}.${image.extension}`;
    let uploaded;
    try {
      uploaded = await supabase.storage.from(BUCKET).upload(path, image.bytes, {
        contentType: image.mime, upsert: false,
      });
    } catch {
      throw new Error("Não foi possível confirmar o envio da capa. Confira o armazenamento antes de reenviar.");
    }
    if (uploaded?.error) throw new Error("Não foi possível enviar a capa do evento. Verifique seu acesso e tente novamente.");
    if (uploaded?.data?.path !== path) {
      const cleaned = await removeNewImage(path);
      throw new Error(cleaned
        ? "Não foi possível confirmar o envio da capa. Selecione a imagem e tente novamente."
        : "Não foi possível confirmar o envio da capa nem limpar o arquivo. Peça à responsável pelo banco para conferir o armazenamento.");
    }
    newPath = path;
    values.imagem_url = path;
  }

  let result;
  try {
    let query = editing
      ? supabase.from("events").update(values).eq("id", eventId)
      : supabase.from("events").insert({ id: eventId, ...values });
    if (editing && (image || removeImage)) {
      query = previous.imagem_url == null
        ? query.is("imagem_url", null)
        : query.eq("imagem_url", previous.imagem_url);
    }
    result = await query.select(COLUMNS).single();
  } catch {
    // Uma resposta perdida pode acontecer depois de o banco já ter gravado.
  }

  if (!result?.error && !(result?.status >= 400) && matches(result?.data, eventId, values)) {
    if (editing && (image || removeImage)) await cleanPreviousImage(previous.imagem_url, user.id, eventId);
    return result.data;
  }
  if (rejected(result)) return failSave(newPath);

  let confirmed;
  try {
    confirmed = await readEvent(eventId);
  } catch {
    // Não remover a nova capa sem saber se o registro chegou a referenciá-la.
    throw new Error(UNCONFIRMED);
  }
  if (matches(confirmed, eventId, values)) {
    if (editing && (image || removeImage)) await cleanPreviousImage(previous.imagem_url, user.id, eventId);
    return confirmed;
  }
  if (newPath && confirmed?.imagem_url === newPath) throw new Error(UNCONFIRMED);
  return failSave(newPath);
}
