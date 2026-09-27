import { readPhoto } from "./_shared/photos";

export default async (req: Request) => {
  const id = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const stored = await readPhoto(Number(id));
  if (!stored) return new Response("Not found", { status: 404 });
  return new Response(stored.data, {
    headers: {
      "content-type": stored.contentType,
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
};
