import { del, get, put } from "@vercel/blob";

export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PHOTO_LIMIT = 4 * 1024 * 1024;

export function photoKey(id: number): string {
  return `product/${id}`;
}

export async function savePhoto(id: number, body: ArrayBuffer, contentType: string): Promise<void> {
  await put(photoKey(id), body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function deletePhoto(id: number): Promise<void> {
  await del(photoKey(id));
}

export async function readPhoto(id: number): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const stored = await get(photoKey(id), { access: "public" });
    if (!stored || stored.statusCode !== 200 || !stored.stream) return null;
    const data = await new Response(stored.stream).arrayBuffer();
    const contentType = stored.blob.contentType || "image/jpeg";
    return { data, contentType };
  } catch {
    return null;
  }
}

export async function readJson<T>(pathname: string): Promise<T | null> {
  try {
    const stored = await get(pathname, { access: "public" });
    if (!stored || stored.statusCode !== 200 || !stored.stream) return null;
    return (await new Response(stored.stream).json()) as T;
  } catch {
    return null;
  }
}

export async function writeJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
