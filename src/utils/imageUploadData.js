import { decode } from "base64-arraybuffer";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
};

function imageType(asset) {
  const filename = asset?.fileName || asset?.file?.name || "";
  const extension = typeof filename === "string" ? filename.split(".").pop().toLowerCase() : "";
  const inferred = Object.entries(IMAGE_TYPES).find(([, ext]) =>
    ext === extension || (ext === "jpg" && extension === "jpeg"),
  )?.[0];
  const providedMime = asset?.mimeType || asset?.file?.type || inferred || "image/jpeg";
  const mime = typeof providedMime === "string" ? providedMime.toLowerCase() : "";
  if (!IMAGE_TYPES[mime]) {
    throw new Error("Selecione um arquivo de imagem compatível.");
  }
  return { mime, extension: IMAGE_TYPES[mime] };
}

async function imageBytes(asset) {
  if (asset?.fileSize > MAX_IMAGE_BYTES || asset?.file?.size > MAX_IMAGE_BYTES) {
    throw new Error("Cada imagem deve ter no máximo 10 MB.");
  }
  let bytes;
  if (typeof asset?.base64 === "string" && asset.base64.length) {
    // Confere o limite antes de alocar os bytes da imagem.
    const encoded = asset.base64;
    if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
      throw new Error("Cada imagem deve ter no máximo 10 MB.");
    }
    if (encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error("Não foi possível ler a imagem. Selecione-a novamente.");
    }
    try {
      bytes = decode(encoded);
    } catch {
      throw new Error("Não foi possível ler a imagem. Selecione-a novamente.");
    }
  } else if (typeof asset?.file?.arrayBuffer === "function") {
    try {
      bytes = await asset.file.arrayBuffer();
    } catch {
      throw new Error("Não foi possível ler a imagem. Selecione-a novamente.");
    }
  }
  if (!bytes?.byteLength) {
    throw new Error("Não foi possível ler a imagem. Selecione-a novamente.");
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Cada imagem deve ter no máximo 10 MB.");
  }
  return bytes;
}

export async function prepareImageAsset(asset) {
  let { mime, extension } = imageType(asset);
  const bytes = await imageBytes(asset);
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 3));
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    // O ImagePicker pode retornar JPEG para uma foto originalmente HEIC/PNG.
    mime = "image/jpeg";
    extension = "jpg";
  }
  return { bytes, mime, extension };
}

export function createImageObjectName() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
