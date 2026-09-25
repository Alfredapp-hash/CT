// URL preservation gate.
// 1. Build the site.
// 2. Serve _site on :8080 and request every URL from an inventory derived from commit c0027e3's file list
//    (plus /blog/rss.xml, /sitemap.xml, /admin, /thank-you). Assert 200 + expected content-type.
// 3. Assert both Netlify forms keep their exact attributes in _site/index.html.
// 4. Diff the c0027e3 file list against _site: only additions are allowed.
// 5. Check every local href/src in _site resolves to a file.
// Exit non-zero on any failure.
import { execSync, spawn } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "c0027e3";
const PORT = 8080;
const failures = [];
const fail = (m) => failures.push(m);

// 1. Build
console.log("check-urls: building …");
execSync("npx eleventy --quiet", { cwd: root, stdio: "inherit" });

// Inventory from the baseline commit (site-facing files only)
const baselineFiles = execSync(`git ls-tree -r --name-only ${BASE}`, { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !/^(netlify\/|docs\/|\.gitignore|package|tsconfig|ANALYTICS\.md|netlify\.toml|\.nvmrc)/.test(f))
  .filter((f) => !f.startsWith("."));

const TYPES = {
  html: "text/html", xml: "application/xml", css: "text/css", js: "text/javascript",
  jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", png: "image/png", txt: "text/plain", svg: "image/svg+xml",
};
const typeOf = (p) => TYPES[p.split(".").pop()] || null;

// URLs to request
const urls = new Map(); // url -> expected type
for (const f of baselineFiles) {
  urls.set("/" + f, typeOf(f));
  if (f.endsWith("/index.html")) urls.set("/" + f.replace(/index\.html$/, ""), "text/html");
}
// Intentionally unpublished pages (301 in netlify.toml); not expected to resolve locally.
const RETIRED = new Set(["/blog/posts/keeping-what-love-leaves.html"]);
for (const u of RETIRED) urls.delete(u);
urls.set("/", "text/html");
urls.set("/blog/rss.xml", "application/rss+xml");
urls.set("/sitemap.xml", "application/xml");
urls.set("/admin", "text/html");
urls.set("/thank-you", "text/html");
urls.set("/privacy", "text/html");
urls.set("/accessibility", "text/html");
urls.set("/books/the-price-of-choosing-you", "text/html");
urls.set("/bookshelf.html", "text/html");
urls.set("/blog/posts/surviving-into-story", "text/html");

// Static server honouring netlify.toml's 200 rewrites
const REWRITES = [
  [/^\/thank-you$/, "/thank-you.html"],
  [/^\/admin$/, "/admin/analytics.html"],
  [/^\/privacy$/, "/privacy.html"],
  [/^\/accessibility$/, "/accessibility.html"],
  [/^\/books\/([^/.]+)$/, "/books/$1.html"],
  [/^\/blog\/posts\/([^/.]+)$/, "/blog/posts/$1.html"],
];
const site = join(root, "_site");
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  for (const [re, to] of REWRITES) if (re.test(p)) { p = p.replace(re, to); break; }
  if (p.endsWith("/")) p += "index.html";
  const file = join(site, p);
  if (!file.startsWith(site) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/html" }); res.end("not found"); return;
  }
  const ext = p.split(".").pop();
  let ct = TYPES[ext] || "application/octet-stream";
  if (p === "/blog/rss.xml") ct = "application/rss+xml";
  res.writeHead(200, { "content-type": ct + (ct.startsWith("text/") ? "; charset=utf-8" : "") });
  res.end(readFileSync(file));
});
const port = PORT;
await new Promise((resolve, reject) => {
  server.once("error", (e) => reject(new Error(`check-urls: cannot listen on :${PORT} (${e.code}). Stop the other server first.`)));
  server.listen(PORT, resolve);
});

// 2. Request everything
let ok = 0;
for (const [url, expected] of urls) {
  const res = await fetch(`http://localhost:${port}${url}`).catch((e) => ({ status: 0, headers: new Map(), error: e }));
  const ct = res.headers.get ? res.headers.get("content-type") || "" : "";
  if (res.status !== 200) fail(`${url} → ${res.status}`);
  else if (expected && !ct.startsWith(expected)) fail(`${url} content-type ${ct}, expected ${expected}`);
  else ok++;
}
console.log(`check-urls: ${ok}/${urls.size} URLs returned 200 with the expected content-type`);
server.close();

// 3. Forms in _site/index.html
const html = readFileSync(join(site, "index.html"), "utf8");
const forms = [
  { name: "newsletter", open: /<form name="newsletter" method="POST" action="\/thank-you" data-netlify="true" netlify-honeypot="bot-field" class="newsletter-form">/ },
  { name: "notes", open: /<form name="notes" method="POST" action="\/thank-you" data-netlify="true" netlify-honeypot="bot-field">/ },
];
for (const f of forms) {
  if (!f.open.test(html)) fail(`form "${f.name}": opening tag changed`);
  if (!html.includes(`<input type="hidden" name="form-name" value="${f.name}" />`)) fail(`form "${f.name}": hidden form-name input missing`);
}
const botFields = (html.match(/<input name="bot-field" \/>/g) || []).length;
if (botFields < 2) fail(`expected at least 2 honeypot bot-field inputs on the home page, found ${botFields}`);
// Sprint 2: the home newsletter form gained a visible label and an optional "name" field, so it is asserted at
// attribute level (every Netlify-relevant attribute exactly as the original). The footer mini-form (id suffix
// "-footer") and the notes form stay byte-equivalent to the original.
const NEWSLETTER_OPEN = '<form name="newsletter" method="POST" action="/thank-you" data-netlify="true" netlify-honeypot="bot-field" class="newsletter-form';
const newsletterForms = html.split(NEWSLETTER_OPEN).slice(1).map((chunk) => chunk.slice(0, chunk.indexOf("</form>")));
if (newsletterForms.length < 2) fail(`expected the home newsletter form + the footer mini-form, found ${newsletterForms.length}`);
for (const [i, f] of newsletterForms.entries()) {
  const must = [
    '<input type="hidden" name="form-name" value="newsletter" />',
    '<p hidden><label>Leave this empty <input name="bot-field" /></label></p>',
    /<input id="newsletter-email[^"]*" type="email" name="email" required autocomplete="email"/,
    /<button type="submit"[^>]*>Subscribe<\/button>/,
  ];
  for (const m of must) {
    const ok = typeof m === "string" ? f.includes(m) : m.test(f);
    if (!ok) fail(`newsletter form #${i + 1}: missing ${m}`);
  }
}
const ORIGINAL_NEWSLETTER_FOOTER = `<form name="newsletter" method="POST" action="/thank-you" data-netlify="true" netlify-honeypot="bot-field" class="newsletter-form">
        <input type="hidden" name="form-name" value="newsletter" />
        <p hidden><label>Leave this empty <input name="bot-field" /></label></p>
        <label class="visually-hidden" for="newsletter-email-footer">Email</label>
        <input id="newsletter-email-footer" type="email" name="email" required autocomplete="email" placeholder="Your email" />
        <button type="submit">Subscribe</button>
      </form>`;
const ORIGINAL_NOTES = `<form name="notes" method="POST" action="/thank-you" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="notes" />
        <p hidden>
          <label>Leave this empty <input name="bot-field" /></label>
        </p>
        <label>Name <input type="text" name="name" required autocomplete="name" /></label>
        <label>Email <input type="email" name="email" required autocomplete="email" /></label>
        <label>Note <textarea name="message" required></textarea></label>
        <button type="submit">Send</button>
        <p class="form-note" id="form-note" hidden aria-live="polite"></p>
      </form>`;
if (!html.includes(ORIGINAL_NEWSLETTER_FOOTER)) fail("footer newsletter mini-form is not byte-equivalent to the original (id suffix aside)");
if (!html.includes(ORIGINAL_NOTES)) fail("notes form is not byte-equivalent to the original");
// Home anchors that nav / footer / opening.js depend on
for (const id of ["top", "library", "books", "reading-order", "faith", "journal", "about", "newsletter", "contact", "enter", "skip"]) {
  if (!new RegExp(`\\sid="${id}"`).test(html)) fail(`home page: missing id="${id}"`);
}
// Exactly one primary CTA in the hero + decision band region
const bandEnd = html.indexOf("</section>", html.indexOf('class="hero-band'));
const primaries = (html.slice(html.indexOf('<main id="library">'), bandEnd).match(/btn--primary/g) || []).length;
if (primaries !== 1) fail(`expected exactly one .btn--primary in the decision band, found ${primaries}`);

// 4. File inventory: nothing from the baseline may be missing
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [posix.join(...relative(site, p).split(/[\\/]/))];
});
const built = new Set(walk(site));
const missing = baselineFiles.filter((f) => !built.has(f));
for (const m of missing) fail(`missing from _site: ${m}`);
const added = [...built].filter((f) => !baselineFiles.includes(f));
console.log(`check-urls: inventory ${baselineFiles.length} baseline files, ${built.size} built; ${added.length} additions: ${added.join(", ")}`);

// 5. Local link check across every built HTML file
let links = 0;
for (const f of built) {
  if (!f.endsWith(".html")) continue;
  const doc = readFileSync(join(site, f), "utf8");
  const dir = posix.dirname("/" + f);
  const attrs = [...doc.matchAll(/\b(?:href|src|imagesrcset|srcset)="([^"]+)"/g)].flatMap((m) =>
    m[0].includes("srcset") ? m[1].split(",").map((s) => s.trim().split(/\s+/)[0]) : [m[1]]
  );
  for (const raw of attrs) {
    if (/^(https?:|mailto:|data:|#|tel:)/.test(raw)) continue;
    let target = raw.split("#")[0].split("?")[0];
    if (!target) continue;
    target = target.startsWith("/") ? target : posix.join(dir, target);
    for (const [re, to] of REWRITES) if (re.test(target)) { target = target.replace(re, to); break; }
    if (target.endsWith("/")) target += "index.html";
    links++;
    if (!existsSync(join(site, target))) fail(`${f}: broken local link ${raw}`);
  }
}
console.log(`check-urls: ${links} local links checked`);

if (failures.length) {
  console.error("check-urls: FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("check-urls: OK");
