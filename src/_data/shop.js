// Build-time product feed for /merch.html.
// SHOP_ORIGIN (Netlify env) → GET {SHOP_ORIGIN}/api/products (public, active products only).
// Unset or unreachable → merch.json fallback (categories, no products) so the page still builds.
import EleventyFetch from "@11ty/eleventy-fetch";
import { readFileSync } from "node:fs";

const fallback = JSON.parse(readFileSync(new URL("./merch.json", import.meta.url), "utf8"));
const origin = (process.env.SHOP_ORIGIN || fallback.origin || "").replace(/\/$/, "");

export default async function () {
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
