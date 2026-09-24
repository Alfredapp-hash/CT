/**
 * Analytics summary API.
 *
 * Requires the ANALYTICS_KEY environment variable. It is never committed — set it on the site with:
 *   netlify env:set ANALYTICS_KEY "<long-random-value>"
 * then redeploy. Callers must send the same value in the `X-Analytics-Key` request header.
 */
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

type DayRollup = {
  date: string;
  pageviews: number;
  events: Record<string, number>;
  pages: Record<string, number>;
  referrers: Record<string, number>;
};

const DEFAULT_DAYS = 14;
const MAX_DAYS = 365;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function dayKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

function merge(target: Record<string, number>, source: Record<string, number> | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "number") continue;
    target[key] = (target[key] ?? 0) + value;
  }
}

function rank(counts: Record<string, number>, labelKey: string) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ [labelKey]: label, count }));
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });

export default async (req: Request) => {
  const expectedKey = process.env.ANALYTICS_KEY;
  if (!expectedKey) {
    return json({ error: "ANALYTICS_KEY is not configured on this site." }, 500);
  }

  const providedKey = req.headers.get("x-analytics-key");
  if (!providedKey || !timingSafeEqual(providedKey, expectedKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const requestedDays = Number(new URL(req.url).searchParams.get("days"));
  const days = Number.isFinite(requestedDays) && requestedDays > 0
    ? Math.min(Math.floor(requestedDays), MAX_DAYS)
    : DEFAULT_DAYS;

  const store = getStore({ name: "analytics", consistency: "strong" });
  const dates = dayKeys(days);

  const rollups = await Promise.all(
    dates.map(async (date) => {
      try {
        return (await store.get(`day/${date}.json`, { type: "json" })) as DayRollup | null;
      } catch (error) {
        console.error(`analytics summary failed to read ${date}`, error);
        return null;
      }
    }),
  );

  const pages: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  const events: Record<string, number> = {};
  const daily = dates.map((date, index) => ({
    date,
    pageviews: rollups[index]?.pageviews ?? 0,
  }));

  for (const rollup of rollups) {
    if (!rollup) continue;
    merge(pages, rollup.pages);
    merge(referrers, rollup.referrers);
    merge(events, rollup.events);
  }

  const pageviews = daily.reduce((sum, day) => sum + day.pageviews, 0);
  const eventTotal = Object.values(events).reduce((sum, count) => sum + count, 0);

  return json(
    {
      range: { days, from: dates[0], to: dates[dates.length - 1] },
      totals: {
        pageviews,
        unique_paths: Object.keys(pages).length,
        referrer_hosts: Object.keys(referrers).length,
        events: eventTotal,
        days_with_data: rollups.filter(Boolean).length,
      },
      pages: rank(pages, "path"),
      referrers: rank(referrers, "host"),
      events: rank(events, "event"),
      daily,
      generated_at: new Date().toISOString(),
    },
    200,
  );
};

export const config: Config = {
  path: "/api/analytics/summary",
  method: ["GET"],
};
