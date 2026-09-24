// Hero preservation gate: the rendered <section class="bk-hero">…</section> in _site/index.html
// must be byte-identical to commit c0027e3's index.html, and hero.css / opening.js / media/book/*
// must hash identically to c0027e3. Also asserts the head order and the inline bk-pre script.
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "c0027e3";
const failures = [];
const fail = (m) => failures.push(m);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const gitShow = (p) => execSync(`git show ${BASE}:${p}`, { cwd: root, maxBuffer: 64 * 1024 * 1024 });

if (!existsSync(join(root, "_site/index.html"))) {
  console.log("check-hero: building …");
  execSync("npx eleventy --quiet", { cwd: root, stdio: "inherit" });
}

const extract = (html, label) => {
  const start = html.indexOf('<section class="bk-hero"');
  if (start < 0) { fail(`${label}: no <section class="bk-hero">`); return ""; }
  const end = html.indexOf("</section>", start);
  return html.slice(start, end + "</section>".length);
};
const orig = gitShow("index.html").toString("utf8");
const built = readFileSync(join(root, "_site/index.html"), "utf8");
const a = extract(orig, BASE), b = extract(built, "_site/index.html");
if (a !== b) {
  fail("hero section differs from c0027e3");
  const al = a.split("\n"), bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) if (al[i] !== bl[i]) { console.error(`  first diff at hero line ${i + 1}:\n  - ${al[i]}\n  + ${bl[i]}`); break; }
} else console.log(`check-hero: hero section byte-identical (${a.length} bytes, sha256 ${sha(a).slice(0, 16)}…)`);

// Inline bk-pre script: exact line from the original
const script = orig.split("\n").find((l) => l.includes('classList.add("bk-pre")'));
if (!built.includes(script)) fail("inline bk-pre <script> is not byte-identical");

// Head order on the home page: preload → styles.css → hero.css → inline script → favicon
const idx = (s) => built.indexOf(s);
const order = [idx('<link rel="preload" as="image"'), idx("/css/styles.css"), idx("/css/hero.css"), idx('classList.add("bk-pre")'), idx('<link rel="icon"')];
if (order.some((i) => i < 0) || order.some((v, i) => i && v < order[i - 1])) fail(`head order wrong: ${order.join(",")}`);

// opening.js: non-deferred, last blocking script, home only
if (!/<script src="\/js\/opening\.js\?v=[^"]*"><\/script>/.test(built)) fail("opening.js is not a blocking script on the home page");
for (const p of ["blog/index.html", "books/the-price-of-choosing-you.html"]) {
  if (readFileSync(join(root, "_site", p), "utf8").includes("opening.js")) fail(`${p} loads opening.js`);
}

// Asset hashes
const assets = ["css/hero.css", "js/opening.js", ...readdirSync(join(root, "src/media/book")).map((f) => "media/book/" + f)];
for (const p of assets) {
  const o = sha(gitShow(p));
  const s = sha(readFileSync(join(root, "src", p)));
  const d = existsSync(join(root, "_site", p)) ? sha(readFileSync(join(root, "_site", p))) : "(missing)";
  if (o !== s || o !== d) fail(`${p}: sha256 differs (c0027e3 ${o.slice(0, 12)}, src ${s.slice(0, 12)}, _site ${d.slice(0, 12)})`);
}
console.log(`check-hero: ${assets.length} hero assets hash-identical to ${BASE}`);

if (failures.length) {
  console.error("check-hero: FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("check-hero: OK");
