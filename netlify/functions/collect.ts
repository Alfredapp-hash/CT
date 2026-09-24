import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

type DayRollup = {
  date: string;
  pageviews: number;
  events: Record<string, number>;
  pages: Record<string, number>;
  referrers: Record<string, number>;
};

type Beacon = {
  path?: unknown;
  referrer?: unknown;
  title?: unknown;
  event?: unknown;
  ts?: unknown;
};

const MAX_BODY_BYTES = 4096;
const MAX_PATH_LENGTH = 200;
const MAX_EVENT_LENGTH = 60;
/** Keeps a single day's rollup from growing without bound if junk traffic invents keys. */
const MAX_DISTINCT_KEYS = 2000;

const emptyDay = (date: string): DayRollup => ({
  date,
  pageviews: 0,
  events: {},
  pages: {},
  referrers: {},
});

function increment(counts: Record<string, number>, key: string): void {
  if (counts[key] === undefined && Object.keys(counts).length >= MAX_DISTINCT_KEYS) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function cleanPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  let pathname: string;
  try {
    pathname = new URL(value, "https://placeholder.invalid").pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith("/")) return null;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return pathname.slice(0, MAX_PATH_LENGTH);
}

function referrerHost(value: unknown, siteOrigin: string): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.origin === siteOrigin) return null;
    return url.hostname.slice(0, MAX_PATH_LENGTH);
  } catch {
    return null;
  }
}

function cleanEvent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase().slice(0, MAX_EVENT_LENGTH);
  if (!/^[a-z0-9._-]+$/.test(name)) return null;
  return name;
}

function corsHeaders(origin: string | null, allowed: boolean): HeadersInit {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export default async (req: Request, context: Context) => {
  const requestOrigin = req.headers.get("origin");
  const siteOrigin = new URL(req.url).origin;
  const knownOrigins = new Set([siteOrigin]);
  if (context.site?.url) knownOrigins.add(new URL(context.site.url).origin);
  const sameOrigin = !requestOrigin || knownOrigins.has(requestOrigin);
  const cors = corsHeaders(requestOrigin, sameOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: sameOrigin ? 204 : 403, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }
  if (!sameOrigin) {
    return new Response("Forbidden", { status: 403, headers: cors });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 204, headers: cors });
  }

  let beacon: Beacon;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 204, headers: cors });
    beacon = JSON.parse(raw) as Beacon;
  } catch {
    return new Response(null, { status: 204, headers: cors });
  }

  const path = cleanPath(beacon.path);
  const event = cleanEvent(beacon.event);
  if (!path && !event) {
    return new Response(null, { status: 204, headers: cors });
  }

  const date = new Date().toISOString().slice(0, 10);
  const key = `day/${date}.json`;
  const store = getStore({ name: "analytics", consistency: "strong" });

  try {
    const existing = (await store.get(key, { type: "json" })) as DayRollup | null;
    const day: DayRollup = {
      ...emptyDay(date),
      ...(existing ?? {}),
      date,
      events: existing?.events ?? {},
      pages: existing?.pages ?? {},
      referrers: existing?.referrers ?? {},
    };

    if (event) {
      increment(day.events, event);
    } else if (path) {
      day.pageviews += 1;
      increment(day.pages, path);
      const host = referrerHost(beacon.referrer, siteOrigin);
      if (host) increment(day.referrers, host);
    }

    await store.setJSON(key, day);
  } catch (error) {
    console.error("analytics collect failed", error);
  }

  return new Response(null, { status: 204, headers: cors });
};

export const config: Config = {
  path: "/api/analytics/collect",
  method: ["POST", "OPTIONS"],
};
