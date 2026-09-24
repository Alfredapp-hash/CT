// HTTP/2 static server for _site (self-signed cert) so local Lighthouse models the production protocol
// (Netlify serves HTTP/2; over HTTP/1.1 the 6-connection limit queues the CSS/font requests and understates the score).
// Usage: node scripts/serve-h2.mjs [port=8443]   → https://localhost:8443/  (run Chrome with --ignore-certificate-errors)
import http2 from "node:http2";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { brotliCompressSync, constants as zc } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "_site");
const PORT = Number(process.argv[2] || 8443);
const certDir = join(root, ".cache", "h2-cert");
mkdirSync(certDir, { recursive: true });
const key = join(certDir, "key.pem"), cert = join(certDir, "cert.pem");
if (!existsSync(key)) execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${key} -out ${cert} -days 30 -subj /CN=localhost`, { stdio: "ignore" });
const TYPES = { woff2: "font/woff2", html: "text/html; charset=utf-8", xml: "application/xml", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", jpg: "image/jpeg", webp: "image/webp", png: "image/png", txt: "text/plain; charset=utf-8", svg: "image/svg+xml" };
const REWRITES = [
  [/^\/thank-you$/, "/thank-you.html"], [/^\/admin$/, "/admin/analytics.html"], [/^\/privacy$/, "/privacy.html"],
  [/^\/accessibility$/, "/accessibility.html"], [/^\/books\/([^/.]+)$/, "/books/$1.html"], [/^\/blog\/posts\/([^/.]+)$/, "/blog/posts/$1.html"],
];
const server = http2.createSecureServer({ key: readFileSync(key), cert: readFileSync(cert), allowHTTP1: true });
server.on("request", (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (req.method === "POST" && p.startsWith("/api/")) { res.writeHead(204); res.end(); return; }
  for (const [re, to] of REWRITES) if (re.test(p)) { p = p.replace(re, to); break; }
  if (p.endsWith("/")) p += "index.html";
  const file = join(site, p);
  if (!file.startsWith(site) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(join(site, "404.html"))); return; }
  const ext = p.split(".").pop();
  const headers = { "content-type": p.endsWith("rss.xml") ? "application/rss+xml" : TYPES[ext] || "application/octet-stream" };
  if (/^\/(media|fonts)\//.test(p)) headers["cache-control"] = "public, max-age=31536000, immutable";
  let body = readFileSync(file);
  // Netlify serves text assets brotli-compressed; model that too (HTTP/1.1 python server sends them raw, ~4× larger).
  if (/^(html|xml|css|js|txt|svg|json)$/.test(ext) && /\bbr\b/.test(req.headers["accept-encoding"] || "")) {
    body = brotliCompressSync(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 5 } });
    headers["content-encoding"] = "br";
    headers.vary = "accept-encoding";
  }
  res.writeHead(200, headers);
  res.end(body);
});
server.listen(PORT, () => console.log(`serving _site over HTTP/2 on https://localhost:${PORT}`));
