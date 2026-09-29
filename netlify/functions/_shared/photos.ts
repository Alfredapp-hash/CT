import { del, get, put } from "@vercel/blob";

export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PHOTO_LIMIT = 4 * 1024 * 1024;

export function photoKey(id: number): string {
  return `product/${id}`;
}

export async function savePhoto(id: number, body: ArrayBuffer, contentType: string): Promise<void> {
  await put(photoKey(id), body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function deletePhoto(id: number): Promise<void> {
  await del(photoKey(id));
}

async function readBlob(pathname: string, access: "public" | "private"): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const stored = await get(pathname, { access });
    if (!stored || stored.statusCode !== 200 || !stored.stream) return null;
    const data = await new Response(stored.stream).arrayBuffer();
    return { data, contentType: stored.blob.contentType || "" };
  } catch {
    return null;
  }
}

export async function readPhoto(id: number): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const key = photoKey(id);
  let stored = await readBlob(key, "private");
  if (!stored) {
    stored = await readBlob(key, "public");
    if (stored) {
      const contentType = (stored.contentType || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (PHOTO_TYPES.has(contentType)) {
        try {
          await put(key, stored.data, {
            access: "private",
            contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
          });
        } catch {
          /* keep serving the copy already read */
        }
      }
    }
  }
  if (!stored) return null;
  const contentType = (stored.contentType || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!PHOTO_TYPES.has(contentType)) return null;
  return { data: stored.data, contentType };
}

async function readStoredJson<T>(pathname: string, access: "public" | "private"): Promise<T | null> {
  const stored = await readBlob(pathname, access);
  if (!stored) return null;
  try {
    return JSON.parse(new TextDecoder().decode(stored.data)) as T;
  } catch {
    return null;
  }
}

export async function readJson<T>(pathname: string): Promise<T | null> {
  const privately = await readStoredJson<T>(pathname, "private");
  if (privately) return privately;
  const publicly = await readStoredJson<T>(pathname, "public");
  if (publicly) {
    try { await writeJson(pathname, publicly); } catch { /* the public copy is still readable this once */ }
  }
  return publicly;
}

export async function writeJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
