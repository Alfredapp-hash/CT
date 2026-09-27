export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > 100_000) throw new Error("That was too long to save.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Could not read that.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Could not read that.");
  return data as Record<string, unknown>;
}

export function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function uniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("23505") || message.toLowerCase().includes("unique");
}
