/** Shared public page chrome for pieces the desk publishes after the last build. */
import { escapeHtml } from "./prose";

export function page(options: {
  title: string;
  description: string;
  main: string;
  extraCss?: string;
  jsonLd?: unknown;
}): string {
  const css = options.extraCss ? `<link rel="stylesheet" href="/css/${options.extraCss}?v=2026-09-25b" />` : "";
  const ld = options.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(options.jsonLd)}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)} — Courtney Thomas</title>
  <meta name="description" content="${escapeHtml(options.description)}" />
  <link rel="stylesheet" href="/css/fonts.css?v=2026-09-25b" />
  <link rel="stylesheet" href="/css/styles.css?v=2026-09-25b" />
  <link rel="stylesheet" href="/css/components.css?v=2026-09-25b" />
  ${css}
  ${ld}
</head>
<body class="blog-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-nav">
    <a class="brand" href="/">Courtney Thomas</a>
    <nav aria-label="Primary">
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
  <footer class="site-footer">
    <span>Courtney Thomas</span>
    <nav aria-label="Legal"><a href="/privacy.html">Privacy</a> · <a href="/merch.html">Shop</a> · <a href="/blog/">Journal</a></nav>
  </footer>
  <script src="/js/nav.js?v=2026-09-25b" defer></script>
</body>
</html>`;
}
