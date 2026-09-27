import { neon, Pool } from "@neondatabase/serverless";
import books from "../../../src/_data/books.json";

export const PLATFORMS = ["instagram", "facebook", "goodreads", "amazonAuthor"] as const;
export const PIECE_STATUSES = ["idea", "drafting", "ready", "posted"] as const;
export const POST_STATUSES = ["draft", "published"] as const;
export const CATEGORIES = ["signed", "apparel", "home"] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  goodreads: "Goodreads",
  amazonAuthor: "Amazon author page",
};

/** Journal slugs that already exist as files on the site. */
export const FILE_SLUGS = new Set([
  "surviving-into-story",
  "reading-the-price-series",
  "grace-for-ordinary-days",
  "a-garden-still-growing",
]);

type Book = { slug: string; title: string };

const catalog = books as Book[];

export function bookTitle(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return catalog.find((book) => book.slug === slug)?.title ?? null;
}

export function knownBook(slug: string | null | undefined): boolean {
  if (!slug) return true;
  return catalog.some((book) => book.slug === slug);
}

type SqlRow = Record<string, unknown>;

function asRows(result: unknown): SqlRow[] {
  if (Array.isArray(result)) return result as SqlRow[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: SqlRow[] }).rows;
  }
  return [];
}

function connectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Database is not configured.");
  return url;
}

export function database() {
  const url = connectionString();
  const sql = neon(url);
  return {
    sql,
    pool: {
      async connect() {
        const pool = new Pool({ connectionString: url });
        const client = await pool.connect();
        const release = client.release.bind(client);
        client.release = () => {
          release();
          void pool.end();
        };
        return client;
      },
    },
  };
}

export async function query<T>(result: unknown): Promise<T[]> {
  return asRows(await Promise.resolve(result)) as T[];
}

export function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (url.length > 300 || !/^https:\/\/[^\s]+$/i.test(url)) {
    throw new Error("Profile links must be https addresses.");
  }
  return url;
}
