/**
 * Private desk API. Every route requires the author session cookie.
 * Journal, social captions, shop products, and orders live here.
 */
import { sessionFromRequest } from "./_shared/auth";
import {
  CATEGORIES,
  FILE_SLUGS,
  PIECE_STATUSES,
  PLATFORM_LABELS,
  PLATFORMS,
  POST_STATUSES,
  bookTitle,
  isCatalogBook,
  cleanUrl,
  database,
  iso,
  knownBook,
  query,
} from "./_shared/content";
import { json, readJson, text, uniqueViolation } from "./_shared/http";
import { PHOTO_LIMIT, PHOTO_TYPES, deletePhoto, savePhoto } from "./_shared/photos";
import { renderProse, slugify } from "./_shared/prose";

type Row = Record<string, unknown>;

function gate(req: Request): Response | null {
  if (!sessionFromRequest(req)) return json({ error: "Unauthorized" }, 401);
  return null;
}

function fail(error: unknown): Response {
  if (error instanceof Error && !uniqueViolation(error)) {
    if (error.message && !error.message.includes("connect") && error.message.length < 160) {
      return json({ error: error.message }, 400);
    }
  }
  if (uniqueViolation(error)) return json({ error: "That address is already in use." }, 409);
  console.error(error);
  return json({ error: "The desk could not reach its records." }, 503);
}

function postView(row: Row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    status: row.status,
    relatedBook: row.related_book,
    relatedTitle: bookTitle(row.related_book as string | null),
    publishedAt: iso(row.published_at),
    updatedAt: iso(row.updated_at),
  };
}

function productView(row: Row) {
  const id = Number(row.id);
  const updated = iso(row.updated_at);
  return {
    id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    details: row.details,
    priceCents: row.price_cents,
    currency: row.currency,
    category: row.category,
    stock: row.stock,
    status: row.status,
    imageAlt: row.image_alt,
    hasImage: row.has_image === true,
    imageUrl: row.has_image === true ? `/api/media/product/${id}?v=${encodeURIComponent(updated || "")}` : null,
    checkoutUrl: row.checkout_url,
    shippingNote: row.shipping_note,
    url: `/merch/item/${row.slug}`,
    updatedAt: updated,
  };
}

async function ensureProfiles(): Promise<void> {
  const db = database();
  for (const platform of PLATFORMS) {
    await db.sql`INSERT INTO social_profiles (platform, label) VALUES (${platform}, ${PLATFORM_LABELS[platform]}) ON CONFLICT (platform) DO NOTHING`;
  }
}

async function posts(req: Request, id: string | undefined): Promise<Response> {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query<Row>(db.sql`SELECT * FROM journal_posts ORDER BY updated_at DESC`);
    return json({ posts: rows.map(postView) });
  }
  if (req.method === "POST" && !id) {
    const body = await readJson(req);
    const title = text(body.title, 220);
    if (!title) return json({ error: "Give the piece a title." }, 400);
    const slug = slugify(text(body.slug, 120) || title);
    if (!slug || FILE_SLUGS.has(slug)) return json({ error: "Choose a different web address for this piece." }, 400);
    const manuscript = text(body.body, 20000);
    const status = body.status === "published" ? "published" : "draft";
    const related = text(body.relatedBook, 120) || null;
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const rows = await query<Row>(db.sql`
      INSERT INTO journal_posts (slug, title, description, body, body_html, status, related_book, published_at)
      VALUES (
        ${slug}, ${title}, ${text(body.description, 400)}, ${manuscript}, ${renderProse(manuscript)},
        ${status}, ${related}, ${status === "published" ? new Date().toISOString() : null}
      )
      RETURNING *
    `);
    return json({ post: postView(rows[0]) }, 201);
  }
  if (!id || !/^\d+$/.test(id)) return json({ error: "Missing piece." }, 404);
  if (req.method === "DELETE") {
    await db.sql`DELETE FROM journal_posts WHERE id = ${Number(id)}`;
    return json({ ok: true });
  }
  if (req.method === "PATCH") {
    const current = await query<Row>(db.sql`SELECT * FROM journal_posts WHERE id = ${Number(id)} LIMIT 1`);
    if (!current[0]) return json({ error: "That piece is not on the desk." }, 404);
    const body = await readJson(req);
    const title = text(body.title, 220) || String(current[0].title);
    const slug = slugify(text(body.slug, 120) || title);
    if (!slug || FILE_SLUGS.has(slug)) return json({ error: "Choose a different web address for this piece." }, 400);
    const manuscript = body.body === undefined ? String(current[0].body) : text(body.body, 20000);
    const status = POST_STATUSES.includes(body.status as "draft") ? String(body.status) : String(current[0].status);
    const related = body.relatedBook === undefined ? (current[0].related_book as string | null) : (text(body.relatedBook, 120) || null);
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const publishedAt = status === "published"
      ? (current[0].published_at ? iso(current[0].published_at) : new Date().toISOString())
      : null;
    const rows = await query<Row>(db.sql`
      UPDATE journal_posts SET
        slug = ${slug}, title = ${title}, description = ${text(body.description, 400) || String(current[0].description)},
        body = ${manuscript}, body_html = ${renderProse(manuscript)}, status = ${status},
        related_book = ${related}, published_at = ${publishedAt}, updated_at = now()
      WHERE id = ${Number(id)} RETURNING *
    `);
    return json({ post: postView(rows[0]) });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function social(req: Request, id: string | undefined): Promise<Response> {
  const db = database();
  if (req.method === "GET" && !id) {
    await ensureProfiles();
    const profiles = await query<Row>(db.sql`SELECT * FROM social_profiles ORDER BY platform`);
    const pieces = await query<Row>(db.sql`SELECT * FROM social_pieces ORDER BY updated_at DESC`);
    return json({
      profiles: profiles.map((row) => ({ platform: row.platform, label: row.label, url: row.url })),
      pieces: pieces.map((row) => ({
        id: row.id,
        platform: row.platform,
        title: row.title,
        caption: row.caption,
        status: row.status,
        relatedBook: row.related_book,
        relatedTitle: bookTitle(row.related_book as string | null),
        updatedAt: iso(row.updated_at),
      })),
    });
  }
  if (req.method === "POST" && !id) {
    const body = await readJson(req);
    const platform = String(body.platform || "");
    if (!PLATFORMS.includes(platform as "instagram")) return json({ error: "Choose a platform." }, 400);
    const caption = text(body.caption, 2200);
    if (!caption) return json({ error: "Write the caption first." }, 400);
    const status = PIECE_STATUSES.includes(body.status as "idea") ? String(body.status) : "idea";
    const related = text(body.relatedBook, 120) || null;
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const rows = await query<Row>(db.sql`
      INSERT INTO social_pieces (platform, title, caption, status, related_book)
      VALUES (${platform}, ${text(body.title, 180)}, ${caption}, ${status}, ${related})
      RETURNING *
    `);
    return json({ piece: rows[0] }, 201);
  }
  if (!id || !/^\d+$/.test(id)) return json({ error: "Missing caption." }, 404);
  if (req.method === "DELETE") {
    await db.sql`DELETE FROM social_pieces WHERE id = ${Number(id)}`;
    return json({ ok: true });
  }
  if (req.method === "PATCH") {
    const body = await readJson(req);
    const platform = String(body.platform || "");
    if (!PLATFORMS.includes(platform as "instagram")) return json({ error: "Choose a platform." }, 400);
    const status = PIECE_STATUSES.includes(body.status as "idea") ? String(body.status) : "idea";
    const related = text(body.relatedBook, 120) || null;
    const rows = await query<Row>(db.sql`
      UPDATE social_pieces SET
        platform = ${platform}, title = ${text(body.title, 180)}, caption = ${text(body.caption, 2200)},
        status = ${status}, related_book = ${related}, updated_at = now()
      WHERE id = ${Number(id)} RETURNING *
    `);
    if (!rows[0]) return json({ error: "That caption is not on the desk." }, 404);
    return json({ piece: rows[0] });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function profiles(req: Request): Promise<Response> {
  if (req.method !== "PATCH") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(req);
  const db = database();
  await ensureProfiles();
  for (const platform of PLATFORMS) {
    if (!(platform in body)) continue;
    const url = cleanUrl(body[platform]);
    await db.sql`UPDATE social_profiles SET url = ${url}, updated_at = now() WHERE platform = ${platform}`;
  }
  const rows = await query<Row>(db.sql`SELECT platform, label, url FROM social_profiles ORDER BY platform`);
  return json({ profiles: rows });
}

function money(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1_000_000_00) {
    throw new Error("Enter a price in cents.");
  }
  return value;
}

async function saveProduct(req: Request, id?: number): Promise<Response> {
  const body = await readJson(req);
  const name = text(body.name, 180);
  if (!name) return json({ error: "Name the product." }, 400);
  const slug = slugify(text(body.slug, 120) || name);
  if (!slug) return json({ error: "Choose a web address for this product." }, 400);
  if (isCatalogBook(slug)) return json({ error: "That address belongs to a book. Books stay on the retailer links." }, 400);
  const category = String(body.category || "signed");
  if (!CATEGORIES.includes(category as "signed")) return json({ error: "Choose a shop category." }, 400);
  const status = body.status === "listed" ? "listed" : "draft";
  const price = money(body.priceCents);
  const stock = body.stock;
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > 10000) {
    return json({ error: "Enter how many are ready to ship." }, 400);
  }
  let checkout: string | null = null;
  if (body.checkoutUrl) checkout = cleanUrl(body.checkoutUrl);
  const description = text(body.description, 400);
  const details = text(body.details, 8000);
  const shipping = text(body.shippingNote, 240) || "Ships from Courtney.";
  const db = database();
  if (status === "listed") {
    const existing = id
      ? await query<Row>(db.sql`SELECT has_image FROM products WHERE id = ${id} LIMIT 1`)
      : [];
    if (!existing[0]?.has_image) return json({ error: "Add a photograph before this can go on the shop." }, 400);
    if (!description || price <= 0) return json({ error: "A shop listing needs a price and a short description." }, 400);
  }
  const rows = id
    ? await query<Row>(db.sql`
        UPDATE products SET
          slug = ${slug}, name = ${name}, description = ${description}, details = ${details},
          price_cents = ${price}, category = ${category}, stock = ${stock}, status = ${status},
          checkout_url = ${checkout}, shipping_note = ${shipping}, updated_at = now()
        WHERE id = ${id} RETURNING *
      `)
    : await query<Row>(db.sql`
        INSERT INTO products (slug, name, description, details, price_cents, category, stock, status, checkout_url, shipping_note)
        VALUES (${slug}, ${name}, ${description}, ${details}, ${price}, ${category}, ${stock}, ${status}, ${checkout}, ${shipping})
        RETURNING *
      `);
  if (!rows[0]) return json({ error: "That product is not on the desk." }, 404);
  return json({ product: productView(rows[0]) }, id ? 200 : 201);
}

async function products(req: Request, id: string | undefined, action: string | undefined): Promise<Response> {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query<Row>(db.sql`SELECT * FROM products ORDER BY updated_at DESC`);
    return json({ products: rows.map(productView) });
  }
  if (req.method === "POST" && !id) return saveProduct(req);
  if (!id || !/^\d+$/.test(id)) return json({ error: "Missing product." }, 404);
  const productId = Number(id);
  if (action === "photo" && req.method === "POST") {
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return json({ error: "Choose a photograph." }, 400);
    if (!PHOTO_TYPES.has(file.type)) return json({ error: "Use a JPEG, PNG, or WebP photograph." }, 400);
    if (file.size > PHOTO_LIMIT) return json({ error: "That photograph is larger than 4 MB." }, 400);
    const alt = text(form.get("alt"), 180);
    await savePhoto(productId, await file.arrayBuffer(), file.type);
    const rows = await query<Row>(db.sql`
      UPDATE products SET has_image = true, image_alt = ${alt}, updated_at = now()
      WHERE id = ${productId} RETURNING *
    `);
    if (!rows[0]) return json({ error: "That product is not on the desk." }, 404);
    return json({ product: productView(rows[0]) });
  }
  if (req.method === "DELETE") {
    const orders = await query<Row>(db.sql`SELECT id FROM orders WHERE product_id = ${productId} LIMIT 1`);
    if (orders[0]) return json({ error: "This product has orders. Unlist it instead of deleting it." }, 409);
    await db.sql`DELETE FROM products WHERE id = ${productId}`;
    try { await deletePhoto(productId); } catch { /* no photograph stored */ }
    return json({ ok: true });
  }
  if (req.method === "PATCH") return saveProduct(req, productId);
  return json({ error: "Method not allowed" }, 405);
}

async function orders(req: Request, id: string | undefined): Promise<Response> {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query<Row>(db.sql`
      SELECT o.id, o.quantity, o.buyer_name, o.buyer_email, o.address, o.note, o.status, o.created_at,
             p.name AS product_name, p.slug AS product_slug
      FROM orders o JOIN products p ON p.id = o.product_id
      ORDER BY o.created_at DESC LIMIT 100
    `);
    return json({
      orders: rows.map((row) => ({
        id: row.id,
        quantity: row.quantity,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        address: row.address,
        note: row.note,
        status: row.status,
        productName: row.product_name,
        productSlug: row.product_slug,
        createdAt: iso(row.created_at),
      })),
    });
  }
  if (req.method === "PATCH" && id && /^\d+$/.test(id)) {
    const body = await readJson(req);
    const status = String(body.status || "");
    if (!["new", "fulfilled", "cancelled"].includes(status)) return json({ error: "Choose an order status." }, 400);
    await db.sql`UPDATE orders SET status = ${status} WHERE id = ${Number(id)}`;
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

export default async (req: Request) => {
  const denied = gate(req);
  if (denied) return denied;
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const resource = parts[2] || "";
  const id = parts[3];
  const action = parts[4];
  try {
    if (resource === "session" && req.method === "GET") {
      return json({ ok: true, email: sessionFromRequest(req)?.sub });
    }
    if (resource === "posts") return await posts(req, id);
    if (resource === "social") return await social(req, id);
    if (resource === "profiles") return await profiles(req);
    if (resource === "products") return await products(req, id, action);
    if (resource === "orders") return await orders(req, id);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
};
