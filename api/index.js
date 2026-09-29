// netlify/functions/_shared/photos.ts
import { del, get, put } from "@vercel/blob";
var PHOTO_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var PHOTO_LIMIT = 4 * 1024 * 1024;
function photoKey(id) {
  return `product/${id}`;
}
async function savePhoto(id, body, contentType) {
  await put(photoKey(id), body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true
  });
}
async function deletePhoto(id) {
  await del(photoKey(id));
}
async function readBlob(pathname, access) {
  try {
    const stored2 = await get(pathname, { access });
    if (!stored2 || stored2.statusCode !== 200 || !stored2.stream) return null;
    const data = await new Response(stored2.stream).arrayBuffer();
    return { data, contentType: stored2.blob.contentType || "" };
  } catch {
    return null;
  }
}
async function readPhoto(id) {
  const key = photoKey(id);
  let stored2 = await readBlob(key, "private");
  if (!stored2) {
    stored2 = await readBlob(key, "public");
    if (stored2) {
      const contentType2 = (stored2.contentType || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (PHOTO_TYPES.has(contentType2)) {
        try {
          await put(key, stored2.data, {
            access: "private",
            contentType: contentType2,
            addRandomSuffix: false,
            allowOverwrite: true
          });
        } catch {
        }
      }
    }
  }
  if (!stored2) return null;
  const contentType = (stored2.contentType || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!PHOTO_TYPES.has(contentType)) return null;
  return { data: stored2.data, contentType };
}
async function readStoredJson(pathname, access) {
  const stored2 = await readBlob(pathname, access);
  if (!stored2) return null;
  try {
    return JSON.parse(new TextDecoder().decode(stored2.data));
  } catch {
    return null;
  }
}
async function readJson(pathname) {
  const privately = await readStoredJson(pathname, "private");
  if (privately) return privately;
  const publicly = await readStoredJson(pathname, "public");
  if (publicly) {
    try {
      await writeJson(pathname, publicly);
    } catch {
    }
  }
  return publicly;
}
async function writeJson(pathname, value) {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

// netlify/functions/_shared/stripe-env.ts
var PRODUCTION_ORIGIN = "https://www.booksbycourtney.site";
function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}
function stripeConfigured() {
  return stripeSecret().length > 0;
}
function webhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1"]);
function checkoutOrigin(req) {
  const url = new URL(req.url);
  if (LOCAL_HOSTS.has(url.hostname) || url.origin === PRODUCTION_ORIGIN) return url.origin;
  return PRODUCTION_ORIGIN;
}
function browserOriginAllowed(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname)) return false;
    return url.origin === PRODUCTION_ORIGIN || url.hostname === "booksbycourtney.site" || LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
function siteOrigin(req) {
  const url = new URL(req.url);
  if (LOCAL_HOSTS.has(url.hostname)) return url.origin;
  return PRODUCTION_ORIGIN;
}

// netlify/functions/collect.ts
var MAX_BODY_BYTES = 4096;
var MAX_PATH_LENGTH = 200;
var MAX_EVENT_LENGTH = 60;
var MAX_DISTINCT_KEYS = 2e3;
var emptyDay = (date) => ({
  date,
  pageviews: 0,
  events: {},
  pages: {},
  referrers: {}
});
function increment(counts, key) {
  if (counts[key] === void 0 && Object.keys(counts).length >= MAX_DISTINCT_KEYS) return;
  counts[key] = (counts[key] ?? 0) + 1;
}
function cleanPath(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  let pathname;
  try {
    pathname = new URL(value, "https://placeholder.invalid").pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith("/")) return null;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return pathname.slice(0, MAX_PATH_LENGTH);
}
function referrerHost(value, siteOrigin2) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.origin === siteOrigin2) return null;
    return url.hostname.slice(0, MAX_PATH_LENGTH);
  } catch {
    return null;
  }
}
function cleanEvent(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase().slice(0, MAX_EVENT_LENGTH);
  if (!/^[a-z0-9._-]+$/.test(name)) return null;
  return name;
}
function corsHeaders(origin, allowed) {
  const headers = { Vary: "Origin" };
  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}
var collect_default = async (req) => {
  const requestOrigin = req.headers.get("origin");
  const siteOrigin2 = new URL(req.url).origin;
  const knownOrigins = /* @__PURE__ */ new Set([siteOrigin2, PRODUCTION_ORIGIN]);
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
  let beacon;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 204, headers: cors });
    beacon = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 204, headers: cors });
  }
  const path = cleanPath(beacon.path);
  const event = cleanEvent(beacon.event);
  if (!path && !event) {
    return new Response(null, { status: 204, headers: cors });
  }
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const key = `analytics/day/${date}.json`;
  try {
    const existing = await readJson(key);
    const day = {
      ...emptyDay(date),
      ...existing ?? {},
      date,
      events: existing?.events ?? {},
      pages: existing?.pages ?? {},
      referrers: existing?.referrers ?? {}
    };
    if (event) {
      increment(day.events, event);
    } else if (path) {
      day.pageviews += 1;
      increment(day.pages, path);
      const host = referrerHost(beacon.referrer, siteOrigin2);
      if (host) increment(day.referrers, host);
    }
    await writeJson(key, day);
  } catch (error) {
    console.error("analytics collect failed", error);
  }
  return new Response(null, { status: 204, headers: cors });
};

// netlify/functions/checkout.ts
import Stripe from "stripe";

// netlify/functions/_shared/content.ts
import { neon, Pool } from "@neondatabase/serverless";

// src/_data/books.json
var books_default = [
  {
    slug: "365-days-of-grace",
    title: "365 Days of Grace",
    publishedAs: null,
    series: null,
    shelf: "faith-home",
    category: "devotional",
    eyebrow: "A devotional for the working mom",
    year: 2025,
    isbn: "9798349319341",
    format: "Hardcover",
    pages: null,
    tagline: "Early alarms, bedtime guilt, and the grace that meets a working mother in the middle of an ordinary day.",
    blurb: "The journey of a working mother is a tapestry of joy, exhaustion, triumph, and doubt. 365 Days of Grace is a devotional born from that life: the weight of expectations, the guilt that arrives after the children are asleep, prayer on the commute, and the daily practice of trusting grace more than perfection.",
    excerpt: "The journey of a working mother is a tapestry woven with threads of joy, exhaustion, triumph, and doubt.",
    cover: {
      base: "365-days-of-grace-cover",
      width: 600,
      height: 992,
      width2x: 1200,
      height2x: 1984,
      alt: "Cover of 365 Days of Grace by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: true,
    reviews: [],
    awards: [
      {
        name: "International Impact Book Awards",
        honor: "Outstanding Literary Achievement",
        category: "Devotional",
        year: 2026,
        month: "September",
        seal: {
          src: "/media/awards/iiba-distinguished-author-160.png",
          srcset: "/media/awards/iiba-distinguished-author-160.png 1x, /media/awards/iiba-distinguished-author-320.png 2x",
          alt: "International Impact Book Awards \u2014 Distinguished Author seal"
        }
      }
    ],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements."
  },
  {
    slug: "finding-drakes-feather",
    title: "Finding Drake\u2019s Feather",
    publishedAs: null,
    series: null,
    shelf: "faith-home",
    category: "memoir",
    eyebrow: "A memoir",
    year: 2024,
    isbn: "9798330529551",
    format: "Paperback",
    pages: null,
    tagline: "A memoir for my brother, who lost his battle to mental health.",
    blurb: "Finding Drake\u2019s Feather is Courtney\u2019s memoir for her brother, who lost his battle to mental health. It is a book about grief, about the person who is gone, and about what love leaves behind for the people still here.",
    excerpt: null,
    cover: {
      base: "finding-drakes-feather-cover",
      width: 600,
      height: 982,
      width2x: 1200,
      height2x: 1964,
      alt: "Cover of Finding Drake\u2019s Feather by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Courtney: the site now describes this book only by what the cover says. Please supply the real synopsis (blurb), an excerpt (excerpt), and whether the year/format/ISBN are still right. Brian to supply: page count, ebook/audio availability, discussion guide."
  },
  {
    slug: "finding-your-self-worth",
    title: "Finding Yourself",
    publishedAs: null,
    series: null,
    shelf: "faith-home",
    category: "nonfiction",
    eyebrow: "For the woman carrying every role",
    year: 2024,
    isbn: "9798330546138",
    format: "Paperback",
    pages: null,
    tagline: "For the woman trying to be everyone at once. Overwhelm, boundaries, and a life that matches what you want.",
    blurb: "The modern woman is asked to be the mother, the partner, the employee, the daughter, and the friend \u2014 perfectly, and all at once. Finding Yourself names that overwhelm without calling it weakness, and walks toward self-compassion, boundaries, and the shift from \u201CI should\u201D to \u201CI want.\u201D",
    excerpt: "It\u2019s okay to admit it. We\u2019re overwhelmed. And it\u2019s not a sign of weakness.",
    cover: {
      base: "finding-your-self-worth-cover",
      width: 600,
      height: 986,
      width2x: 1200,
      height2x: 1972,
      alt: "Cover of Finding Yourself by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements"
  },
  {
    slug: "rooted-in-purpose",
    title: "Rooted in Purpose",
    publishedAs: null,
    series: null,
    shelf: "faith-home",
    category: "nonfiction",
    eyebrow: "Faith & purpose",
    year: 2025,
    isbn: "9798348592240",
    format: "Hardcover",
    pages: null,
    tagline: "A garden of essays on seeds, storms, waiting, pruning, and purpose you cannot see yet.",
    blurb: "Purpose, Courtney writes, begins quietly \u2014 long before we believe we are ready. Rooted in Purpose walks through burial and growth: storms that strengthen roots, seasons of waiting, the courage to prune, and the faith that a life is a garden already being tended. Each chapter closes with a lesson and an affirmation.",
    excerpt: "\u201CYour purpose is not lost. It\u2019s growing quietly, even when you cannot see it.\u201D",
    cover: {
      base: "rooted-in-purpose-cover",
      width: 600,
      height: 990,
      width2x: 1200,
      height2x: 1980,
      alt: "Cover of Rooted in Purpose by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements"
  },
  {
    slug: "the-price-of-choosing-you",
    title: "The Price of Choosing You",
    publishedAs: null,
    series: {
      name: "The Choices We Carry",
      order: 1,
      label: "Book One"
    },
    shelf: "price-series",
    category: "novel",
    eyebrow: "The Choices We Carry \xB7 Book One",
    year: 2026,
    isbn: "9798295811135",
    format: "Paperback",
    pages: null,
    tagline: "Survival and sacrifice. Kathryn wakes in chains and learns she is being held against something worse.",
    blurb: "Kathryn wakes in the dark, wrists bound, and learns the man holding the key is not the worst thing looking for her. Book One of The Choices We Carry is a novel of survival and sacrifice: the rules of silence, the cost of mercy, and the choice she has to make when fear changes shape.",
    excerpt: "She wasn\u2019t being held from the world. She was being held against it.",
    cover: {
      base: "the-price-of-choosing-you-cover",
      width: 600,
      height: 998,
      width2x: 1200,
      height2x: 1996,
      alt: "Cover of The Price of Choosing You by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements"
  },
  {
    slug: "the-price-of-letting-go",
    title: "The Price of Letting Go",
    publishedAs: null,
    series: {
      name: "The Choices We Carry",
      order: 2,
      label: "Book Two"
    },
    shelf: "price-series",
    category: "novel",
    eyebrow: "The Choices We Carry \xB7 Book Two",
    year: 2026,
    isbn: "9798295813207",
    format: "Paperback",
    pages: null,
    tagline: "Exposure and consequence. Three months free, and freedom still has teeth.",
    blurb: "They have been free for three months, living under a borrowed name in a borrowed house, and the quiet still feels wrong. Book Two asks what it costs to stay free: the names that still matter, the lie between them, and the moment Kathryn stops disappearing.",
    excerpt: "\u201CTell me what the price is,\u201D she said. Because survival had been Book One. And Book Two was about what it cost to stay free.",
    cover: {
      base: "the-price-of-letting-go-cover",
      width: 600,
      height: 997,
      width2x: 1200,
      height2x: 1994,
      alt: "Cover of The Price of Letting Go by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements"
  },
  {
    slug: "what-we-keep",
    title: "What We Keep",
    publishedAs: null,
    series: {
      name: "The Choices We Carry",
      order: 3,
      label: "Book Three"
    },
    shelf: "price-series",
    category: "novel",
    eyebrow: "The Choices We Carry \xB7 Book Three",
    year: 2026,
    isbn: "9798295869433",
    format: "Paperback",
    pages: null,
    tagline: "Legacy, healing, and the truth that remains after everything else is burned away.",
    blurb: "After the story is public, Kathryn learns that truth does not quiet the world. It amplifies it. Book Three is about legacy and healing: the trial, the names worth keeping, and a life finally shaped by choice instead of captivity.",
    excerpt: "\u201CI used to think surviving was the finish line,\u201D she said. \u201CBut survival is just the body continuing. Living requires choice.\u201D",
    cover: {
      base: "what-we-keep-cover",
      width: 600,
      height: 989,
      width2x: 1200,
      height2x: 1978,
      alt: "Cover of What We Keep by Courtney Thomas"
    },
    retailers: null,
    ogType: "book",
    featured: false,
    reviews: [],
    awards: [],
    press: [],
    praise: [],
    discussionGuide: null,
    related: [],
    sampleUrl: null,
    audiobook: null,
    ebookIsbn: null,
    _todo: "Brian to supply: page count, ebook/audio availability, discussion guide, any real endorsements"
  }
];

// netlify/functions/_shared/content.ts
var PLATFORMS = ["instagram", "facebook", "goodreads", "amazonAuthor"];
var PIECE_STATUSES = ["idea", "drafting", "ready", "posted"];
var POST_STATUSES = ["draft", "published"];
var CATEGORIES = ["signed", "apparel", "home"];
var PLATFORM_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  goodreads: "Goodreads",
  amazonAuthor: "Amazon author page"
};
var FILE_SLUGS = /* @__PURE__ */ new Set([
  "surviving-into-story",
  "reading-the-price-series",
  "grace-for-ordinary-days",
  "a-garden-still-growing"
]);
var catalog = books_default;
function bookTitle(slug) {
  if (!slug) return null;
  return catalog.find((book) => book.slug === slug)?.title ?? null;
}
function knownBook(slug) {
  if (!slug) return true;
  return catalog.some((book) => book.slug === slug);
}
function isCatalogBook(slug) {
  return catalog.some((book) => book.slug === slug);
}
function asRows(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && Array.isArray(result.rows)) {
    return result.rows;
  }
  return [];
}
function connectionString() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Database is not configured.");
  return url;
}
function database() {
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
      }
    }
  };
}
async function query(result) {
  return asRows(await Promise.resolve(result));
}
function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function cleanUrl(value) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (url.length > 300 || !/^https:\/\/[^\s]+$/i.test(url)) {
    throw new Error("Profile links must be https addresses.");
  }
  return url;
}

// netlify/functions/_shared/http.ts
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex"
    }
  });
}
async function readJson2(req) {
  const raw = await req.text();
  if (raw.length > 1e5) throw new Error("That was too long to save.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Could not read that.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Could not read that.");
  return data;
}
function text(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
function uniqueViolation(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("23505") || message.toLowerCase().includes("unique");
}

// netlify/functions/checkout.ts
function logSafe(error) {
  const raw = error instanceof Error ? error.message : "Checkout failed";
  console.error(raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]"));
}
var checkout_default = async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await readJson2(req);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const quantity = body.quantity;
    if (!slug) return json({ error: "Choose a piece from the shop." }, 400);
    if (isCatalogBook(slug)) return json({ error: "Books are bought from the retailers on the book page." }, 400);
    const secret = stripeSecret();
    if (!secret) return json({ error: "Card checkout is not set up yet." }, 503);
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: "Choose a quantity between 1 and 20." }, 400);
    }
    const db = database();
    const rows = await query(db.sql`
      SELECT id, slug, name, description, price_cents, currency, stock, has_image, checkout_url
      FROM products WHERE slug = ${slug} AND status = 'listed' LIMIT 1
    `);
    const product = rows[0];
    if (!product) return json({ error: "That piece is not on the shop." }, 404);
    if (typeof product.checkout_url === "string" && product.checkout_url.trim()) {
      return json({ error: "This piece is purchased through its checkout link." }, 400);
    }
    const stock = Number(product.stock);
    const priceCents = Number(product.price_cents);
    if (!Number.isInteger(stock) || stock < quantity) {
      return json({ error: "There are not that many left." }, 409);
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return json({ error: "This piece does not have a price yet." }, 400);
    }
    const currency = String(product.currency || "USD").toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) return json({ error: "This piece does not have a price yet." }, 400);
    const origin = checkoutOrigin(req);
    const itemPath = `/merch/item/${encodeURIComponent(product.slug)}`;
    const image = product.has_image && origin.startsWith("https://") ? `${origin}/api/media/product/${product.id}` : "";
    const description = String(product.description || "").trim().slice(0, 5e3);
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      line_items: [
        {
          quantity,
          price_data: {
            currency,
            unit_amount: priceCents,
            product_data: {
              name: String(product.name).slice(0, 250),
              ...description ? { description } : {},
              ...image ? { images: [image] } : {}
            }
          }
        }
      ],
      metadata: {
        product_id: String(product.id),
        slug: product.slug,
        quantity: String(quantity)
      },
      success_url: `${origin}${itemPath}?checkout=success`,
      cancel_url: `${origin}${itemPath}?checkout=cancel`
    });
    if (!session.url) return json({ error: "Checkout could not be started." }, 502);
    return json({ url: session.url });
  } catch (error) {
    logSafe(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Could not read that." || message === "That was too long to save.") {
      return json({ error: "Could not read that." }, 400);
    }
    return json({ error: "Checkout could not be started." }, 502);
  }
};

// netlify/functions/_shared/prose.ts
var ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ESCAPE[char]);
}
function inline(value) {
  let text2 = escapeHtml(value.trim());
  text2 = text2.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (match, label, href) => {
    if (href.startsWith("//") || href.includes("&quot;") || href.includes("<") || href.includes("javascript:")) return match;
    return `<a href="${href}">${label}</a>`;
  });
  text2 = text2.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text2 = text2.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text2;
}
function renderProse(source) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  if (!source.trim()) return "";
  return blocks.map((block) => {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return "";
    if (lines.every((line) => line.startsWith("### "))) {
      return lines.map((line) => `<h3>${inline(line.slice(4))}</h3>`).join("");
    }
    if (lines.every((line) => line.startsWith("## "))) {
      return lines.map((line) => `<h2>${inline(line.slice(3))}</h2>`).join("");
    }
    if (lines.every((line) => line.startsWith("> "))) {
      return `<blockquote><p>${lines.map((line) => inline(line.slice(2))).join("<br>")}</p></blockquote>`;
    }
    return `<p>${lines.map((line) => inline(line)).join("<br>")}</p>`;
  }).join("\n");
}
function slugify(value) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

// netlify/functions/_shared/shell.ts
function page(options) {
  const css = options.extraCss ? `<link rel="stylesheet" href="/css/${options.extraCss}?v=2026-09-25b" />` : "";
  const ld = options.jsonLd ? `<script type="application/ld+json">${JSON.stringify(options.jsonLd)}</script>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)} \u2014 Courtney Thomas</title>
  <meta name="description" content="${escapeHtml(options.description)}" />
  <link rel="stylesheet" href="/css/fonts.css?v=2026-09-25b" />
  <link rel="stylesheet" href="/css/styles.css?v=2026-09-25b" />
  <link rel="stylesheet" href="/css/components.css?v=2026-09-25b" />
  ${css}
  ${ld}
</head>
<body class="${escapeHtml(options.bodyClass || "blog-page")}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-nav" data-nav>
    <a class="brand" href="/">Courtney Thomas</a>
    <button class="nav-toggle" type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" hidden>
      <span class="nav-toggle__bars" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="nav-toggle__label">Menu</span>
    </button>
    <nav class="nav-menu" id="nav-menu" aria-label="Primary">
      <ul class="nav-list">
        <li class="nav-item"><a href="/bookshelf.html">Books</a></li>
        <li class="nav-item"><a href="/merch.html">Shop</a></li>
        <li class="nav-item"><a href="/#about">About</a></li>
        <li class="nav-item"><a href="/blog/">Journal</a></li>
        <li class="nav-item"><a href="/#contact">Contact</a></li>
      </ul>
    </nav>
  </header>
  <main id="main">
    ${options.main}
  </main>
  <footer class="site-footer" id="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/">Courtney Thomas</a>
        <p>Stories for the chapters we survive.</p>
        <p class="footer-note">In print worldwide through IngramSpark</p>
      </div>
      <nav class="footer-col" aria-labelledby="footer-books-h">
        <h2 class="footer-col__h" id="footer-books-h">Books</h2>
        <ul class="footer-list">
          ${books_default.map((book) => `<li><a href="/books/${escapeHtml(book.slug)}.html">${escapeHtml(book.title)}</a></li>`).join("")}
        </ul>
      </nav>
      <nav class="footer-col" aria-labelledby="footer-about-h">
        <h2 class="footer-col__h" id="footer-about-h">About</h2>
        <ul class="footer-list">
          <li><a href="/#about">About Courtney</a></li>
          <li><a href="/blog/">Journal</a></li>
          <li><a href="/merch.html">Shop</a></li>
          <li><a href="/#contact">Contact</a></li>
        </ul>
      </nav>
      <div class="footer-col footer-col--connect">
        <h2 class="footer-col__h">Connect</h2>
        <ul class="footer-list footer-list--inline">
          <li><a href="https://www.facebook.com/profile.php?id=61593191562395" rel="me noopener">Facebook</a></li>
          <li><a href="/blog/rss.xml" type="application/rss+xml">RSS feed</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p class="footer-legal__copy">\xA9 ${(/* @__PURE__ */ new Date()).getUTCFullYear()} Courtney Thomas</p>
      <nav class="footer-legal__nav" aria-label="Legal">
        <a href="/privacy.html">Privacy</a>
        <a href="/accessibility.html">Accessibility</a>
      </nav>
    </div>
  </footer>
  <script src="/js/nav.js?v=2026-09-25b" defer></script>
  <script src="/js/desk.js?v=2026-09-27b" defer></script>
</body>
</html>`;
}

// netlify/functions/journal-page.ts
var journal_page_default = async (req) => {
  const slug = (new URL(req.url).searchParams.get("slug") || "").replace(/\.html$/, "");
  const rows = await query(database().sql`
    SELECT title, description, body_html, related_book, published_at
    FROM journal_posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
  `);
  const post = rows[0];
  if (!post) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  const when = iso(post.published_at);
  const related = bookTitle(post.related_book);
  const dated = when ? new Date(when).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
  const html = page({
    title: String(post.title),
    description: String(post.description || post.title),
    main: `<article class="post-body">
      <p class="post-meta"><time datetime="${when || ""}">${escapeHtml(dated)}</time></p>
      <h1>${escapeHtml(String(post.title))}</h1>
      ${post.body_html || ""}
    </article>
    ${related ? `<section class="related-books"><p class="eyebrow">Books in this post</p><ul><li><a href="/books/${escapeHtml(String(post.related_book))}.html">${escapeHtml(related)}</a></li></ul></section>` : ""}`
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};

// netlify/functions/_shared/auth.ts
import { createHash, createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(scryptCb);
var SESSION_COOKIE = "ct_session";
var SESSION_TTL_SECONDS = 60 * 60 * 12;
function configured() {
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
  const secret = process.env.SESSION_SECRET?.trim() ?? "";
  if (!email || !passwordHash || !secret) return null;
  return { email, passwordHash, secret };
}
function authConfigured() {
  return configured() !== null;
}
function emailsMatch(provided, expected) {
  const a = createHash("sha256").update(provided.trim().toLowerCase()).digest();
  const b = createHash("sha256").update(expected.trim().toLowerCase()).digest();
  return timingSafeEqual(a, b);
}
async function verifyPassword(password, stored2) {
  const parts = stored2.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[1], "base64url");
    expected = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  if (salt.length < 8 || expected.length < 16) return false;
  const actual = await scrypt(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
async function credentialsMatch(email, password) {
  const settings = configured();
  if (!settings) return false;
  if (password.length === 0 || password.length > 200) return false;
  const passwordOk = await verifyPassword(password, settings.passwordHash);
  const emailOk = emailsMatch(email, settings.email);
  return emailOk && passwordOk;
}
function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
function createSession(email) {
  const settings = configured();
  if (!settings) return null;
  const body = {
    sub: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1e3) + SESSION_TTL_SECONDS
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload, settings.secret)}`;
}
function readSession(token) {
  const settings = configured();
  if (!settings || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload, settings.secret);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1e3)) return null;
    if (!emailsMatch(data.sub, settings.email)) return null;
    return data;
  } catch {
    return null;
  }
}
function readCookie(req, name) {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}
function sessionFromRequest(req) {
  return readSession(readCookie(req, SESSION_COOKIE));
}
function sessionCookie(token, req, maxAge = SESSION_TTL_SECONDS) {
  const host = new URL(req.url).hostname;
  const secure = host !== "localhost" && host !== "127.0.0.1";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

// netlify/functions/_shared/limit.ts
import { createHash as createHash2 } from "node:crypto";
var memory = /* @__PURE__ */ new Map();
var ready = null;
function ensure() {
  if (!ready) {
    ready = database().sql.query(`CREATE TABLE IF NOT EXISTS request_limits (
      bucket varchar(64) PRIMARY KEY,
      hits integer NOT NULL,
      window_start timestamptz NOT NULL
    )`).then(() => void 0).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
function clientAddress(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim() || "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(first) || /^[a-f0-9:]+$/i.test(first)) return first.slice(0, 80);
  return "unknown";
}
function bucketFor(req, kind) {
  return createHash2("sha256").update(`${kind}:${clientAddress(req)}`).digest("hex").slice(0, 40);
}
function cache(bucket, window) {
  memory.set(bucket, window);
  if (memory.size > 5e3) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
}
function exceeded(window, max, windowMs) {
  if (!window) return false;
  if (Date.now() - window.start > windowMs) return false;
  return window.hits > max;
}
async function stored(bucket) {
  await ensure();
  const rows = await query(database().sql`
    SELECT hits, window_start FROM request_limits WHERE bucket = ${bucket} LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;
  const start = new Date(String(row.window_start)).getTime();
  return { hits: Number(row.hits) || 0, start: Number.isFinite(start) ? start : 0 };
}
async function save(bucket, hits, start) {
  const at = new Date(start).toISOString();
  await database().sql`
    INSERT INTO request_limits (bucket, hits, window_start)
    VALUES (${bucket}, ${hits}, ${at})
    ON CONFLICT (bucket) DO UPDATE SET hits = ${hits}, window_start = ${at}
  `;
}
async function blocked(req, kind, max, windowSeconds) {
  const bucket = bucketFor(req, kind);
  const windowMs = windowSeconds * 1e3;
  if (exceeded(memory.get(bucket), max, windowMs)) return true;
  try {
    const row = await stored(bucket);
    if (row) cache(bucket, row);
    return exceeded(row ?? void 0, max, windowMs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "limit");
    return exceeded(memory.get(bucket), max, windowMs);
  }
}
async function recordAttempt(req, kind, max, windowSeconds) {
  const bucket = bucketFor(req, kind);
  const windowMs = windowSeconds * 1e3;
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
async function clearAttempts(req, kind) {
  const bucket = bucketFor(req, kind);
  memory.delete(bucket);
  try {
    await ensure();
    await database().sql`DELETE FROM request_limits WHERE bucket = ${bucket}`;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "limit");
  }
}

// netlify/functions/login.ts
var json2 = (body, status, setCookie) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
    ...setCookie ? { "Set-Cookie": setCookie } : {}
  }
});
var login_default = async (req) => {
  if (req.method !== "POST") {
    return json2({ error: "Method not allowed" }, 405);
  }
  if (!browserOriginAllowed(req)) {
    return json2({ error: "Email or password was not accepted." }, 403);
  }
  if (await blocked(req, "login", 12, 15 * 60)) {
    return json2({ error: "Try again in a little while." }, 429);
  }
  if (!authConfigured()) {
    return json2({ error: "Admin login is not configured on this site." }, 500);
  }
  const raw = await req.text();
  if (raw.length > 2048) {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json2({ error: "Try again in a little while." }, 429);
    }
    return json2({ error: "Email or password was not accepted." }, 401);
  }
  let email = "";
  let password = "";
  try {
    const body = JSON.parse(raw);
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json2({ error: "Try again in a little while." }, 429);
    }
    return json2({ error: "Email or password was not accepted." }, 401);
  }
  const accepted = await credentialsMatch(email, password);
  if (!accepted) {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json2({ error: "Try again in a little while." }, 429);
    }
    return json2({ error: "Email or password was not accepted." }, 401);
  }
  await clearAttempts(req, "login");
  const token = createSession(email);
  if (!token) {
    return json2({ error: "Admin login is not configured on this site." }, 500);
  }
  return json2({ ok: true, email: email.trim().toLowerCase() }, 200, sessionCookie(token, req));
};

// netlify/functions/logout.ts
var logout_default = async (req) => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Set-Cookie": sessionCookie("", req, 0)
    }
  });
};

// netlify/functions/messages.ts
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var ready2 = null;
function ensureMessages() {
  if (!ready2) {
    ready2 = database().sql.query(`CREATE TABLE IF NOT EXISTS messages (
      id serial PRIMARY KEY,
      kind varchar(20) NOT NULL,
      name varchar(160) NOT NULL DEFAULT '',
      email varchar(180) NOT NULL,
      body text NOT NULL DEFAULT '',
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT messages_kind_check CHECK (kind IN ('newsletter', 'note'))
    )`).then(() => void 0).catch((error) => {
      ready2 = null;
      throw error;
    });
  }
  return ready2;
}
async function fieldsOf(req) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await readJson2(req);
    const out2 = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") out2[key] = value;
    }
    return out2;
  }
  const form = await req.formData();
  const out = {};
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}
function finish(req, ok, message) {
  if ((req.headers.get("accept") || "").includes("application/json")) {
    return json(ok ? { ok: true } : { error: message }, ok ? 200 : 400);
  }
  if (ok) return Response.redirect(`${siteOrigin(req)}/thank-you.html`, 303);
  return new Response(message, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
}
async function messages(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!browserOriginAllowed(req)) return finish(req, false, "That could not be saved.");
  if (await blocked(req, "letter", 8, 60 * 60)) return json({ error: "Try again in a little while." }, 429);
  try {
    const fields = await fieldsOf(req);
    if (text(fields["bot-field"], 200)) return finish(req, true, "");
    if (await recordAttempt(req, "letter", 8, 60 * 60)) return json({ error: "Try again in a little while." }, 429);
    const formName = text(fields["form-name"], 40);
    const kind = formName === "notes" ? "note" : formName === "newsletter" ? "newsletter" : "";
    if (!kind) return finish(req, false, "That form was not recognized.");
    const email = text(fields.email, 180).toLowerCase();
    const name = text(fields.name, 160);
    const body = text(fields.message, 4e3);
    if (!EMAIL.test(email)) return finish(req, false, "Enter a real email address.");
    if (kind === "note" && (!name || !body)) return finish(req, false, "A name and a note are needed.");
    await ensureMessages();
    const db = database();
    await db.sql`
      INSERT INTO messages (kind, name, email, body)
      VALUES (${kind}, ${name}, ${email}, ${body})
    `;
    return finish(req, true, "");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "letter");
    return finish(req, false, "That could not be saved.");
  }
}
async function listMessages() {
  await ensureMessages();
  const rows = await query(database().sql`
    SELECT id, kind, name, email, body, read, created_at
    FROM messages ORDER BY created_at DESC LIMIT 100
  `);
  return rows.map((row) => ({
    id: Number(row.id),
    kind: String(row.kind),
    name: String(row.name || ""),
    email: String(row.email || ""),
    body: String(row.body || ""),
    read: row.read === true,
    createdAt: iso(row.created_at)
  }));
}

// netlify/functions/media.ts
var media_default = async (req) => {
  const id = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const stored2 = await readPhoto(Number(id));
  if (!stored2) return new Response("Not found", { status: 404 });
  return new Response(stored2.data, {
    headers: {
      "content-type": stored2.contentType,
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff"
    }
  });
};

// netlify/functions/orders.ts
var orders_default = async (req) => {
  if (stripeConfigured()) {
    return json({ error: "This piece is purchased through checkout." }, 400);
  }
  try {
    const body = await readJson2(req);
    const slug = text(body.slug, 120);
    const name = text(body.name, 160);
    const email = text(body.email, 180);
    const address = text(body.address, 500);
    const note = text(body.note, 800);
    const quantity = body.quantity;
    if (isCatalogBook(slug)) return json({ error: "Books are bought from the retailers on the book page." }, 400);
    if (!slug || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !address) {
      return json({ error: "Add your name, email, and where it should ship." }, 400);
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: "Choose a quantity between 1 and 20." }, 400);
    }
    const db = database();
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        "SELECT id, stock, checkout_url, status FROM products WHERE slug = $1 FOR UPDATE",
        [slug]
      );
      const product = found.rows[0];
      if (!product || product.status !== "listed") {
        await client.query("ROLLBACK");
        return json({ error: "That piece is not on the shop." }, 404);
      }
      if (product.checkout_url) {
        await client.query("ROLLBACK");
        return json({ error: "This piece is purchased through its checkout link." }, 400);
      }
      if (product.stock < quantity) {
        await client.query("ROLLBACK");
        return json({ error: "There are not that many left." }, 409);
      }
      await client.query("UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2", [quantity, product.id]);
      const inserted = await client.query(
        `INSERT INTO orders (product_id, quantity, buyer_name, buyer_email, address, note)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [product.id, quantity, name, email, address, note]
      );
      await client.query("COMMIT");
      return json({ ok: true, orderId: inserted.rows[0].id }, 201);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return json({ error: "The order could not be saved." }, 503);
  }
};

// netlify/functions/product-page.ts
function money(cents, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
function scriptString(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function checkoutBanner(flag) {
  if (flag === "success") {
    return `<p class="form-note" role="status">${escapeHtml("Payment received. Courtney will write about shipping.")}</p>`;
  }
  if (flag === "cancel") {
    return `<p class="form-note" role="status">${escapeHtml("Checkout was canceled. Nothing was charged.")}</p>`;
  }
  return "";
}
var product_page_default = async (req) => {
  const slug = (new URL(req.url).searchParams.get("slug") || "").replace(/\.html$/, "");
  const db = database();
  const rows = await query(db.sql`SELECT * FROM products WHERE slug = ${slug} AND status = 'listed' LIMIT 1`);
  const product = rows[0];
  if (!product) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  const pageUrl = new URL(req.url);
  const origin = pageUrl.origin;
  const updated = iso(product.updated_at);
  const image = product.has_image ? `${origin}/api/media/product/${product.id}?v=${encodeURIComponent(updated || "")}` : "";
  const name = escapeHtml(String(product.name));
  const price = money(Number(product.price_cents), String(product.currency || "USD"));
  const stock = Number(product.stock);
  const inStock = stock > 0;
  const checkout = typeof product.checkout_url === "string" && product.checkout_url.trim() ? escapeHtml(product.checkout_url) : "";
  const stripeOn = stripeConfigured();
  const maxQuantity = Math.min(20, Math.max(1, stock));
  const details = renderProse(String(product.details || ""));
  const banner = checkoutBanner(pageUrl.searchParams.get("checkout"));
  const buy = checkout ? `<a class="btn btn--primary" href="${checkout}">Buy<span class="visually-hidden">: ${name}</span></a>` : stripeOn && inStock ? `<form class="order-form" id="checkout-form">
          <label>Quantity <input name="quantity" type="number" min="1" max="${maxQuantity}" value="1" required /></label>
          <button class="btn btn--primary" type="submit">Buy<span class="visually-hidden">: ${name}</span></button>
          <p class="form-note" id="checkout-note" hidden></p>
        </form>` : !stripeOn && inStock ? `<form class="order-form" id="order-form">
          <label>Name <input name="name" autocomplete="name" required /></label>
          <label>Email <input name="email" type="email" autocomplete="email" required /></label>
          <label>Quantity <input name="quantity" type="number" min="1" max="${maxQuantity}" value="1" required /></label>
          <label>Ship to <textarea name="address" required></textarea></label>
          <label>Note <textarea name="note"></textarea></label>
          <button type="submit">Order from Courtney</button>
          <p class="form-note" id="order-note" hidden></p>
        </form>` : `<p class="pill pill--outline">Sold out</p>`;
  const html = page({
    title: String(product.name),
    description: String(product.description || product.name),
    extraCss: "shop.css",
    bodyClass: "book-page shop-page",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: image || void 0,
      offers: {
        "@type": "Offer",
        priceCurrency: product.currency || "USD",
        price: (Number(product.price_cents) / 100).toFixed(2),
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `${origin}/merch/item/${product.slug}`
      }
    },
    main: `<article class="wrap product-page">
      <p class="eyebrow"><a href="/merch.html">The Shop</a></p>
      <div class="product-page__grid">
        <div class="product-page__photo">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(String(product.image_alt || product.name))}" />` : `<span class="product-card__blank"></span>`}</div>
        <div>
          <h1>${name}</h1>
          <p class="product-page__price">${price}${inStock ? "" : " \xB7 Sold out"}</p>
          <p>${escapeHtml(String(product.description || ""))}</p>
          <p class="product-page__ship">${escapeHtml(String(product.shipping_note || ""))}</p>
          <p class="product-page__ship">The books themselves are sold on each book page.</p>
          ${banner}
          ${buy}
        </div>
      </div>
      <div class="product-page__details post-body">${details}</div>
    </article>
    <script>
      var slug = ${scriptString(String(product.slug))};
      var orderForm = document.getElementById("order-form");
      if (orderForm) orderForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(orderForm);
        var note = document.getElementById("order-note");
        fetch("/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: slug,
            name: data.get("name"),
            email: data.get("email"),
            quantity: Number(data.get("quantity")),
            address: data.get("address"),
            note: data.get("note")
          })
        }).then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
          .then(function (result) {
            note.hidden = false;
            note.textContent = result.ok ? "Order received. Courtney will write back to confirm it." : (result.body.error || "The order could not be sent.");
            if (result.ok) orderForm.reset();
          });
      });
      var checkoutForm = document.getElementById("checkout-form");
      if (checkoutForm) checkoutForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var note = document.getElementById("checkout-note");
        var button = checkoutForm.querySelector("button");
        if (button) button.disabled = true;
        fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: slug, quantity: Number(new FormData(checkoutForm).get("quantity")) })
        }).then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
          .then(function (result) {
            if (result.ok && result.body && typeof result.body.url === "string" && result.body.url.indexOf("https://") === 0) {
              location.href = result.body.url;
              return;
            }
            note.hidden = false;
            note.textContent = (result.body && result.body.error) || "Checkout could not be started.";
            if (button) button.disabled = false;
          }).catch(function () {
            note.hidden = false;
            note.textContent = "Checkout could not be started.";
            if (button) button.disabled = false;
          });
      });
    </script>`
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};

// netlify/functions/public.ts
var public_default = async (req) => {
  const url = new URL(req.url);
  try {
    const db = database();
    if (url.pathname === "/api/journal") {
      const rows2 = await query(db.sql`
        SELECT slug, title, description, related_book, published_at
        FROM journal_posts WHERE status = 'published'
        ORDER BY published_at DESC
      `);
      return json({
        posts: rows2.map((row) => ({
          slug: row.slug,
          title: row.title,
          description: row.description,
          date: iso(row.published_at),
          url: `/blog/posts/${row.slug}.html`,
          relatedBook: row.related_book,
          relatedTitle: bookTitle(row.related_book)
        }))
      });
    }
    if (url.pathname === "/api/connect") {
      const rows2 = await query(db.sql`SELECT platform, url FROM social_profiles WHERE url IS NOT NULL`);
      const links = PLATFORMS.flatMap((platform) => {
        const row = rows2.find((item) => item.platform === platform);
        return row?.url ? [{ label: PLATFORM_LABELS[platform], href: String(row.url) }] : [];
      });
      return json({ links });
    }
    const rows = await query(db.sql`
      SELECT id, slug, name, description, price_cents, currency, category, stock, has_image, image_alt, updated_at
      FROM products WHERE status = 'listed' ORDER BY name
    `);
    return json({
      categories: [
        { key: "signed", label: "Signed copies", blurb: "Signed books, and the baskets sent from Courtney." },
        { key: "apparel", label: "Apparel", blurb: "The Bookworm cap, and room for more." },
        { key: "home", label: "For the reading nook", blurb: "Handmade pieces for the shelf." }
      ],
      products: rows.map((row) => {
        const updated = iso(row.updated_at);
        return {
          slug: row.slug,
          name: row.name,
          description: row.description,
          priceCents: row.price_cents,
          currency: row.currency,
          category: row.category,
          inStock: Number(row.stock) > 0,
          image: row.has_image ? `/api/media/product/${row.id}?v=${encodeURIComponent(updated || "")}` : null,
          imageAlt: row.image_alt || row.name,
          url: `/merch/item/${row.slug}`
        };
      })
    });
  } catch (error) {
    console.error(error);
    return json({ posts: [], links: [], products: [], categories: [] });
  }
};

// netlify/functions/stripe-webhook.ts
import Stripe2 from "stripe";
function logSafe2(error) {
  const raw = error instanceof Error ? error.message : "Webhook failed";
  console.error(raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]"));
}
function formatAddress(address) {
  if (!address) return "";
  const cityLine = [address.city, address.state, address.postal_code].filter((part) => part && part.trim()).join(", ");
  return [address.line1, address.line2, cityLine, address.country].filter((part) => typeof part === "string" && part.trim().length > 0).join("\n");
}
function clip(value, max) {
  return value.trim().slice(0, max);
}
async function recordPaidOrder(session) {
  const quantity = Number(session.metadata?.quantity);
  const productId = Number(session.metadata?.product_id);
  if (!session.id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !Number.isInteger(productId) || productId < 1) {
    console.error(`Paid Stripe session ${session.id || "unknown"} has unusable order metadata.`);
    return json({ error: "Order metadata is incomplete." }, 500);
  }
  const shipping = session.collected_information?.shipping_details;
  const email = clip(session.customer_details?.email || session.customer_email || "", 180);
  if (!email) {
    console.error(`Paid Stripe session ${session.id} has no customer email.`);
    return json({ error: "Customer email is missing." }, 500);
  }
  const buyerName = clip(shipping?.name || session.customer_details?.name || session.customer_details?.individual_name || "Buyer", 160) || "Buyer";
  const address = formatAddress(shipping?.address || session.customer_details?.address);
  const db = database();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO orders (product_id, quantity, buyer_name, buyer_email, address, note, status, paid, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', true, $7)
       ON CONFLICT (stripe_session_id) DO NOTHING
       RETURNING id`,
      [productId, quantity, buyerName, email, address, "Paid through Stripe Checkout.", session.id]
    );
    if (!inserted.rows[0]) {
      await client.query("COMMIT");
      return json({ received: true });
    }
    const locked = await client.query("SELECT stock FROM products WHERE id = $1 FOR UPDATE", [productId]);
    const stock = Number(locked.rows[0]?.stock ?? 0);
    if (stock < quantity) {
      console.error(
        `Paid Stripe session ${session.id} for product ${productId} asked for ${quantity} but only ${stock} remain. Stock will not go below zero.`
      );
    }
    await client.query("UPDATE products SET stock = $1, updated_at = now() WHERE id = $2", [
      Math.max(0, stock - quantity),
      productId
    ]);
    await client.query("COMMIT");
    return json({ received: true });
  } catch (error) {
    await client.query("ROLLBACK");
    if (uniqueViolation(error)) return json({ received: true });
    throw error;
  } finally {
    client.release();
  }
}
var stripe_webhook_default = async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const signingSecret = webhookSecret();
  if (!signingSecret) return json({ error: "Stripe webhook is not configured." }, 500);
  if (!stripeSecret()) return json({ error: "Card checkout is not set up yet." }, 500);
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature." }, 400);
  let event;
  try {
    const stripe = new Stripe2(stripeSecret());
    event = stripe.webhooks.constructEvent(payload, signature, signingSecret);
  } catch (error) {
    logSafe2(error);
    return json({ error: "Invalid signature." }, 400);
  }
  if (event.type !== "checkout.session.completed") return json({ received: true });
  const session = event.data.object;
  if (session.payment_status !== "paid") return json({ received: true });
  try {
    return await recordPaidOrder(session);
  } catch (error) {
    logSafe2(error);
    return json({ error: "The order could not be recorded." }, 500);
  }
};

// netlify/functions/studio.ts
function gate(req) {
  if (!browserOriginAllowed(req)) return json({ error: "Unauthorized" }, 403);
  if (!sessionFromRequest(req)) return json({ error: "Unauthorized" }, 401);
  return null;
}
function fail(error) {
  if (error instanceof Error && !uniqueViolation(error)) {
    const message = error.message || "";
    const ownMessage = message.length > 0 && message.length < 160 && !/connect|postgres|secret|password|token|:\/\//i.test(message);
    if (ownMessage) return json({ error: message }, 400);
  }
  if (uniqueViolation(error)) return json({ error: "That address is already in use." }, 409);
  console.error(error);
  return json({ error: "The desk could not reach its records." }, 503);
}
function postView(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    status: row.status,
    relatedBook: row.related_book,
    relatedTitle: bookTitle(row.related_book),
    publishedAt: iso(row.published_at),
    updatedAt: iso(row.updated_at)
  };
}
function productView(row) {
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
    updatedAt: updated
  };
}
async function ensureProfiles() {
  const db = database();
  for (const platform of PLATFORMS) {
    await db.sql`INSERT INTO social_profiles (platform, label) VALUES (${platform}, ${PLATFORM_LABELS[platform]}) ON CONFLICT (platform) DO NOTHING`;
  }
}
async function posts(req, id) {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query(db.sql`SELECT * FROM journal_posts ORDER BY updated_at DESC`);
    return json({ posts: rows.map(postView) });
  }
  if (req.method === "POST" && !id) {
    const body = await readJson2(req);
    const title = text(body.title, 220);
    if (!title) return json({ error: "Give the piece a title." }, 400);
    const slug = slugify(text(body.slug, 120) || title);
    if (!slug || FILE_SLUGS.has(slug)) return json({ error: "Choose a different web address for this piece." }, 400);
    const manuscript = text(body.body, 2e4);
    const status = body.status === "published" ? "published" : "draft";
    const related = text(body.relatedBook, 120) || null;
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const rows = await query(db.sql`
      INSERT INTO journal_posts (slug, title, description, body, body_html, status, related_book, published_at)
      VALUES (
        ${slug}, ${title}, ${text(body.description, 400)}, ${manuscript}, ${renderProse(manuscript)},
        ${status}, ${related}, ${status === "published" ? (/* @__PURE__ */ new Date()).toISOString() : null}
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
    const current = await query(db.sql`SELECT * FROM journal_posts WHERE id = ${Number(id)} LIMIT 1`);
    if (!current[0]) return json({ error: "That piece is not on the desk." }, 404);
    const body = await readJson2(req);
    const title = text(body.title, 220) || String(current[0].title);
    const slug = slugify(text(body.slug, 120) || title);
    if (!slug || FILE_SLUGS.has(slug)) return json({ error: "Choose a different web address for this piece." }, 400);
    const manuscript = body.body === void 0 ? String(current[0].body) : text(body.body, 2e4);
    const status = POST_STATUSES.includes(body.status) ? String(body.status) : String(current[0].status);
    const related = body.relatedBook === void 0 ? current[0].related_book : text(body.relatedBook, 120) || null;
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const publishedAt = status === "published" ? current[0].published_at ? iso(current[0].published_at) : (/* @__PURE__ */ new Date()).toISOString() : null;
    const rows = await query(db.sql`
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
async function social(req, id) {
  const db = database();
  if (req.method === "GET" && !id) {
    await ensureProfiles();
    const profiles2 = await query(db.sql`SELECT * FROM social_profiles ORDER BY platform`);
    const pieces = await query(db.sql`SELECT * FROM social_pieces ORDER BY updated_at DESC`);
    return json({
      profiles: profiles2.map((row) => ({ platform: row.platform, label: row.label, url: row.url })),
      pieces: pieces.map((row) => ({
        id: row.id,
        platform: row.platform,
        title: row.title,
        caption: row.caption,
        status: row.status,
        relatedBook: row.related_book,
        relatedTitle: bookTitle(row.related_book),
        updatedAt: iso(row.updated_at)
      }))
    });
  }
  if (req.method === "POST" && !id) {
    const body = await readJson2(req);
    const platform = String(body.platform || "");
    if (!PLATFORMS.includes(platform)) return json({ error: "Choose a platform." }, 400);
    const caption = text(body.caption, 2200);
    if (!caption) return json({ error: "Write the caption first." }, 400);
    const status = PIECE_STATUSES.includes(body.status) ? String(body.status) : "idea";
    const related = text(body.relatedBook, 120) || null;
    if (related && !knownBook(related)) return json({ error: "That book is not on the shelf." }, 400);
    const rows = await query(db.sql`
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
    const body = await readJson2(req);
    const platform = String(body.platform || "");
    if (!PLATFORMS.includes(platform)) return json({ error: "Choose a platform." }, 400);
    const status = PIECE_STATUSES.includes(body.status) ? String(body.status) : "idea";
    const related = text(body.relatedBook, 120) || null;
    const rows = await query(db.sql`
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
async function profiles(req) {
  if (req.method !== "PATCH") return json({ error: "Method not allowed" }, 405);
  const body = await readJson2(req);
  const db = database();
  await ensureProfiles();
  for (const platform of PLATFORMS) {
    if (!(platform in body)) continue;
    const url = cleanUrl(body[platform]);
    await db.sql`UPDATE social_profiles SET url = ${url}, updated_at = now() WHERE platform = ${platform}`;
  }
  const rows = await query(db.sql`SELECT platform, label, url FROM social_profiles ORDER BY platform`);
  return json({ profiles: rows });
}
function money2(value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1e8) {
    throw new Error("Enter a price in cents.");
  }
  return value;
}
async function saveProduct(req, id) {
  const body = await readJson2(req);
  const name = text(body.name, 180);
  if (!name) return json({ error: "Name the product." }, 400);
  const slug = slugify(text(body.slug, 120) || name);
  if (!slug) return json({ error: "Choose a web address for this product." }, 400);
  if (isCatalogBook(slug)) return json({ error: "That address belongs to a book. Books stay on the retailer links." }, 400);
  const category = String(body.category || "signed");
  if (!CATEGORIES.includes(category)) return json({ error: "Choose a shop category." }, 400);
  const status = body.status === "listed" ? "listed" : "draft";
  const price = money2(body.priceCents);
  const stock = body.stock;
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > 1e4) {
    return json({ error: "Enter how many are ready to ship." }, 400);
  }
  let checkout = null;
  if (body.checkoutUrl) checkout = cleanUrl(body.checkoutUrl);
  const description = text(body.description, 400);
  const details = text(body.details, 8e3);
  const shipping = text(body.shippingNote, 240) || "Ships from Courtney.";
  const db = database();
  if (status === "listed") {
    const existing = id ? await query(db.sql`SELECT has_image FROM products WHERE id = ${id} LIMIT 1`) : [];
    if (!existing[0]?.has_image) return json({ error: "Add a photograph before this can go on the shop." }, 400);
    if (!description || price <= 0) return json({ error: "A shop listing needs a price and a short description." }, 400);
  }
  const rows = id ? await query(db.sql`
        UPDATE products SET
          slug = ${slug}, name = ${name}, description = ${description}, details = ${details},
          price_cents = ${price}, category = ${category}, stock = ${stock}, status = ${status},
          checkout_url = ${checkout}, shipping_note = ${shipping}, updated_at = now()
        WHERE id = ${id} RETURNING *
      `) : await query(db.sql`
        INSERT INTO products (slug, name, description, details, price_cents, category, stock, status, checkout_url, shipping_note)
        VALUES (${slug}, ${name}, ${description}, ${details}, ${price}, ${category}, ${stock}, ${status}, ${checkout}, ${shipping})
        RETURNING *
      `);
  if (!rows[0]) return json({ error: "That product is not on the desk." }, 404);
  return json({ product: productView(rows[0]) }, id ? 200 : 201);
}
async function products(req, id, action) {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query(db.sql`SELECT * FROM products ORDER BY updated_at DESC`);
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
    const rows = await query(db.sql`
      UPDATE products SET has_image = true, image_alt = ${alt}, updated_at = now()
      WHERE id = ${productId} RETURNING *
    `);
    if (!rows[0]) return json({ error: "That product is not on the desk." }, 404);
    return json({ product: productView(rows[0]) });
  }
  if (req.method === "DELETE") {
    const orders2 = await query(db.sql`SELECT id FROM orders WHERE product_id = ${productId} LIMIT 1`);
    if (orders2[0]) return json({ error: "This product has orders. Unlist it instead of deleting it." }, 409);
    await db.sql`DELETE FROM products WHERE id = ${productId}`;
    try {
      await deletePhoto(productId);
    } catch {
    }
    return json({ ok: true });
  }
  if (req.method === "PATCH") return saveProduct(req, productId);
  return json({ error: "Method not allowed" }, 405);
}
async function letters(req, id) {
  if (req.method === "GET" && !id) return json({ messages: await listMessages() });
  if (req.method === "PATCH" && id && /^\d+$/.test(id)) {
    await ensureMessages();
    await database().sql`UPDATE messages SET read = true WHERE id = ${Number(id)}`;
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}
async function orders(req, id) {
  const db = database();
  if (req.method === "GET" && !id) {
    const rows = await query(db.sql`
      SELECT o.id, o.quantity, o.buyer_name, o.buyer_email, o.address, o.note, o.status, o.paid, o.created_at,
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
        paid: row.paid === true,
        productName: row.product_name,
        productSlug: row.product_slug,
        createdAt: iso(row.created_at)
      }))
    });
  }
  if (req.method === "PATCH" && id && /^\d+$/.test(id)) {
    const body = await readJson2(req);
    const status = String(body.status || "");
    if (!["new", "fulfilled", "cancelled"].includes(status)) return json({ error: "Choose an order status." }, 400);
    await db.sql`UPDATE orders SET status = ${status} WHERE id = ${Number(id)}`;
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}
var studio_default = async (req) => {
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
    if (resource === "messages") return await letters(req, id);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
};

// netlify/functions/summary.ts
import { createHash as createHash3, timingSafeEqual as timingSafeEqualBytes } from "node:crypto";
var DEFAULT_DAYS = 14;
var MAX_DAYS = 365;
function timingSafeEqual2(a, b) {
  const left = createHash3("sha256").update(a).digest();
  const right = createHash3("sha256").update(b).digest();
  return timingSafeEqualBytes(left, right);
}
function dayKeys(days) {
  const keys = [];
  const today = /* @__PURE__ */ new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}
function merge(target, source) {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "number") continue;
    target[key] = (target[key] ?? 0) + value;
  }
}
function rank(counts, labelKey) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ [labelKey]: label, count }));
}
var json3 = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex"
  }
});
function keyAccepted(req) {
  const expectedKey = process.env.ANALYTICS_KEY;
  if (!expectedKey) return false;
  const providedKey = req.headers.get("x-analytics-key") || "";
  if (!providedKey) return false;
  return timingSafeEqual2(providedKey, expectedKey);
}
var summary_default = async (req) => {
  const session = sessionFromRequest(req);
  if (!session && !keyAccepted(req)) {
    return json3({ error: "Unauthorized" }, 401);
  }
  const requestedDays = Number(new URL(req.url).searchParams.get("days"));
  const days = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(Math.floor(requestedDays), MAX_DAYS) : DEFAULT_DAYS;
  const dates = dayKeys(days);
  const rollups = await Promise.all(
    dates.map(async (date) => readJson(`analytics/day/${date}.json`))
  );
  const pages = {};
  const referrers = {};
  const events = {};
  const daily = dates.map((date, index) => ({
    date,
    pageviews: rollups[index]?.pageviews ?? 0
  }));
  for (const rollup of rollups) {
    if (!rollup) continue;
    merge(pages, rollup.pages);
    merge(referrers, rollup.referrers);
    merge(events, rollup.events);
  }
  const pageviews = daily.reduce((sum, day) => sum + day.pageviews, 0);
  const eventTotal = Object.values(events).reduce((sum, count) => sum + count, 0);
  return json3(
    {
      range: { days, from: dates[0], to: dates[dates.length - 1] },
      totals: {
        pageviews,
        unique_paths: Object.keys(pages).length,
        referrer_hosts: Object.keys(referrers).length,
        events: eventTotal,
        days_with_data: rollups.filter(Boolean).length
      },
      pages: rank(pages, "path"),
      referrers: rank(referrers, "host"),
      events: rank(events, "event"),
      daily,
      generated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    200
  );
};

// server/gateway.ts
function redact(error) {
  const raw = error instanceof Error ? error.message : "The desk could not answer.";
  return raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]").replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]").slice(0, 180);
}
function publicOrigin(hostHeader, proto) {
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() || "";
  const hostname = host.replace(/:\d+$/, "");
  if ((hostname === "localhost" || hostname === "127.0.0.1") && /^[a-z0-9.:-]+$/.test(host)) {
    const safeProto = proto === "http" ? "http" : "https";
    return `${safeProto}://${host}`;
  }
  return PRODUCTION_ORIGIN;
}
function pathnameOf(req) {
  const url = new URL(req.url);
  const route = url.searchParams.get("route");
  if (route) url.pathname = `/api/${route.replace(/^\/+/, "")}`;
  return url.pathname;
}
async function toRequest(req) {
  if (typeof req.headers.get === "function") return req;
  const nodeReq = req;
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const hostHeader = headers.get("x-forwarded-host") || headers.get("host") || "www.booksbycourtney.site";
  const proto = headers.get("x-forwarded-proto") || "https";
  const url = new URL(nodeReq.url || "/", publicOrigin(hostHeader, proto));
  const chunks = [];
  if (nodeReq.method !== "GET" && nodeReq.method !== "HEAD") {
    for await (const chunk of nodeReq) chunks.push(chunk);
  }
  return new Request(url, {
    method: nodeReq.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : void 0
  });
}
async function dispatch(req) {
  const path = pathnameOf(req);
  const method = req.method;
  if (path === "/api/health") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  if (path === "/api/checkout" && method === "POST") return checkout_default(req);
  if (path === "/api/orders" && method === "POST") return orders_default(req);
  if (path === "/api/messages" && method === "POST") return messages(req);
  if (path === "/api/stripe/webhook" && method === "POST") return stripe_webhook_default(req);
  if (path === "/api/auth/login" && method === "POST") return login_default(req);
  if (path === "/api/auth/logout" && method === "POST") return logout_default(req);
  if ((path === "/api/journal" || path === "/api/connect" || path === "/api/products") && method === "GET") return public_default(req);
  if (path === "/api/analytics/summary" && method === "GET") return summary_default(req);
  if (path === "/api/analytics/collect" && (method === "POST" || method === "OPTIONS")) return collect_default(req);
  if (path.startsWith("/api/media/product/") && method === "GET") return media_default(req);
  if (path === "/api/merch-item" && method === "GET") return product_page_default(req);
  if (path === "/api/journal-post" && method === "GET") return journal_page_default(req);
  if (path.startsWith("/api/studio/")) return studio_default(req);
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}
async function write(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
async function handler(req, res) {
  const finish2 = async (response) => {
    if (res && typeof res.end === "function") {
      await write(res, response);
      return;
    }
    return response;
  };
  try {
    return await finish2(await dispatch(await toRequest(req)));
  } catch (error) {
    console.error(redact(error));
    return finish2(new Response(JSON.stringify({ error: "The desk could not answer." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    }));
  }
}
export {
  handler as default
};
