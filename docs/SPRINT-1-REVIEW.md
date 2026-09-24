# Sprint 1 review — Eleventy migration + component foundation

Baseline: commit `c0027e3` ("Snapshot from Mac before Eleventy migration"). Every step below is its own commit on `master`.

## What was built

| # | Deliverable | Where |
|---|-------------|-------|
| 1 | Repo prep: `.nvmrc` (22), `.gitignore` (`_site/`, `.cache/`, `**/node_modules/**`), Eleventy 3.1.6 + rss plugin 3, npm scripts `build/start/verify/validate/check-hero` | `package.json` |
| 2 | Eleventy config (ESM): `src` → `_site`, passthrough `css/js/media/admin/robots.txt`, feed plugin at `/blog/rss.xml`, collections, filters, port 8080, minification **off** | `eleventy.config.js` |
| 3 | Source moved under `src/` with `git mv`; directory data pins every `.html` URL; `sitemap.njk` → `/sitemap.xml`; hand-written `rss.xml`/`sitemap.xml` deleted | `src/**` |
| 4 | Data layer: `site.json`, `books.json` (7 records transcribed by script from the old `books/*.html`), `author.json` (bio verbatim); `scripts/validate-data.mjs` (ISBN-13 checksum, 4 cover variants, unique slugs, series order) | `src/_data/`, `scripts/` |
| 5 | Layouts `base/home/book/post/page` + partials `hero` (verbatim), `nav`, `footer`, `cover`, `book-card`, `shelf`, `retailers`, `newsletter-form`, `contact-form`, `jsonld-book`, `head-meta`; posts converted to front matter (HTML bodies kept) | `src/_includes/` |
| 6 | One paginated `src/books/books.njk` (size 1, alias `book`, `/books/{slug}.html`) replaces the 7 hand-written pages | `src/books/` |
| 7 | `netlify.toml`: `publish=_site`, `npm run build`, Node 22, `[dev]`, redirects/headers kept, extensionless 200 rewrites added; `docs/DEPLOY.md` ("Pretty URLs must be OFF") | root, `docs/` |
| 8 | `scripts/check-urls.mjs` (`npm run verify`): build, serve, request the c0027e3 inventory + feed/sitemap/rewrites, forms byte-check, inventory diff, local link check | `scripts/` |
| 9 | `scripts/check-hero.mjs`: hero section byte-diff, head order, `opening.js` placement, sha256 of `hero.css`/`opening.js`/`media/book/*` | `scripts/` |
| 10 | Tokens: `--space-1..8`, `--radius-s/m/l/pill`, `--focus`, `--measure`, `--wide`, `--dur-fast/base/slow`, `--target`; `--step-*` usage documented | `src/css/styles.css` |
| 11 | `components.css`: `.btn` (primary/secondary/quiet/small), `.pill`, `.section-head`, `.panel--sunk/--leather/--spine/--quote`, `.book-card` ("Book N of 3 · Series"), `.retailer-group`/`.chips`, `.rail` (+ `rail.js`), focus ring; `/styleguide.html` (noindex, out of sitemap/collections) | `src/css/`, `src/styleguide.njk` |
| 12 | Nav: brand, Books ▾ (groups from `books.json`), The Price Series, About, Journal, Contact, Newsletter button; hamburger ≤ 900px with `aria-expanded`, Escape, focus trap, focus return; `aria-current`; works with JS off; `nav.js` deferred | `partials/nav.njk`, `src/js/nav.js` |
| 13 | Footer: Books / About / Connect, newsletter mini-form (same Netlify form), socials only when set, RSS, legal row (© year, Privacy, Accessibility, disclosure + credit slots); `/accessibility.html` stub | `partials/footer.njk`, `src/accessibility.njk` |
| 14 | Book spine: sticky cover ≥ 1024, stacked at 390, eyebrow + pills, facts list (pages only when set), format-grouped retailers, synopsis, excerpt, guide/praise only when populated, related rail (series siblings first), newsletter, sticky mobile Buy bar, Book + BreadcrumbList JSON-LD | `layouts/book.njk` |
| 15 | QA (this document) | `docs/` |

## Gate results

```
npm run validate   → validate-data: OK (7 books, 6 retailer templates, 1 quotes)
npm run verify     → 67/67 URLs 200 with expected content-type; forms byte-equivalent; 59 baseline files all present,
                     5 additions (accessibility.html, css/components.css, css/styleguide.css, js/nav.js, js/rail.js, styleguide.html);
                     1258 local links resolve; exit 0
npm run check-hero → hero section byte-identical to c0027e3 (2468 bytes); 8 hero assets sha256-identical;
                     head order preload → styles.css → hero.css → bk-pre script → favicon; opening.js blocking, home only; exit 0
sessionStorage     → second load: bk-pre absent, ct-hero-opened="1", skip button hidden (same on baseline and after)
RSS                → 5 items, newest first, same 5 guids as the old feed, valid XML
sitemap            → same 14 URLs, same order as the old sitemap.xml
grep -rEilI "TODO|lorem|bestsell|award|★" _site/ → empty
```

### Lighthouse (mobile preset, local server `scripts/serve.mjs`)

| Page | Perf | A11y | Best practices | SEO | FCP | LCP | CLS |
|------|-----:|-----:|---------------:|----:|----:|----:|----:|
| / | 76 | 100 | 100 | 100 | 3.0 s | 4.4 s | 0.088 |
| /books/the-price-of-choosing-you.html | 97 | 100 | 100 | 100 | 1.6 s | 2.4 s | 0 |
| /blog/ | 92–100 (3 runs: 100, 100, 92) | 100 | 100 | 100 | 1.5–2.7 s | 1.5–2.7 s | 0 |
| / (baseline c0027e3, same rig) | 76 | 100 | 96 | 100 | 3.0 s | 4.4 s | 0.091 |

**Home performance is 76, identical to the pre-migration baseline; the ≥ 95 bar is not met on `/`.** The cost is entirely pre-existing and hero/font bound: the render-blocking Google Fonts stylesheet (~0.9 s simulated), the 200 KB `cover.jpg` + two 130 KB page textures that hero.css loads, and `opening.js` as a blocking script. CLS 0.09 is the Cormorant font swap inside `.bk-text` (present on the baseline too). Nothing in the hero may change in this sprint; the PM plan already schedules the fix (Sprint 2 item 12: self-host fonts, confirm LCP element). I tried `fetchpriority="high"` on the cover preload: it delayed the font files, moved the swap later and raised LCP to 5.1 s, so it was reverted — the preload link is byte-for-byte the original apart from the root-absolute path.

The blog index swings between 92 and 100 purely on the external font fetch latency through this container's proxy.

### axe-core 4.13 (wcag2a/2aa/21a/21aa + best-practice)

0 violations on `/`, `/books/the-price-of-choosing-you.html`, `/blog/`, `/styleguide.html`, `/blog/posts/surviving-into-story.html`, at 1440 and at 390 with the mobile menu open. "Incomplete" color-contrast items are the body's gradient background (axe cannot compute them); the components were checked by hand — see contrast note below.

### Behaviour checks (Playwright)

- Mobile menu: `aria-expanded` toggles, first item focused on open, Tab cycles inside the header (focus trap verified over 20 Tabs), Escape closes and returns focus to the toggle, links close the menu.
- Books dropdown: button opens, focus moves to the first title, Escape closes and returns focus to the button; hover / focus-within opens it with JS disabled.
- No horizontal scroll at 320px on `/`, book page, `/blog/`, `/styleguide.html` (scrollWidth = 320).
- Hero screenshots before vs after are pixel-identical at 1440 (all 5 states); at 390 the only differing pixels (max 1) are the scroll-cue's animated line.

## Screenshots (`/home/claude/shots/sprint1/`)

- Hero before/after (served from the c0027e3 tree vs `_site`): `before-{1440,390}-{t0.8s,t2.4s,end,second-load,reduced-motion}.png`, `after-…` (same names)
- Home: `home-1440.png`, `home-1024.png`, `home-390.png` (full page — the shelf cards look blank in full-page captures because of the scroll-timeline reveal; `home-shelf-1440.png` and `home-top-{1440,390}.png` are viewport captures), `footer-{1440,390}.png`
- Book page: `book-1440.png`, `book-1024.png`, `book-390.png`, `book-390-viewport.png`
- Blog index: `blog-1440.png`, `blog-1024.png`, `blog-390.png`
- Styleguide: `styleguide-1440.png`, `styleguide-1024.png`, `styleguide-390.png`, `styleguide-top-1440.png`
- Navigation: `nav-dropdown-1440.png`, `nav-closed-390.png`, `nav-open-390.png` (mobile menu open)
- Lighthouse JSON: `lh-x.json` (home), `lh-xbooks_…json`, `lh-xblog_.json`

## Intentional visual changes (for Brian)

1. **Unified font weights** — every page now loads the same Google Fonts superset (`Cormorant Garamond 500/600/700 + italic 500`, `Outfit 300–600`); privacy/404/thank-you previously loaded none or a subset.
2. **Privacy link on every page** — the footer is one partial, so Privacy (and now Accessibility) appear site-wide instead of on the home page only.
3. **Blog index is newest-first** (was oldest-first). The feed was already newest-first, so the two now agree. **Decision for Brian:** keep newest-first, or revert to oldest-first (one-line change in `src/blog/index.njk`).
4. Header and footer are the new components on every page (Books dropdown, Newsletter button, footer groups). Retailer list on book pages is the fixed order from `site.json` (Amazon, Barnes & Noble, Bookshop.org, ChristianBook.com, Walmart, Books-A-Million) — "Indie bookstores" became "Bookshop.org", ChristianBook.com is new. ChristianBook links are ISBN searches like the others; confirm the retailer set (PLAN open decision 3).
5. Book pages use the new spine layout (facts list, pills, buy bar, related rail). Text content is otherwise identical to the old pages (diffed word-for-word).

## Deviations from the brief (and why)

- `collections.posts` is sorted **oldest→newest**, not desc: the rss plugin's virtual template applies `| reverse` to the collection it is given, so a desc collection would make the feed oldest-first. `collections.postsNewest` (desc) is what templates use.
- The rss plugin emits `<content:encoded>` when a post has `summary` but never declares the `content` namespace; a small transform in `eleventy.config.js` adds `xmlns:content` so the feed stays valid XML.
- `absoluteUrl` is the rss plugin's filter (`url | absoluteUrl(site.url)`) rather than a custom one, to avoid two filters with the same name.
- Added one colour token, `--gold-deep: #755526` (5.8:1 on paper), used only for small text in *new* components. `--gold` (#8f6a30) is 4.2:1 on paper and stays untouched for the existing `.eyebrow`; `--ink-faint` (`.post-meta`) is 3.7:1. Both are pre-existing near-misses on gradient backgrounds — flagging as a token decision for Brian/Sprint 2, not changed here.
- `/accessibility.html` exists (stub, honest one-paragraph statement) but is excluded from the sitemap for now so the sitemap stays the same 14 URLs; add it when Sprint 3 writes the full statement.
- A 60-byte inline `<script>` in `<head>` adds `has-nav-js` before first paint so the header never reflows on mobile (menu collapsed only when JS is present). It sits before the stylesheet links, so the required order (preload → styles.css → hero.css → bk-pre script → favicon) is untouched.
- `components.css` is linked between `styles.css` and `hero.css`, as the PM plan specifies; `styleguide.css` loads only on the styleguide.
- `scripts/serve.mjs` was added (static server mirroring the netlify.toml rewrites, 204 for the analytics beacon) so Lighthouse/axe runs locally without console errors.
- `check-urls` requires port 8080 to be free (it fails loudly otherwise) instead of falling back to a random port.

## Unfinished / carried forward

- Home Lighthouse performance (76) — needs Sprint 2 font self-hosting; hero must stay untouched.
- Book cards / rails serve the 600px "1x" files; Sprint 2's eleventy-img adds proper 300px thumbnails.
- Data slots still `null`/`[]` awaiting Brian: page counts, ebook/audio availability, discussion guides, praise, socials, headshot, affiliate disclosure, site credit (`_todo` keys in the JSON files; nothing renders until filled).
- The hero screenshot helper (`/home/claude/hero-shots.mjs`) and axe runner (`/home/claude/axe.mjs`) live outside the repo because they import Playwright from the container scratchpad.
