import { createHash } from "node:crypto";
import { database, query } from "./content";

type Window = { hits: number; start: number };

const memory = new Map<string, Window>();
let ready: Promise<void> | null = null;

function ensure(): Promise<void> {
  if (!ready) {
    ready = database().sql.query(`CREATE TABLE IF NOT EXISTS request_limits (
      bucket varchar(64) PRIMARY KEY,
      hits integer NOT NULL,
      window_start timestamptz NOT NULL
    )`).then(() => undefined).catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export function clientAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim() || "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(first) || /^[a-f0-9:]+$/i.test(first)) return first.slice(0, 80);
  return "unknown";
}

function bucketFor(req: Request, kind: string): string {
  return createHash("sha256").update(`${kind}:${clientAddress(req)}`).digest("hex").slice(0, 40);
}

function cache(bucket: string, window: Window): void {
  memory.set(bucket, window);
  if (memory.size > 5000) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
}

function exceeded(window: Window | undefined, max: number, windowMs: number): boolean {
  if (!window) return false;
  if (Date.now() - window.start > windowMs) return false;
  return window.hits > max;
}

async function stored(bucket: string): Promise<Window | null> {
  await ensure();
  const rows = await query<{ hits: number; window_start: string }>(database().sql`
    SELECT hits, window_start FROM request_limits WHERE bucket = ${bucket} LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;
  const start = new Date(String(row.window_start)).getTime();
  return { hits: Number(row.hits) || 0, start: Number.isFinite(start) ? start : 0 };
}

async function save(bucket: string, hits: number, start: number): Promise<void> {
  const at = new Date(start).toISOString();
  await database().sql`
    INSERT INTO request_limits (bucket, hits, window_start)
    VALUES (${bucket}, ${hits}, ${at})
    ON CONFLICT (bucket) DO UPDATE SET hits = ${hits}, window_start = ${at}
  `;
}

/** True when this address has already used its attempts for the window. */
export async function blocked(req: Request, kind: string, max: number, windowSeconds: number): Promise<boolean> {
  const bucket = bucketFor(req, kind);
  const windowMs = windowSeconds * 1000;
  if (exceeded(memory.get(bucket), max, windowMs)) return true;
  try {
    const row = await stored(bucket);
    if (row) cache(bucket, row);
    return exceeded(row ?? undefined, max, windowMs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "limit");
    return exceeded(memory.get(bucket), max, windowMs);
  }
}

/** Count one failed or accepted attempt. Returns true when the limit is now exceeded. */
export async function recordAttempt(req: Request, kind: string, max: number, windowSeconds: number): Promise<boolean> {
  const bucket = bucketFor(req, kind);
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  let hits = 1;
  let start = now;
  try {
    const row = await stored(bucket);
    if (row && now - row.start <= windowMs) {
      hits = row.hits + 1;
      start = row.start;
    }
    await save(bucket, hits, start);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "limit");
    const local = memory.get(bucket);
    if (local && now - local.start <= windowMs) {
      hits = local.hits + 1;
      start = local.start;
    }
  }
  cache(bucket, { hits, start });
  return hits > max;
}

export async function clearAttempts(req: Request, kind: string): Promise<void> {
  const bucket = bucketFor(req, kind);
  memory.delete(bucket);
  try {
    await ensure();
    await database().sql`DELETE FROM request_limits WHERE bucket = ${bucket}`;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "limit");
  }
}
