# QA — Sprint 2 (home page build)

Reviewer: QA / accessibility / performance. Build under test: `38da531` (working tree clean). Served from `_site/` on `python3 -m http.server 8080` (HTTP/1.1, no compression, no Netlify redirects — see notes on `/thank-you` and the analytics POST).
Artefacts: `/home/claude/shots/sprint2/qa/` (70 PNGs, 8 Lighthouse JSONs, `qa-results.json`, `verify.log`, scripts `qa.mjs`, `qa2.mjs`, `contrast.mjs`, `end.mjs`, `focus.mjs`, `reveal.mjs`, `drop.mjs`).

## Summary

**FAIL** — Lighthouse mobile performance on `/` is **72** (LCP 5.8 s) against the ≥ 95 bar, and the acceptance item "featured cover + Buy CTA inside the first 390×844 viewport" is not met. Both are structural consequences of the preserved 100dvh hero (the engineer flagged both), so they are decisions for Brian rather than engineering slips. Everything else — hero parity, forms, URLs, axe, keyboard, semantics, no fabricated content, no Google Fonts — passes. One Major accessibility defect was found that is not hero-related: the gold-warm focus ring is 2.0:1 against paper (WCAG 1.4.11 needs 3:1).

## Gate table (constraints 1–5)

| # | Constraint | Result | Evidence |
|---|---|---|---|
| 1 | Hero byte-identical to c0027e3 | **PASS** | `node scripts/check-hero.mjs` → "hero section byte-identical (2468 bytes), 8 hero assets hash-identical, OK", exit 0. `git diff c0027e3:css/hero.css HEAD:src/css/hero.css` = 0 bytes; same for `js/opening.js`; `media/book` --stat empty. Visual: `hero-{1440,390}-end-natural.png` vs `/home/claude/shots/sprint1/before-*-end.png` → **0 differing pixels** below the header at 1440; 188 px at 390, all inside the animated scroll-cue line (bbox x169–220, y688–733). Reduced-motion: 0 px diff at both widths outside header/cue (`cmp-*-reduced-motion.png`). Header row differs by design (Sprint 1 nav). t0.8s/t2.4s captures differ only by animation-frame jitter of the page-turn (`cmp-1440-t2.4s.png`); the code is byte-identical so this is capture timing, not a regression. Note: the natural animation finishes at ~13.3 s at both widths; the brief's "end" at ~9 s is mid-writing. |
| 2 | Tokens / type / no Google Fonts | **PASS** | `grep -nE "#[0-9a-f]{3,6}" src/css/components.css src/css/home.css` → only `--gold-deep: #755526` and the `--paper-a*`/`--ink-a*` token definitions in `components.css` `:root`; nothing in `home.css`. No `fonts.googleapis`/`gstatic` in any built page except `_site/admin/analytics.html` (verbatim dashboard, noindex, known). `font-family` values: only Cormorant Garamond / Outfit + fallbacks. Playwright network log on `/`: **0 external requests**. |
| 3 | No fabricated content | **PASS** | `grep -rEil "TODO\|lorem\|bestsell\|award\|★\|☆\|testimonial" _site/` on html/xml/js/css/txt/json → empty (the only hit is binary noise in `open-left.jpg`). All 7 `<img src>` + every `srcset`/`<source>` under `_site` point to `/media/covers/` (no other imagery; headshot is a CSS monogram). No praise/press/awards/lead-magnet/sameAs blocks in HTML. |
| 4 | Netlify Forms intact | **PASS** | `_site/index.html`: `name="newsletter"` (×2: section + footer mini-form) and `name="notes"`, each `method="POST" action="/thank-you" data-netlify="true" netlify-honeypot="bot-field"`, hidden `form-name` with matching value, `bot-field` inside `<p hidden>`. `npm run verify` asserts the same at attribute level. `netlify dev` submission **not run** (no Netlify auth in this container) — record for Brian's first deploy preview. |
| 5 | URLs | **PASS** | `npm run verify` exit 0: 67/67 URLs 200 with expected content-type, 1259 local links checked (`verify.log`). Spot checks: `/books/what-we-keep.html`, `/blog/posts/reading-the-price-series.html`, `/blog/rss.xml` (application/xml), `/sitemap.xml`, `/admin/`, `/thank-you.html`, `/robots.txt`, `/media/covers/what-we-keep-cover@2x.jpg`, `/media/book/cover.jpg` all 200. RSS 2.0, 5 items, newest first, guids identical to `c0027e3:blog/rss.xml`. Sitemap 14 URLs, no admin/404/thank-you. `/thank-you` (extensionless) is a `netlify.toml` 200 rewrite — 404 on python's server, 200 via `check-urls` which maps it. |

## Lighthouse (page × preset)

`CHROME_PATH=/opt/pw-browsers/chromium npx -y lighthouse … --only-categories=…`; JSON at `lh-<page>-<preset>.json`. (The brief's command needs `CHROME_PATH` set — `--chrome-path` alone fails with "CHROME_PATH must be set".)

| Page | Preset | Perf | A11y | BP | SEO | LCP | CLS | TBT | LCP element |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | **72** | 100 | 96 | 100 | 5.8 s | 0.001 | 220 ms | `div#bk-book > div.bk-right > div#bk-cover > div.bk-cover-front` (hero cover) |
| / | desktop | 98 | 100 | 96 | 100 | 1.0 s | 0.001 | 0 ms | same |
| /books/the-price-of-choosing-you.html | mobile | 98 | 100 | 96 | 100 | 2.4 s | 0 | 0 ms | `div.book-detail__cover > figure.jacket > picture > img` |
| /books/the-price-of-choosing-you.html | desktop | 100 | 100 | 96 | 100 | 0.6 s | 0.001 | 0 ms | same |
| /blog/ | mobile | 99 | 100 | 96 | 100 | 2.0 s | 0 | 0 ms | text |
| /blog/ | desktop | 100 | 100 | 96 | 100 | 0.4 s | 0.001 | 0 ms | text |
| /styleguide.html | mobile | 98 | 100 | 100 | 54* | 2.1 s | 0.001 | 80 ms | text |
| /styleguide.html | desktop | 100 | 100 | 100 | 54* | 0.5 s | 0.002 | 0 ms | text |

- BP = 96 everywhere is one audit, `errors-in-console`: `js/analytics.js` POSTs to the Netlify Function and python's server answers 501. On Netlify this is a 2xx; expect 100. Not a site defect.
- *Styleguide SEO 54 = `noindex` + no meta description; the page is intentionally blocked from indexing. Not a defect, but noted.
- Home mobile: LCP breakdown TTFB 7 ms / load delay 14 ms / load 49 ms / **element render delay 192 ms** (simulated 4× CPU); FCP 2.1 s; TBT 220 ms from `opening.js` (blocking, byte-frozen). Desktop LCP discovery flags `fetchpriority=high` missing on the hero cover preload and "not discoverable in initial document" — both inside the frozen hero markup. The engineer's 78 vs my 72 is run variance on the same page.

## axe (axe-core 4.x, tags wcag2a/2aa/21a/21aa + best-practice, run at 1440 and 390 after the hero finished)

| Page | serious | critical | moderate | minor |
|---|---|---|---|---|
| / (1440, 390) | 0 | 0 | 0 | 0 |
| /books/the-price-of-choosing-you.html (1440, 390) | 0 | 0 | 0 | 0 |
| /blog/ (1440, 390) | 0 | 0 | 0 | 0 |
| /styleguide.html (1440, 390) | 0 | 0 | 0 | 0 |

## Keyboard walk (D)

| Item | Result | Evidence |
|---|---|---|
| No positive `tabindex` | PASS | 0 found |
| Every focused element has a visible ring (first 45 tabs at 1440) | PASS (visibility) / **see Defect 3 (contrast)** | `qa-results.json` → `keyboardWalk1440`; `focus-1440-skip-link.png`, `focus-1440-nav-books.png`, `focus-390-primary-cta.png`, `focus-390-rail-next.png`, `focus-1440-bk-skip.png` |
| Skip link visible on focus, jumps to `#library` (lands at header height 84 px, next Tab → band cover link) | PASS | `skip-link-1440-after.png`, `skip-link-390-after.png` |
| Books dropdown: Enter opens (`aria-expanded=true`, focus → first link), Escape closes and returns focus to button, Space opens | PASS | `nav-dropdown-1440-open.png` |
| Books dropdown: tabbing *through* the button opens the panel via CSS `:focus-within` while `aria-expanded` stays `false` | **Minor** (Defect 5) | `nav-tab-into-dropdown-1440.png` |
| Mobile menu (390): `aria-expanded` false→true→false; focus moves to first item; 30 Tabs + Shift+Tab never leave the header (trap holds); Escape closes and returns focus to `#nav-toggle` | PASS | `nav-open-390.png` |
| Rails: prev/next `<button>`s, tabindex 0, `aria-label` "Scroll covers left/right", 44×44, `aria-controls` → track; track `tabindex=0 role=region aria-label="… covers"`; ArrowRight/Left scroll (0→175→0); Enter on Next scrolls | PASS | `rail-390-after-arrow.png` |
| Hero skip controls: `#bk-skip` and nav `#skip` are focusable with ring while writing; Enter on `#bk-skip` finishes animation and moves focus to `#bk-page`; Enter on `#skip` finishes and scrolls to `#library`; `#enter` ("Scroll") cue works on Enter | PASS | `focus-1440-bk-skip.png` |
| Escape anywhere finishes the hero | PASS | (used throughout) |

## Screen-reader semantics (E)

| Page | h1 | Heading skips | Landmarks | img alt | Form labels | JSON-LD | aria-current | canonical / RSS alt |
|---|---|---|---|---|---|---|---|---|
| / | 1 | none | header nav main footer | band cover "Cover of The Price of Choosing You by Courtney Thomas"; 12 shelf/reading-order covers `alt=""` inside `aria-hidden tabindex=-1` links with adjacent text link (decorative pattern, see note) | all inputs labelled (visible `<label>`) | Person, WebSite, ItemList — parses; no sameAs | `aria-current=true` on Books, `page` on Book 1 in dropdown (see Decision 4) | yes / yes |
| /books/the-price-of-choosing-you.html | 1 | none | all | main cover full alt; 6 related covers decorative | n/a | Book + BreadcrumbList — parse | Books = true | yes / yes |
| /books/what-we-keep.html | 1 | none | all | same pattern | n/a | Book + BreadcrumbList | | yes / yes |
| /blog/ | 1 | none | all | none | n/a | BreadcrumbList | Journal = page | yes / yes |
| /blog/posts/reading-the-price-series.html | 1 | none | all | none | n/a | BreadcrumbList | none | yes / yes |
| /styleguide.html, /accessibility.html | 1 | none | all | ok | ok | ok / BreadcrumbList | — | yes / yes |
| /privacy.html, /thank-you.html, /404.html | 1 | none | all | — | — | — | — | **no canonical** / yes |

Notes: `<html lang>` set on every page. No duplicate `id`s despite two `newsletter` forms on the home page (inputs are `newsletter-name`/`newsletter-email` vs the footer's unlabelled-id mini-form, which uses a visible label). Console: only the local 501 on the analytics POST.

## Contrast (F) — WCAG 2.x relative-luminance formula on the tokens

| Pair | Ratio | Use | Verdict |
|---|---|---|---|
| ink #1c1410 on paper #f6edd7 | 15.57 | body | pass |
| ink on paper-sunk #efe4c9 | 14.36 | panels | pass |
| ink-soft #5c4b40 on paper | 7.10 | secondary copy, nav links | pass |
| ink-soft on paper-sunk | 6.55 | | pass |
| gold-deep #755526 on paper / paper-sunk | 5.84 / 5.39 | eyebrows, small caps | pass |
| gold #8f6a30 on paper | 4.22 | only `.series-steps li::before` counters (22 px serif) and `.nav-skip:hover` | **large-text only** — counters are decorative numerals; hover state on a 3:1-eligible control. No body text uses `--gold` (components.css enforces gold-deep). |
| ink-faint #8a7668 on paper | 3.70 | `.post-meta` on blog pages (12.8 px caps), chip "↗" glyph | **FAIL for small text** — see Defect 4 (Sprint 1 blog CSS, not new this sprint; axe did not flag it, verify on /blog/) |
| paper on leather #5a1d27 | 10.99 | footer, quote band, primary buttons | pass |
| paper @0.70 / 0.78 / 0.86 alpha on leather | 6.13 / 7.25 / 8.50 | footer legal, ledes, links | pass |
| gold-warm #c9a367 on leather / leather-lo | 5.44 / 6.68 | footer column heads, quote cite | pass |
| **focus ring gold-warm on paper / paper-lift / paper-sunk** | **2.02 / 2.18 / 1.86** | every `:focus-visible` outline on paper backgrounds | **FAIL 1.4.11 (needs 3:1)** — Defect 3 |
| focus ring gold-warm on leather (primary buttons, footer) | 5.44 | | pass |

## Responsive and target size (G)

Screenshots: `resp-{home,book,blog}-{320,390,768,1024,1440}.png` (full page). `document.documentElement.scrollWidth <= innerWidth` at 320 and 390 on all three pages: **PASS** (rail items extend past the viewport only inside the overflow-scrolling track, as intended). Reviewed strips `resp-home-320-strip.png`, section captures `sec-{faith,children,about,quote}-320.png` — all sections render; the blank cover slots visible in the *full-page* 320 capture are a fullPage-capture artefact of `loading="lazy"` (viewport captures show them loaded; `img.complete` true for all after scrolling).

Targets < 44×44 (all others ≥ 44):

| Element | Size | Pages | Note |
|---|---|---|---|
| `a.brand` "Courtney Thomas" | 130×40 | all, 320/390 | 4 px short (Sprint 1 header) |
| `button.nav-drop__btn` "Open the books menu ▾" | 24×44 | all, ≥ 901 px | width 24 — the arrow-only disclosure button next to the Books link |
| `button#skip.nav-skip` "Skip" | 34×44 | home while hero writes | hero chrome (frozen file? no — `.nav-skip` is in styles.css) |

## Motion (H) and Sprint 2 extras (I, J)

- Reduced motion (390×844, `prefers-reduced-motion: reduce`): **0 running animations** on any element; hero renders end state (cover `rotateY(180°)`, left page opacity 1, 505 characters of page text); `reduced-390-first-viewport.png`. 18 elements keep non-zero `transition-duration` (`.jacket` transform/box-shadow 0.5 s, `.nav-skip` colour, reveal icons 0.3 s) — hover/focus transitions only, nothing runs; **informational**, not a WCAG issue (2.3.3 is AAA), but a `@media (prefers-reduced-motion)` reset to `transition-duration: 0.01ms` on `.jacket` would be cleaner.
- No rail auto-advance over 10 s: PASS (scrollLeft 0,0 → 0,0).
- **I. First 390×844 viewport (reduced motion): FAIL by design.** Band cover top = 868 px, "Buy the book" CTA top = 1407 px; the first viewport is the open hero + SCROLL cue. Count of `.btn--primary` with top < 844 = **0** (band CTA at 1407, newsletter Subscribe at 8599; header Newsletter button is display:none at 390). At 1440 the header "Newsletter" `.btn--primary` **and** the band's "Buy the book" are both visible when the band is on screen (engineer item 3).
- I. Network: 0 requests to `fonts.googleapis.com`/`gstatic` or any third party (Lighthouse network records + Playwright request log). Fonts are 8 local woff2.
- I. `og:image` absolute `…/the-price-of-choosing-you-cover@2x.jpg` → 200; `og:image:width/height` 1200×1977 = actual JPEG (PIL). Book page What We Keep: 1200×2427 = actual. RSS `<link rel=alternate>` on every page; canonical on every page except privacy/thank-you/404 (Defect 6).
- **J. Return visit: PASS.** Load `/`, finish (Escape) → `sessionStorage['ct-hero-opened'] = "1"`; reload → at t≈0.3 s `html` has no `bk-pre`, cover already at 180°, full text, cue visible (`return-visit-390-t0.3s.png`, `return-visit-1440-t0.3s.png`). (First attempt timed at 9 s failed only because the natural write takes ~13.3 s and had not set the key yet.)

## Defects

1. **Blocker (bar) — Lighthouse mobile performance 72 on `/`** (LCP 5.8 s, TBT 220 ms). Page `/`, mobile preset, `lh-home-mobile.json`. Expected ≥ 95 / LCP < 2.5 s. Actual 72 / 5.8 s. LCP element is the hero's `.bk-cover-front` (204 KB 2× cover + textures, blocking `opening.js`) — all inside the byte-frozen hero, and c0027e3 itself scores ~75. Violates acceptance "Lighthouse ≥ 95 all four categories on / at mobile". Cannot be fixed without touching hero files → **decision for Brian** (accept, or authorise a hero-asset-only change such as `fetchpriority=high`/AVIF cover/deferred script).
2. **Blocker (acceptance) — featured cover + Buy CTA not inside the first 390×844 viewport** under reduced motion or return visit. `reduced-390-first-viewport.png`: viewport shows the open hero; band starts at y=868, CTA at y=1407. Expected per acceptance item 2; actual requires one swipe/tap on SCROLL. Structural: hero is `min-height:100dvh` (frozen). → decision for Brian (see below).
3. **Major — focus indicator contrast 2.02:1 on paper** (WCAG 2.1 1.4.11 Non-text Contrast, AA). Every `a/button/input:focus-visible` uses `outline: 2–3px solid var(--gold-warm)` (`src/css/styles.css:78-84`, `src/css/components.css:34-48`, token `--focus`). Against `--paper` 2.02, `--paper-lift` 2.18, `--paper-sunk` 1.86; only on leather (5.44) does it pass. Repro: Tab to any book-card title, reading-order step, nav link or form field at 1440 (`focus-1440-book-card-title.png`, `focus-390-primary-cta.png` — ring vs leather passes, ring vs surrounding paper does not). Expected ≥ 3:1 vs adjacent colours. Fix options for the engineer: a two-tone ring (`outline: 3px solid var(--gold-deep)` = 5.8:1, or `box-shadow: 0 0 0 2px var(--paper), 0 0 0 5px var(--leather)`), keeping `--gold-warm` as the inner accent. I did not change it because `--focus` is a palette token.
4. **Minor — `.post-meta` date/meta line 3.7:1** (`--ink-faint` on paper, 12.8 px caps) on `/blog/` and post pages (`src/css/styles.css:665-671`, Sprint 1 CSS). WCAG 1.4.3 needs 4.5:1. Swap to `--ink-soft` (7.1:1) or `--gold-deep`. One-token change; not made because it is a Sprint 1 file outside this sprint's components.
5. **Minor — Books disclosure state mismatch.** Tabbing onto `.nav-drop__btn` shows the panel through `.nav-item--books:focus-within .nav-drop { display: grid }` (`components.css:493`) while `aria-expanded` stays `false`; the next Tab lands inside a panel the button says is closed. Repro: Tab ×4 on `/` at 1440 (`nav-tab-into-dropdown-1440.png`). Expected `aria-expanded` to mirror the visible state (or the CSS `:focus-within` opener to be JS-gated). WCAG 4.1.2.
6. **Minor — no `<link rel=canonical>` on `/privacy.html`, `/thank-you.html`, `/404.html`** while every other page has one (acceptance "RSS/canonical/alternate present on every page"). Template gap in the base layout for pages without `permalink` data.
7. **Minor — targets under 44×44**: `.brand` 130×40, `.nav-drop__btn` 24×44, `.nav-skip` 34×44 (table above). WCAG 2.5.5 is AAA; 2.5.8 (24 px) passes. Project bar says ≥ 44.
8. **Minor — two `.btn--primary` visible at ≥ 901 px** (header "Newsletter" + band "Buy the book") — engineer item 3. Content area has exactly one; spec wording "exactly one primary CTA above the fold" is ambiguous about the header. Decision 3.
9. **Note (not a defect)** — decorative cover pattern: 12 home / 6 book-page cover `<img alt="">` sit inside `<a aria-hidden="true" tabindex="-1">` next to a text link to the same URL. This is the WAI-recommended redundant-link pattern and axe passes it; the brief's literal "every cover: Cover of <title> by Courtney Thomas" is met for the band cover (the one that carries meaning). If Brian wants every cover announced, drop `aria-hidden` and give the alt — but that doubles link announcements per card.

## What I fixed myself

Nothing — the brief for this run was "do not fix; report". Candidate one-line `qa:` fixes for the engineer: Defects 4 (token swap on `.post-meta`), 6 (canonical on three pages), 5 (`aria-expanded` sync).

## Handed back to engineering

Defects 3 (focus-ring contrast — needs a design-token decision because `--focus` is a palette token), 5, 6, 7.

## Decisions needed from Brian

1. **Mobile Lighthouse bar vs frozen hero.** Accept 72–78 on `/` mobile (desktop 98) as the price of the signature hero, or permit a hero-asset-only optimisation (cover `fetchpriority=high` / smaller format, `defer` on `opening.js`) that would break the byte-identical rule but not the behaviour.
2. **"Band in the first viewport" for reduced-motion / return visits.** Keep the full-height hero (one swipe to reach Buy), or allow the hero to shrink (e.g. `min-height` ~70dvh at ≤ 720 px on those two paths) — a hero CSS change.
3. **Header "Newsletter" button** stays `.btn--primary` (two leather buttons when the band is on screen at desktop) or becomes secondary.
4. **`aria-current="page"` on "1 The Price of Choosing You"** in the Books dropdown on the home page — the home page is not that book's page; is the featured book meant to read as "current"? Also confirm "Journal" wording for the blog in nav/footer/`aria-current`.
5. **Focus-ring colour.** Approve a darker ring (`--gold-deep` or a leather/paper double ring) for AA — this touches the palette token `--focus`.
6. **Cover announcement policy** (Note 9): keep decorative covers silent, or announce each.
7. **Netlify Forms** — submit `newsletter` and `notes` once on the first deploy preview and confirm both appear in the Forms UI (not testable here).
