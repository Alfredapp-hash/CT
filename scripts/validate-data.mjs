// Validates src/_data/*.json. Exit non-zero on any problem.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const books = read("src/_data/books.json");
const site = read("src/_data/site.json");
const author = read("src/_data/author.json");

const errors = [];
const fail = (msg) => errors.push(msg);

// Pixel size of a baseline/progressive JPEG from its first SOFn marker.
function jpegSize(file) {
  if (!existsSync(file)) return null;
  const buf = readFileSync(file);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function isbn13Valid(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  const digits = isbn.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

if (!Array.isArray(books) || books.length !== 7) fail(`books.json must hold 7 records, found ${books?.length}`);

const slugs = new Set();
const seriesOrders = new Set();
const REQUIRED = ["slug", "title", "shelf", "category", "eyebrow", "year", "isbn", "format", "tagline", "blurb", "excerpt", "cover"];
const VARIANTS = [".jpg", "@2x.jpg", ".webp", "@2x.webp"];

for (const b of books) {
  for (const k of REQUIRED) if (b[k] === undefined || b[k] === null || b[k] === "") fail(`${b.slug || "?"}: missing ${k}`);
  if (slugs.has(b.slug)) fail(`duplicate slug ${b.slug}`);
  slugs.add(b.slug);
  if (!/^[a-z0-9-]+$/.test(b.slug || "")) fail(`${b.slug}: slug must be kebab-case`);
  if (!isbn13Valid(b.isbn)) fail(`${b.slug}: ISBN ${b.isbn} fails the ISBN-13 checksum`);
  if (!Number.isInteger(b.year) || b.year < 2000 || b.year > 2100) fail(`${b.slug}: year ${b.year} out of range`);
  if (!["Paperback", "Hardcover"].includes(b.format)) fail(`${b.slug}: unknown format ${b.format}`);
  if (!["novel", "devotional", "nonfiction", "children"].includes(b.category)) fail(`${b.slug}: unknown category ${b.category}`);
  if (!["price-series", "faith-home"].includes(b.shelf)) fail(`${b.slug}: unknown shelf ${b.shelf}`);
  if (b.pages !== null && !Number.isInteger(b.pages)) fail(`${b.slug}: pages must be null or an integer`);
  for (const k of ["reviews", "awards", "press", "praise", "related"]) if (!Array.isArray(b[k])) fail(`${b.slug}: ${k} must be an array`);
  if (b.series) {
    if (b.series.name !== "The Choices We Carry") fail(`${b.slug}: unknown series ${b.series.name}`);
    if (![1, 2, 3].includes(b.series.order)) fail(`${b.slug}: series.order must be 1-3`);
    if (seriesOrders.has(b.series.order)) fail(`${b.slug}: duplicate series.order ${b.series.order}`);
    seriesOrders.add(b.series.order);
  }
  if (b.cover) {
    if (!b.cover.base || !b.cover.width || !b.cover.height || !b.cover.alt) fail(`${b.slug}: cover needs base/width/height/alt`);
    for (const v of VARIANTS) {
      const f = resolve(root, "src/media/covers", b.cover.base + v);
      if (!existsSync(f)) fail(`${b.slug}: missing cover file ${b.cover.base + v}`);
    }
    // og:image dimensions: cover.width2x/height2x must equal the real @2x.jpg pixel size (measured from the SOF marker)
    const dims = jpegSize(resolve(root, "src/media/covers", b.cover.base + "@2x.jpg"));
    const dims1 = jpegSize(resolve(root, "src/media/covers", b.cover.base + ".jpg"));
    if (!dims) fail(`${b.slug}: cannot read @2x.jpg dimensions`);
    else if (dims.width !== b.cover.width2x || dims.height !== b.cover.height2x) fail(`${b.slug}: cover.width2x/height2x ${b.cover.width2x}×${b.cover.height2x} ≠ file ${dims.width}×${dims.height}`);
    if (dims1 && (dims1.width !== b.cover.width || dims1.height !== b.cover.height)) fail(`${b.slug}: cover.width/height ${b.cover.width}×${b.cover.height} ≠ file ${dims1.width}×${dims1.height}`);
  }
  if (b.retailers !== null && !Array.isArray(b.retailers)) fail(`${b.slug}: retailers must be null or an array of {name,url}`);
}
if (seriesOrders.size !== 3) fail(`The Choices We Carry must have exactly 3 ordered books, found ${seriesOrders.size}`);

if (!site.url || site.url.endsWith("/")) fail("site.url must be set without a trailing slash");
if (!Array.isArray(site.retailerTemplates) || !site.retailerTemplates.every((r) => r.name && r.url.includes("{isbn}"))) fail("retailerTemplates entries need name + url containing {isbn}");
if (!books.some((b) => b.slug === site.featuredSlug)) fail(`site.featuredSlug ${site.featuredSlug} is not a book`);
if (!site.featured || !books.some((b) => b.slug === site.featured.slug)) fail(`site.featured.slug is not a book`);
for (const k of ["statusPill", "hook", "ctaPrimary", "ctaSecondary"]) if (!site.featured?.[k]) fail(`site.featured.${k} is empty`);
if ((site.featured?.hook || "").length > 130) fail(`site.featured.hook is ${site.featured.hook.length} chars; the band budget at 390px allows 120`);
if (!("leadMagnet" in (site.newsletter || {}))) fail("site.newsletter.leadMagnet must exist (null until a real sample is sent)");
const BANNED = /award|bestsell|★|review|TODO|lorem|coming soon/i;
const homeCopy = read("src/_data/homeCopy.json");
const walk = (v, path) => { if (typeof v === "string") { if (BANNED.test(v)) fail(`${path}: banned word in "${v}"`); } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path + "." + k); };
walk(homeCopy, "homeCopy");
{
  const fb = books.find((b) => b.slug === site.featured?.slug);
  const hasRealAward = !!(fb && Array.isArray(fb.awards) && fb.awards.length);
  const BANNED_FEATURED = hasRealAward ? /bestsell|★|review|TODO|lorem|coming soon/i : BANNED;
  const walkF = (v, path) => { if (typeof v === "string") { if (BANNED_FEATURED.test(v)) fail(`${path}: banned word in "${v}"`); } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkF(x, path + "." + k); };
  walkF(site.featured, "site.featured");
}
if (!Array.isArray(author.bioLong) || author.bioLong.length !== 3) fail("author.bioLong must hold the 3 #about paragraphs");
for (const q of author.quotes || []) if (q.bookSlug && !slugs.has(q.bookSlug)) fail(`author quote references unknown book ${q.bookSlug}`);

if (errors.length) {
  console.error("validate-data: FAILED");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`validate-data: OK (${books.length} books, ${site.retailerTemplates.length} retailer templates, ${author.quotes.length} quotes)`);
