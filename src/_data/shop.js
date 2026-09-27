// Build-time product feed for /merch.html.
// SHOP_ORIGIN (Netlify env) → GET {SHOP_ORIGIN}/api/products (public, active products only).
// Unset or unreachable → merch.json fallback (categories, no products) so the page still builds.
import EleventyFetch from "@11ty/eleventy-fetch";
import { readFileSync } from "node:fs";

const fallback = JSON.parse(readFileSync(new URL("./merch.json", import.meta.url), "utf8"));
const origin = (process.env.SHOP_ORIGIN || fallback.origin || "").replace(/\/$/, "");

async function fromDesk() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT id, slug, name, description, price_cents, currency, category, stock, has_image FROM products WHERE status = 'listed' ORDER BY name`;
    const list = Array.isArray(rows) ? rows : [];
    return list.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description || "",
      priceCents: p.price_cents,
      currency: p.currency || "USD",
      image: p.has_image ? `/api/media/product/${p.id}` : null,
      category: p.category || "home",
      fulfillment: "desk",
      inStock: Number(p.stock) > 0,
      url: `/merch/item/${p.slug}`,
    }));
  } catch (err) {
    console.warn(`[shop] desk products unavailable (${err.message})`);
    return null;
  }
}

export default async function () {
  const desk = await fromDesk();
  if (desk && desk.length) return { origin: "", products: desk, categories: fallback.categories, source: "desk" };
  if (!origin) return { origin: "", products: [], categories: fallback.categories, source: "fallback" };
  try {
    const data = await EleventyFetch(`${origin}/api/products?limit=100`, { duration: "10m", type: "json", fetchOptions: { headers: { accept: "application/json" } } });
    const products = (data.products || []).map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.short_description || p.description || "",
      priceCents: p.price_cents ?? (typeof p.price === "number" ? Math.round(p.price * 100) : null),
      currency: p.currency || "USD",
      image: p.image_url || (p.images && p.images[0]) || null,
      category: p.category || "other",
      fulfillment: p.fulfillment || "self",
      inStock: p.in_stock !== false && (p.stock == null || p.stock > 0),
      url: `${origin}/products/${p.slug}`,
    }));
    return { origin, products, categories: fallback.categories, source: "api" };
  } catch (err) {
    console.warn(`[shop] ${origin}/api/products unreachable (${err.message}); building with fallback`);
    return { origin, products: [], categories: fallback.categories, source: "fallback" };
  }
}
