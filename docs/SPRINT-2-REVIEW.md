# Sprint 2 review — home page to publisher grade

Engineer's report for the Sprint 2 build (`src/index.njk` and its partials, `src/css/home.css`, structured data / OG, self-hosted fonts). Every number below was measured on the final build (`_site/` from the last commit of this sprint). Screenshots are under `/home/claude/shots/sprint2/`; Lighthouse JSON is beside them.

## 1. What was built

| Step | Delivered | Where |
|---|---|---|
| 1 | `site.featured` (`slug`, `statusPill`, `hook`, `ctaPrimary`, `ctaSecondary`; defaults copied from `homeCopy.hero`) and `site.newsletter.leadMagnet: null`. `validate-data` asserts the slug exists, the hook ≤ 120 chars, and that no banned word (`award`, `bestsell`, `★`, `review`, `TODO`, `lorem`, `coming soon`) appears in `homeCopy.json` or `site.featured`. | `src/_data/site.json`, `scripts/validate-data.mjs` |
| 2 | Decision band, first child of `main#library`: eyebrow, H1 (`homeCopy.hero.name` visually hidden + positioning line), pill, hook, one `.btn--primary` "Buy the book" → `/books/the-price-of-choosing-you.html#buy`, `.btn--secondary` → `/#books`, trust line (`site.distribution`). Cover: `cover()` macro, `loading="eager" fetchpriority="high"`, width/height from `books.json`. | `partials/decision-band.njk` |
| 3 | Start here: two cards from `homeCopy.startHere`, bodies are the `books.json` taglines, 96 px `small` covers. | `partials/start-here.njk` |
| 4 | `#books`: "Book N of 3" labels (no series suffix), year · format, three-column grid ≥ 900 px / `.rail` below (same markup; controls hidden at desktop), prev/next `aria-label` from `homeCopy.a11y`, scroll-snap, ← → Home End keys (`rail.js`, Sprint 1, deferred). `#reading-order` strip: numbered 56 px mini-jackets joined by a gold rule, titles reserved to two lines so jackets share a baseline, `orderNote`, "About the series" → `/#books`. | `partials/series-shelf.njk`, `partials/rail.njk`, `partials/book-card-new.njk` |
| 5 | `#faith`: Rooted / Self-Worth ("Published as Finding Yourself" from `publishedAs`) / 365 Days with category nouns on the label line; "For children" row (`category == "children"`) as a `.panel--spine` card. | `partials/standalone-shelf.njk` |
| 6 | Quote band from `author.quotes[0]` only, `cite` linked to `/books/rooted-in-purpose.html`, `blockquote[cite]`. | `partials/quote-band.njk` |
| 7 | `#about`: `author.bioLong` verbatim; `author.headshot` null → CSS monogram "CT" (no `<img>`); non-null → `<img>` + credit. "More about Courtney" → `/#about`. | `partials/author-intro.njk` |
| 8 | `#journal`: `collections.postsNewest | head(3)`, `readableDate`, description, up to two chips from `relatedBooks[]`, "Read the Journal" → `/blog/`, RSS → `/blog/rss.xml`. New `head` filter. | `partials/journal-teaser.njk`, `eleventy.config.js` |
| 9 | `#newsletter`: inline form with visible "First name" (optional, `autocomplete="given-name"`) + "Email" labels, promise, privacy note, lead-magnet line only when `site.newsletter.leadMagnet`. Footer mini-form unchanged (byte-identical to the original apart from its `-footer` id suffix). | `partials/newsletter-section.njk`, `partials/newsletter-form.njk` |
| 10 | `#contact`: notes form markup byte-identical to Sprint 1 (asserted by `check-urls`); intro from `homeCopy.contact`; `#form-note` restyled in-palette (`opening.js` untouched). | `partials/contact-section.njk` |
| 11 | Home `@graph`: `Person` (`sameAs` only from non-null `site.social` — currently absent), `WebSite`, `ItemList` of 7 books (position/name/url). `BreadcrumbList` on journal index, posts and accessibility page (book pages keep theirs). OG: `og:type website`, absolute `og:image` (`…/the-price-of-choosing-you-cover@2x.jpg`), `og:image:width/height` = **1200 × 1977** (measured; the @2x files are not exactly 2×, e.g. 988 × 2 = 1976 ≠ 1977, so `cover.width2x/height2x` were added to `books.json` and `validate-data` checks them against the JPEG SOF header), `og:image:alt`, `og:site_name`, `og:locale`, `twitter:card summary_large_image` + title/description/image/alt, canonical, RSS alternate. | `partials/jsonld-home.njk`, `partials/jsonld-breadcrumbs.njk`, `partials/head-meta.njk` |
| 12 | Fonts self-hosted: `@fontsource/cormorant-garamond` + `@fontsource/outfit`, `scripts/sync-fonts.mjs` copies the 8 latin woff2 files (Cormorant 500/500i/600/700, Outfit 300/400/500/600, 149 KB total) to `src/fonts/`; `src/css/fonts.css` (`font-display: swap`, Google's latin `unicode-range`); Google Fonts preconnect/link removed from every layout; `/fonts/*` immutable in `netlify.toml`. Preloads: Cormorant 500 + Cormorant 500 italic (see §4). | `src/fonts/`, `src/css/fonts.css`, `layouts/base.njk` |
| 13 | Covers: 1 eager (band), 12 lazy + `decoding="async"`. LCP element (both presets): `div#bk-book > div.bk-right > div#bk-cover > div.bk-cover-front` — the hero cover, as expected. | Lighthouse JSON |
| 14 | This document, screenshots, gates. | — |

Also: `.reveal` fade-up (≤ 300 ms, `js/reveal.js` deferred, IntersectionObserver, off under reduced motion and without JS; not applied to hero, band, rails, forms or footer); `scripts/serve-h2.mjs` (HTTP/2 local server so Lighthouse models the production protocol); `check-urls` now asserts the newsletter form at attribute level, the footer mini-form and notes form byte-for-byte, all nine anchors plus `#enter`/`#skip`, and exactly one `.btn--primary` in the band.

## 2. Gates

| Gate | Result |
|---|---|
| `node scripts/check-hero.mjs` | OK after every commit — hero section byte-identical (2468 bytes), 8 hero assets hash-identical to `c0027e3`, head order preload → styles.css → hero.css → inline bk-pre → favicon, `opening.js` last blocking script on `/` only |
| `npm run verify` | OK — 67/67 URLs 200 with expected types, 0 baseline files missing (18 additions: fonts, css, js, accessibility, styleguide), 1259 local links, forms intact, anchors present, one primary in the band |
| `node scripts/validate-data.mjs` | OK |
| Hero timing vs Sprint 1 captures (Google Fonts) | `fonts/self-1440-final.png` vs `s1-fixed-hero-1440-end.png`: **0 pixels differ**. 390: 153 px differ, all inside the animated scroll-cue line (`fonts/cmp-390-bottom.png`). `.bk-text` height 210 px (1440) / 333 px (390) and line counts 7 / 14 identical with both font sources; no external requests. t≈0.8 s / t≈2.4 s captures: `fonts/google-*` vs `fonts/self-*` (mid-animation frames differ only by capture jitter of the 3D turn; text is not yet on the page at 2.4 s). |
| axe-core 4.13 (wcag2a/2aa/21a/21aa + best-practice) | **0 violations** on `/` at 1440, 390, 390 with menu open, 320; also 0 on a book page, `/blog/` and a post. Incomplete items are the gradient body background (as in Sprint 1). |
| Targets | Every `a`/`button`/`input` in `main` and `footer` ≥ 44 × 44 at 320/390/1024/1440 (inline title and prose links get a padding/negative-margin hit area; layout unchanged) |
| 320 px | `scrollWidth === clientWidth` at 320, 390, 1024, 1440; no clipping |
| Reduced motion | `reveal.js` does not add `has-reveal` (everything visible, no transitions); jacket/button `transition-duration: 0s`; rail `scroll-behavior: auto`; hero handles itself |
| Keyboard | Rail track focusable; ArrowRight scrolls 175 px; prev/next buttons real `<button>`s with `disabled` at the ends and a live status ("Showing from item 1 of 3"); nothing hover-only |
| Third-party | No external request on `/` (Google Fonts gone) |
| Banned strings | `grep -rEIi "TODO|bestsell|award-winning|★" _site/` → nothing (the only match is a byte pattern inside the untouched binary `media/book/open-left.jpg`) |
| JSON-LD | Every block parses; home has Person / WebSite / ItemList(7, positions 1–7, absolute urls); `sameAs` absent (all socials null); books have Book + BreadcrumbList; journal/blog/accessibility have BreadcrumbList |
| Exactly one primary above the fold | In the content: yes (band). The fixed header's "Newsletter" button is also `.btn--primary` (Sprint 1 nav design) — see §5 decision 4 |

## 3. Lighthouse (final build)

| Preset | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | SI | File |
|---|---|---|---|---|---|---|---|---|---|---|
| Desktop (HTTP/2) | **98** | 100 | 100 | 100 | 0.4 s | 0.9 s | 0 ms | 0.001 | 1.2 s | `lh-home-desktop.json` |
| Mobile (HTTP/2) | **78** | 100 | 100 | 100 | 2.0 s | 4.9 s | 130 ms | 0.001 | 3.3 s | `lh-home-mobile.json` |
| Mobile (HTTP/1.1 `serve.mjs`) | 76 | — | — | — | 2.0 s | 5.7 s | 140 ms | 0.001 | 2.9 s | `lh-home-mobile-http1.json` |

Reference points, same machine, same preset (mobile, HTTP/2): the **original pre-migration page (`c0027e3`) scores 75, LCP 4.6 s**; Sprint 1's build scored 76, LCP 4.4 s; **a copy of this page with everything after the hero removed scores 83, LCP 4.1 s**. CLS improved from 0.085–0.091 (hero font swap) to 0.001.

**The mobile performance bar (≥ 95, LCP < 2.5 s) is not met and cannot be met without changing the hero.** The LCP element is the hero's cover (`.bk-cover-front`, background `media/book/cover.jpg`, 204 KB at 2×; hero.css also loads two ~130 KB page textures), `opening.js` runs as a blocking script with a 290 ms long task on the throttled CPU, and the hero-only floor is 4.1 s. Sprint 2's own additions cost ≈ 0.6 s of simulated LCP (the extra 21 KB `home.css` on the render-blocking path and the two font preloads); experiments recorded during the sprint:

| Variant (mobile, HTTP/2) | Perf | LCP | CLS |
|---|---|---|---|
| No font preload | 79 | 4.4 s | 0.089 |
| Preload Cormorant 500 italic only | 78 | 4.8 s | 0.001 |
| Preload Cormorant 500 + 500 italic (shipped) | 80–82 | 4.3–4.8 s | 0.001 |
| Shipped + `fonts.css` inlined | 79 | 4.7 s | 0.001 |
| `home.css` removed (not viable) | 75 (h1.1) | 4.4 s | — |

The preloaded pair was chosen because the italic is the hero's page text: preloading it removes the font-swap layout shift (0.085 → 0.001), which is a Core Web Vital pass, and LCP moves within run-to-run variance. What would move LCP under 2.5 s is all hero territory (a smaller/AVIF hero cover, lighter page textures, deferring `opening.js`) and is out of scope by the sprint's hard constraint; recommended for the PM to schedule as a hero-owner decision.

## 4. Screenshots (all reviewed with the Read tool)

| File | What it shows |
|---|---|
| `s2-home-1440-full.png`, `s2-home-1024-full.png`, `s2-home-390-full.png`, `s2-home-320-full.png` | Full page at each width (helper walks the page so `.reveal` items are shown) |
| `s2-band-390-reduced-motion.png` | First viewport at 390 under `prefers-reduced-motion: reduce`: the hero (100dvh, untouched) fills it; the band is not inside the first 844 px — exactly as `docs/HOME-SPEC.md` §3.1 predicted |
| `s2-band-390-reduced-motion-library.png`, `s2-band-390-return-visit-library.png` | Where the scroll cue / Skip / one swipe lands (`#library`): cover, H1, pill, hook, **Buy the book**, Explore, trust line all inside one 844 px viewport (reduced motion and `sessionStorage ct-hero-opened` paths) |
| `s2-band-390-return-visit.png` | Return-visit first viewport (hero open state) |
| `s2-band-320.png` | Band at 320 × 568 (needs one extra swipe, no clipping) |
| `s2-band-1440-reduced-motion-library.png` | Band at 1440 |
| `s2-focus-band-cta-390.png` | Focus ring on the primary CTA |
| `s2-rail-390.png` | Series rail after one "next" press (mid-scroll, Book 2 + Book 3) |
| `s2-nav-dropdown-1440.png` | Books dropdown open |
| `s2-nav-open-390.png` | Mobile menu open |
| `fonts/google-*`, `fonts/self-*`, `fonts/cmp-*` | Hero timing captures with Google Fonts vs self-hosted fonts |

## 5. Decisions pending from Brian / PM

1. **Featured title and status pill.** Ships as The Price of Choosing You / "Available now" (`site.featured`). Change `site.featured.*` and `homeCopy.hero.eyebrow` together if another title should lead.
2. **Author photo.** Monogram ships; supply `author.headshot {src, alt, width, height, credit}` and the template swaps it in (same 4:5 box, no layout shift).
3. **"Above the fold" on phones.** The hero is 100dvh by design, so the band is one tap on SCROLL / one swipe below it on every visit (`s2-band-390-reduced-motion.png` vs `…-library.png`). Accept, or approve a hero change in a later sprint.
4. **Header "Newsletter" button.** It is `.btn--primary` in the fixed header (Sprint 1 design), so two leather buttons are visible when the band is on screen. If "exactly one primary above the fold" should include the header, change the nav CTA to `.btn--secondary` (one class in `partials/nav.njk`); I left the Sprint 1 nav as reviewed.
5. **Newsletter name field.** The home form now posts `name` + `email` under the same Netlify form name; the footer mini-form posts `email` only. Netlify builds the field list from the HTML at deploy time — confirm on the first deploy preview that both submissions appear with the expected columns (PM acceptance item).
6. **Lead magnet.** `homeCopy.newsletter.leadMagnetLine` renders only when `site.newsletter.leadMagnet` is set (currently `null`).
7. **Contact success/error notes.** `homeCopy.contact.successNote/errorNote` exist but `opening.js` (untouchable) writes its own text into `#form-note`; the notes form markup is byte-identical to Sprint 1, so the strings are not wired. Wire them when `opening.js` is next allowed to change.
8. **Series page / About page links.** "Explore the Price Series" and "About the series" → `/#books`; "More about Courtney" → `/#about`. Sprint 3 / 4 retarget.
9. **"Blog" vs "Journal".** `site.footerNav` still says Blog (unused by the Sprint 1 footer); the page says Journal everywhere.
10. **Mobile performance bar** — see §3; needs a hero-owner decision.
11. **What We Keep jacket** is a different ratio (600 × 1213) and softer than the other two; shelves bottom-align jackets so it stands taller (uncropped, by spec). A print-resolution file would fix both.

## 6. Deviations from the design spec (engineer's calls, all reversible)

- Card buttons keep the Sprint 1 pairing (Read more = quiet, Buy = outlined) instead of the spec's inverse, so the home shelves match the book pages' related rail and the styleguide; still one bordered button per card.
- Taglines and post descriptions are not line-clamped (the spec allowed either); nothing is hidden behind an ellipsis at any width.
- `.reveal` is not applied to rail items: on a horizontal rail the staggered fade made a freshly scrolled-to card look blank for ~0.5 s.
- The band's primary CTA uses a visually-hidden suffix (": The Price of Choosing You") instead of `homeCopy.hero.ctaPrimaryAria` as an `aria-label`, because the aria-label's text did not contain the visible label (WCAG 2.5.3 / Lighthouse `label-content-name-mismatch`).
- Rail regions are named "{heading} covers" so the section landmark and the rail landmark have distinct names (axe `landmark-unique`).
- `admin/analytics.html` (self-contained dashboard, copied verbatim, not a layout) still references Google Fonts; left as is per the Sprint 1 rule that it is never templated.

## 7. Not done / carried

- New home components (`.hero-band`, `.start-card`, `.reading-order`, `.post-tile`, `.monogram`, `.form-note` states) are not yet on `/styleguide.html` (spec §16 item 12); the styleguide page loads only `styleguide.css` as its extra sheet.
- CSS is unminified (Lighthouse "unminified-css" 18 KB); a build-time minifier must leave `hero.css` byte-identical, so it belongs with Sprint 5's minification work.
- Cross-browser sweep (iOS Safari `:user-invalid`, `text-wrap: balance`) is Sprint 5.
