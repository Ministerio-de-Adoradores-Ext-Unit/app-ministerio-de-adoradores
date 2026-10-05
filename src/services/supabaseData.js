import { supabase } from "../lib/supabase";

const throwIfError = (error) => {
  if (error) {
    throw error;
  }
};

export async function listEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("id, titulo, data, horario, local, imagem_url, created_at")
    .order("data", { ascending: true });

  throwIfError(error);
  return data ?? [];
}

export async function listEventsWithImages() {
  const events = await listEvents();
  return withImageUrls(events, "event-images");
}

export async function createPrayerRequest({ nome, pedido }) {
  if (!nome?.trim() || !pedido?.trim()) {
    throw new Error("Preencha seu nome e o pedido de oração.");
  }
  const { error } = await supabase.from("prayer_requests").insert({
    nome: nome.trim(),
    pedido: pedido.trim(),
  });

  throwIfError(error);
}

export async function listPrayerRequests() {
  await requireSession();
  const { data, error } = await supabase
    .from("prayer_requests")
    .select("id, nome, pedido, created_at")
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data ?? [];
}

export async function createEventRegistration({
  eventId,
  nomeCompleto,
  telefone,
  email,
}) {
  if (!eventId || !nomeCompleto?.trim() || !telefone?.trim() || !email?.trim()) {
    throw new Error("Preencha os dados e selecione um evento.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Informe um endereço de e-mail válido.");
  }
  if (!/^\d{10,11}$/.test(telefone.replace(/\D/g, ""))) {
    throw new Error("Informe o telefone completo com DDD.");
  }
  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    nome_completo: nomeCompleto.trim(),
    telefone: telefone.trim(),
    email: email.trim().toLowerCase(),
  });

  throwIfError(error);
}

export async function listEventRegistrations() {
  await requireSession();
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      "id, event_id, nome_completo, telefone, email, created_at, events(titulo, data, horario, local)"
    )
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data ?? [];
}

export async function listMediaCategories() {
  const { data, error } = await supabase
    .from("media_categories")
    .select("id, categoria, created_at")
    .order("categoria", { ascending: true });

  throwIfError(error);
  return data ?? [];
}

async function requireSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError" || (!error && !data?.user)) {
    throw new Error("Entre com a conta administrativa para consultar esta lista.");
  }
  throwIfError(error);
}

function normalizeStoragePath(value, bucket) {
  const normalized = value.replace(/^\/+/, "");
  return normalized.startsWith(`${bucket}/`)
    ? normalized.slice(bucket.length + 1)
    : normalized;
}

async function resolvePrivateImageUrl(value, bucket) {
  if (!value?.trim()) return null;
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
    const prefix = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\//);
    if (url.origin !== project.origin || prefix?.[1] !== bucket) return path;
    // Renova inclusive URLs assinadas antigas salvas no banco.
    path = decodeURIComponent(url.pathname.slice(prefix[0].length));
  }

  path = normalizeStoragePath(path, bucket);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  throwIfError(error);
  return data?.signedUrl ?? null;
}

async function withImageUrls(items, bucket) {
  return Promise.all(
    items.map(async (item) => {
      try {
        const imageUrl = await resolvePrivateImageUrl(item.imagem_url, bucket);
        return { ...item, imageUrl };
      } catch {
        // Um arquivo indisponível não oculta os demais registros da tela.
        return { ...item, imageUrl: null };
      }
    })
  );
}

export async function listMediaByCategory(categoryId) {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("media")
    .select("id, category_id, imagem_url, data, created_at")
    .eq("category_id", categoryId)
    .order("data", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  throwIfError(error);
  return withImageUrls(data ?? [], "media-images");
}
