/** Shared public page chrome for pieces the desk publishes after the last build. */
import books from "../../../src/_data/books.json";
import { escapeHtml } from "./prose";

export function page(options: {
  title: string;
  description: string;
  main: string;
  extraCss?: string;
  bodyClass?: string;
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
          ${books.map((book) => `<li><a href="/books/${escapeHtml(book.slug)}.html">${escapeHtml(book.title)}</a></li>`).join("")}
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
      <p class="footer-legal__copy">© ${new Date().getUTCFullYear()} Courtney Thomas</p>
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
