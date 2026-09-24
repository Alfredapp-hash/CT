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
    if (b.series.name !== "The Price Series") fail(`${b.slug}: unknown series ${b.series.name}`);
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
  }
  if (b.retailers !== null && !Array.isArray(b.retailers)) fail(`${b.slug}: retailers must be null or an array of {name,url}`);
}
if (seriesOrders.size !== 3) fail(`The Price Series must have exactly 3 ordered books, found ${seriesOrders.size}`);

if (!site.url || site.url.endsWith("/")) fail("site.url must be set without a trailing slash");
if (!Array.isArray(site.retailerTemplates) || !site.retailerTemplates.every((r) => r.name && r.url.includes("{isbn}"))) fail("retailerTemplates entries need name + url containing {isbn}");
if (!books.some((b) => b.slug === site.featuredSlug)) fail(`site.featuredSlug ${site.featuredSlug} is not a book`);
if (!Array.isArray(author.bioLong) || author.bioLong.length !== 3) fail("author.bioLong must hold the 3 #about paragraphs");
for (const q of author.quotes || []) if (q.bookSlug && !slugs.has(q.bookSlug)) fail(`author quote references unknown book ${q.bookSlug}`);

if (errors.length) {
  console.error("validate-data: FAILED");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`validate-data: OK (${books.length} books, ${site.retailerTemplates.length} retailer templates, ${author.quotes.length} quotes)`);
