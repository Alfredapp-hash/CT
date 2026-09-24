// Minimal static server for _site that mirrors netlify.toml's 200 rewrites and answers the
// analytics beacon (POST /api/*) with 204, so local Lighthouse/axe runs match production.
// Usage: node scripts/serve.mjs [port=8080]
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..", "_site");
const PORT = Number(process.argv[2] || 8080);
const TYPES = { html: "text/html; charset=utf-8", xml: "application/xml", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", jpg: "image/jpeg", webp: "image/webp", png: "image/png", txt: "text/plain; charset=utf-8", svg: "image/svg+xml", ico: "image/x-icon" };
const REWRITES = [
  [/^\/thank-you$/, "/thank-you.html"], [/^\/admin$/, "/admin/analytics.html"], [/^\/privacy$/, "/privacy.html"],
  [/^\/accessibility$/, "/accessibility.html"], [/^\/books\/([^/.]+)$/, "/books/$1.html"], [/^\/blog\/posts\/([^/.]+)$/, "/blog/posts/$1.html"],
];
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (req.method === "POST" && p.startsWith("/api/")) { res.writeHead(204); res.end(); return; }
  for (const [re, to] of REWRITES) if (re.test(p)) { p = p.replace(re, to); break; }
  if (p.endsWith("/")) p += "index.html";
  const file = join(site, p);
  if (!file.startsWith(site) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(join(site, "404.html"))); return;
  }
  const ext = p.split(".").pop();
  res.writeHead(200, { "content-type": p.endsWith("rss.xml") ? "application/rss+xml" : TYPES[ext] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`serving _site on http://localhost:${PORT}`));
