import { supabase } from "../lib/supabase";
import { getAuthenticatedUser } from "./supabaseAuth";
import { listMediaByCategory } from "./supabaseData";

export const HOME_CAROUSEL_CATEGORY = {
  id: "3a47c385-00dc-4f87-8d23-e1730933f350",
  categoria: "Carrossel da Home",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORY_ERROR = "Não foi possível preparar a categoria do carrossel. Verifique seu acesso e tente novamente.";
const CATEGORY_CONFLICT = "A categoria do carrossel está com configuração diferente. Peça à responsável pelo banco para conferir.";

export async function listHomeCarouselMedia() {
  try {
    const photos = await listMediaByCategory(HOME_CAROUSEL_CATEGORY.id);
    return photos.filter((photo) => typeof photo?.imageUrl === "string" && photo.imageUrl.trim());
  } catch {
    throw new Error("Não foi possível carregar as imagens do carrossel. Tente novamente.");
  }
}

async function readCategory() {
  const result = await supabase.from("media_categories")
    .select("id, categoria")
    .eq("id", HOME_CAROUSEL_CATEGORY.id)
    .maybeSingle();
  if (!result || result.error || !("data" in result)) throw new Error();
  if (result.data !== null && result.data?.id !== HOME_CAROUSEL_CATEGORY.id) throw new Error();
  return result.data;
}

function confirmedCategory(category) {
  if (category?.categoria !== HOME_CAROUSEL_CATEGORY.categoria) throw new Error(CATEGORY_CONFLICT);
  return category;
}

// A categoria é criada na primeira gravação de fotos pelo administrador.
export async function ensureHomeCarouselCategory() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    throw new Error("Não foi possível verificar sua sessão. Entre novamente.");
  }
  if (!UUID.test(user?.id || "")) {
    throw new Error("Entre com a conta administrativa para salvar imagens do carrossel.");
  }

  let existing;
  try {
    existing = await readCategory();
  } catch {
    throw new Error(CATEGORY_ERROR);
  }
  if (existing) return confirmedCategory(existing);

  try {
    // Em duas primeiras gravações simultâneas, não renomeia nem substitui a categoria.
    await supabase.from("media_categories").upsert({ ...HOME_CAROUSEL_CATEGORY }, {
      onConflict: "id", ignoreDuplicates: true,
    });
  } catch {
    // A resposta pode se perder depois do commit; confirma o registro abaixo.
  }

  let created;
  try {
    created = await readCategory();
  } catch {
    throw new Error(CATEGORY_ERROR);
  }
  if (!created) throw new Error(CATEGORY_ERROR);
  return confirmedCategory(created);
}
