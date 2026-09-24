# Home page design spec — Sprint 2

Art director's build spec for `/` (`src/index.njk`). Written so the engineer can build every section without asking a question. Inputs read: `docs/PLAN.md` §3, `docs/SPRINT-1-AD-REVIEW.md`, the `252b6c3` fix commit, `src/css/styles.css` tokens, `src/css/components.css`, `src/_data/{site,books,author}.json`, the blog posts' front matter, and the captures in `/home/claude/shots/` (`s1-review-home-*`, `s1-fixed-*`, `s1-fixed-hero-390-reduced-motion.png`, `s1-fixed-styleguide-cards-1440.png`, `s1-fixed-styleguide-rail-390.png`, `s1-fixed-footer-1440.png`).

> Note on inputs: `src/_data/homeCopy.json` landed in `966cd2c` while this spec was being written (see `docs/COPY-NOTES.md`). Every string on the page comes from it, from `site.json` (`distribution`, `bookGroups`, `featuredSlug`), `books.json` (`eyebrow`, `tagline`, `year`, `format`, `publishedAs`, `series.*`, `cover.*`) or `author.json` (`bioLong`, `headshot`, `quotes`). §14 maps each slot to its key. This spec never writes copy; where it quotes a line it is only to measure it.

---

## 0. Non-negotiables (restated; the engineer checks every one before the sprint review)

1. **The hero is not designed here.** `section.bk-hero` (`partials/hero.njk`), `css/hero.css`, `js/opening.js` and `media/book/*` stay byte-identical (`scripts/check-hero.mjs` gate). This spec starts at the pixel after `</section>` of the hero. Nothing in it changes the hero's height (`min-height: 100dvh`), background, scroll cue, Skip button, timing, head order or the inline `bk-pre` script.
2. **Palette is fixed.** Only these colour tokens may appear in new CSS: `--paper #f6edd7`, `--paper-sunk #efe4c9`, `--paper-lift #fbf6e9`, `--ink #1c1410`, `--ink-soft #5c4b40`, `--ink-faint #8a7668` (non-text use only, see §12), `--leather #5a1d27`, `--leather-lo #40141c`, `--gold #8f6a30`, `--gold-deep #755526` (small text only), `--gold-warm #c9a367`, `--line`, `--line-firm`, and the `--paper-a*` / `--ink-a*` alpha tokens in `components.css`. No new hex values, no gradients beyond the existing `.panel--leather` treatment, no textures, florals, scripts or icons. The only glyphs are the existing `→`, `←`, `↗`, `▾` and the typographic quote marks.
3. **Type is fixed.** Cormorant Garamond 500/600/700 + italic 500 for display; Outfit 300–600 for everything else. No new families or weights (`site.fontsHref` is the whole font budget). Sizes come only from `--step--1` … `--step-5`. Spacing only from `--space-1` … `--space-8`. Shadows only `--lift-1/2/3`. Radii only `--radius-s/m/l/pill`. Motion only `--dur-fast/base` with `--ease`.
4. **No stock people.** `#about` shows a typographic monogram until `author.headshot` is non-null (both states specced in §9).
5. **No fabricated trust.** No star rows, badge rows, press logos, "as seen in", testimonial carousels, "bestselling" or "award-winning" anywhere. Trust lines are real facts only and come from data: publication years, "three novels", formats, `site.distribution` ("In print worldwide through IngramSpark").
6. **Netlify Forms keep their markup.** `form[name]`, `method="POST"`, `action="/thank-you"`, `data-netlify`, `netlify-honeypot`, hidden `form-name`, honeypot `<p hidden>`; `opening.js` keeps its `notes` submit handler and `#form-note`. This spec covers appearance only (§11–12). The one markup deltas it needs — a visible `<label>` (drop `.visually-hidden`) and a `name` field on the newsletter form — are additive and listed as an engineer decision in §16 because `scripts/check-urls.mjs` currently asserts byte-equivalence of both forms and must be relaxed to attribute-equivalence first.
7. **Accessibility bars.** AA contrast using only the approved pairs in §12; every control ≥ 44 × 44 (`--target`); visible focus = `outline: var(--focus); outline-offset: var(--focus-offset)` on every new interactive element; every transition this spec introduces is switched off under `prefers-reduced-motion: reduce`; nothing is hover-only; no auto-rotating rails; every layout works at 320 px with `documentElement.scrollWidth === clientWidth`.
8. **Performance.** No new fonts/weights, no background images beyond covers (`media/covers/*`), no third-party embeds. The only eager images on the page are the hero cover (preloaded, LCP) and the featured cover in the decision band. Every other cover is `loading="lazy" decoding="async"`.

---

## 1. Page-wide system

### 1.1 Containers

| Name | Width | Where |
|---|---|---|
| `.container` (new) | `width: min(var(--wide), calc(100% - 10vw)); margin-inline: auto` → 1152 px at 1440, 922 px at 1024, 351 px at 390, 288 px at 320 | every home section, so home content and the footer grid (`max-width: var(--wide)`) share one edge. The legacy `.wrap` (1120 px) stays for Sprint 3 pages; do not retro-fit it. |
| `.container--measure` | `max-width: var(--measure)` (65ch) inside `.container` | quote band, newsletter heading block, contact lede |

Side gutter never drops below 16 px (`5vw` at 320 = 16 px). Rails at < 900 bleed to the viewport edge using the built `.rail__track` negative margin; nothing else bleeds.

### 1.2 Vertical rhythm (stated once; exceptions are listed per section)

| | ≥ 1024 | < 1024 |
|---|---|---|
| Section `padding-top` | `--space-8` (72) | `--space-7` (48) |
| Section `padding-bottom` | `--space-7` (48) | `--space-6` (32) |
| Gap between adjacent sections (bottom + top) | 120 px | 80 px |
| `.section-head` `margin-bottom` | `--space-6` (32) | `--space-5` (24) |
| Section-head hairline (`.section-head--rule`) | `border-top: 1px solid var(--line-firm); padding-top: var(--space-5)` | same |
| Inside a card / panel: element gap | `--space-3` (12) | `--space-3` |
| Between button pairs | `--space-3` (12) | `--space-3` |

Every home section is `<section class="home-section container" id="…">`. The hairline rule sits inside the section, above the section head, so the 120-px gap reads as 72 + rule + 48. Exceptions: decision band (§3), reading-order strip (§5), children's row (§6), quote band (§7) and footer (§13).

### 1.3 Type roles used on the page

| Role | Face | Size | Weight | Colour | Notes |
|---|---|---|---|---|---|
| Eyebrow | Outfit | `--step--1` | 500 | `--gold-deep` (on leather: `--gold-warm`) | `letter-spacing: 0.16em; text-transform: uppercase` (existing `.eyebrow`) |
| H1 (decision band only) | Cormorant | `--step-4` | 500 | `--ink` | `line-height: 1.02; text-indent: -0.04em` (existing `.section-head h1`) |
| Section H2 | Cormorant | `--step-3` | 500 | `--ink` | `line-height: 1.05` (existing `.section-head h2`) |
| Card H3 | Cormorant | `--step-1` | 500 | `--ink` | `line-height: 1.15` (existing `.book-card h3`) |
| Post-card H3 | Cormorant | `--step-2` | 500 | `--ink` | §10 |
| Quote | Cormorant italic | `--step-3` | 500 | `--paper` | §7 |
| Monogram | Cormorant | `--step-5` | 600 | `--gold-warm` | §9 |
| Lede / hook | Outfit | `--step-1` | 300 | `--ink-soft` | `line-height: 1.45` |
| Body | Outfit | `--step-0` | 400 | `--ink` (bio: `--ink-soft`) | `line-height: 1.6` |
| Meta (year · format, dates) | Outfit | `--step--1` | 400 | `--ink-soft` | `letter-spacing: 0.04em` |
| Button | Outfit | `.btn` (0.74rem, fixed by the component) | 500 | per variant | uppercase, tracked |
| Pill | Outfit | `.pill` (0.68rem) | 500 | per variant | |
| Privacy note / credits | Outfit | `--step--1` | 400 | `--ink-soft` | never `--ink-faint` |

### 1.4 Cover treatment (one treatment, three sizes)

Always the built `.jacket` (spine highlight `::after`, page-edge `::before`, `border-radius: 1px 3px 3px 1px`, `box-shadow: var(--lift-2)`), inside the `cover()` macro's `<picture>`. Never crop, never letterbox, never force a ratio: the `<img width/height>` attributes carry each cover's real dimensions from `books.json` so there is no CLS. Real ratios on the page:

| Cover | w × h | ratio | height at 300 / 240 / 160 / 96 / 56 px wide |
|---|---|---|---|
| The Price of Choosing You | 600 × 988 | 0.607 | 494 / 395 / 263 / 158 / 92 |
| The Price of Letting Go | 600 × 982 | 0.611 | 491 / 393 / 262 / 157 / 92 |
| What We Keep | 600 × 1213 | 0.495 | 607 / 485 / 323 / 194 / 113 |
| Rooted in Purpose | 600 × 1177 | 0.510 | 589 / 471 / 314 / 188 / 110 |
| Finding Your Self-Worth | 600 × 1113 | 0.539 | 557 / 445 / 297 / 178 / 104 |
| 365 Days of Grace | 600 × 903 | 0.664 | 452 / 361 / 241 / 144 / 84 |
| Finding Drake's Feather | 600 × 1131 | 0.531 | 566 / 452 / 302 / 181 / 106 |

Alignment rule: in any row of covers, the cover slot is a flex column with `align-items: flex-end` and `aspect-ratio: 600 / 1213` (the tallest jacket; already built as `.book-grid .book-card__cover, .rail .book-card__cover`), so every jacket sits on one bottom baseline and the text rows below start on one line. Widths per context: decision band 300 (≥ 1024) / 220 (1024–700) / 160 (< 700); shelf cards `max-width: 240px` (≥ 1024), 200 (1024–900), rail `clamp(150px, 42vw, 210px)` below 900; start-here 96; reading-order 56; children's row 120; monogram slot n/a.

Hover/focus (pointer + keyboard, never hover-only): the built `.book-card__cover:hover .jacket, :focus-visible .jacket` lift (`rotateY(-7deg) translateY(-6px) scale(1.012)`, `--lift-3`) at `--dur-base`; under reduced motion the transform is dropped and only the shadow changes (already in `components.css`). The cover link always wraps the whole jacket; the target is the jacket itself (≥ 96 px, well over 44).

`srcset` rule: covers ≥ 200 px rendered width get the full macro (`1x` + `@2x`, jpg + webp). Covers ≤ 120 px rendered width use `small: true` (600-px 1x files only, `fetchpriority="low"`). The decision-band cover is `loading="eager"` **without** `fetchpriority="high"` (the hero preload owns LCP); the macro needs an `opts.priority === false` branch for that one call. Everything else lazy.

### 1.5 Motion (the only motion this spec introduces)

`.reveal` — fade-up on scroll, applied to shelf cards, start-here cards, post cards, the quote panel and the about columns. Never applied to the hero, the decision band or the footer.

```css
.has-nav-js .reveal { opacity: 0; transform: translateY(12px);
  transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.has-nav-js .reveal.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
}
```

- Driven by one IntersectionObserver in a new deferred `js/reveal.js` (threshold 0.15, `rootMargin: 0 0 -8%`, unobserve after first entry). Elements in a row may stagger by `--dur-fast` per item via `transition-delay`, max 3 steps.
- Without JS (`.has-nav-js` absent) everything is visible. Under reduced motion everything is visible and static. Duration is `--dur-base` (300 ms) — never longer.
- Do not reuse the legacy `.card` scroll-timeline `settle` animation from `styles.css` (it is what leaves blank cards in full-page captures); the new components use `.book-card` and are not matched by it.
- All other motion is the component library's own (button colour `--dur-base`, cover lift, rail `scroll-behavior: smooth`), all already reduced-motion-guarded.

### 1.6 Interaction states (site-wide, reused by every section)

| Element | Rest | Hover | Focus-visible | Active | Current |
|---|---|---|---|---|---|
| `.btn--primary` | leather fill, paper text | `--leather-lo` | `--focus` ring | `translateY(1px)` | — |
| `.btn--secondary` | transparent, `--gold` 1px border, leather text | `--paper-lift` fill, leather border | ring | translateY(1px) | — |
| `.btn--quiet` | ink-soft text, `--line-firm` underline | leather text + underline | ring | — | — |
| Cover link | `--lift-2` | lift + `--lift-3` | same as hover + ring | — | — |
| Title link (`h3 a`) | ink, no underline | leather | ring | — | — |
| Chip / pill-link | paper-lift, `--line` border | `--paper` fill, ink border | ring | — | — |
| Rail button | paper-lift circle | `--paper`, ink border | ring | — | `:disabled` opacity .35 at track ends |
| Inputs | paper-lift, `--line-firm` 1px | — | `border-color: var(--gold-warm)` + ring | — | `:user-invalid` border `--leather` |
| Nav / footer links | as built | as built | as built | — | `aria-current` gold underline (built) |

Every state above already exists in `components.css` except the input rules (§11) and `.form-note` (§12).

### 1.7 Empty-state rule

A block renders only when its data is non-empty, and when it does not render **nothing else moves**: no placeholder, no reserved height, no dangling rule or heading. Per section: featured book missing → the band still renders with the H1/tagline and a single secondary "Explore the books" button pointing to `#books` (never an empty cover slot); `author.quotes` empty → §7 is absent and §6 flows straight into §8 with the standard 120-px gap; `author.headshot` null → monogram (this is the launch state, not an empty state); fewer than three posts → the journal grid has that many columns (`auto-fit`), zero posts → §10 absent; `book.publishedAs` null → eyebrow line still rendered (empty, `min-height: 1.4em`, as built) so rows align; `book.year` null → meta line shows format only; `site.newsletter.leadMagnet` null → no lead-magnet line; `site.social.*` all null → no social row anywhere.

---

## 2. Wireframes

### 2.1 Full page at 1440 (container 1152, gutters 144)

```
+------------------------------------------------------------------------------+ 0
|  HERO  (section.bk-hero, untouched, 100dvh)                                  |
|                                       [SCROLL cue -> #library]               |
+------------------------------------------------------------------------------+ 100vh
|  <main id="library">                                                         |
|  DECISION BAND  .hero-band                                          pt 48    |
|  +-----------+   EYEBROW: The Price Series · Book One  (one line)            |
|  |           |   H1  Stories for the chapters we survive.        (--step-4)  |
|  |  cover    |   (pill: Paperback · 2026)                                    |
|  |  300 px   |   Hook sentence at --step-1, max 65ch                         |
|  |           |   [ BUY THE BOOK ]  [ EXPLORE THE SERIES ]                    |
|  +-----------+   In print worldwide through IngramSpark (--step--1)  pb 48   |
+------------------------------------------------------------------------------+
|  START HERE  (sunk panel)                                           pt 72    |
|  +-----------------------------------+ +-----------------------------------+ |
|  | [96]  NEW TO THE SERIES?          | | [96]  NEED A DAILY WORD?          | |
|  |       Title h3 / tagline          | |       Title h3 / tagline          | |
|  |       Start reading ->            | |       Read a day ->               | |
|  +-----------------------------------+ +-----------------------------------+ |
+------------------------------------------------------------------------------+
|  #books  ----rule----                                               pt 72    |
|  THE PRICE SERIES                        lede (28rem)   [Series page ->]     |
|  +----------+  +----------+  +----------+                                    |
|  |  cover   |  |  cover   |  |  cover   |   240 wide, bottom-aligned         |
|  |          |  |          |  |          |                                    |
|  BOOK 1 OF 3    BOOK 2 OF 3    BOOK 3 OF 3                                   |
|  Title          Title          Title                                         |
|  2026·Paperback 2026·Paperback 2026·Paperback                                |
|  tagline        tagline        tagline                                       |
|  [Read more][Buy]  [Read more][Buy]  [Read more][Buy]                        |
|                                                                              |
|  #reading-order  READ IN THIS ORDER                                          |
|  (1)[56]-------gold rule-------(2)[56]-------gold rule-------(3)[56]         |
|   Title          Title          Title             About the series ->        |
+------------------------------------------------------------------------------+
|  #faith  ----rule----                                               pt 72    |
|  DEVOTIONALS & NONFICTION                lede                                 |
|  +----------+  +----------+  +----------+   (same card as above; one card    |
|  |  cover   |  |  cover   |  |  cover   |    carries PUBLISHED AS eyebrow)    |
|  ...                                                                          |
|  FOR CHILDREN  (paper-lift panel, one row)                                   |
|  +--------------------------------------------------------------------------+|
|  | [120] eyebrow / Title h3 / 2024·Paperback / tagline / [Read more][Buy]   ||
|  +--------------------------------------------------------------------------+|
+------------------------------------------------------------------------------+
|  QUOTE  (leather panel, centred, max 65ch)                          pt 72    |
|         "Your purpose is not lost. ..."   (Cormorant italic --step-3)        |
|                    — ROOTED IN PURPOSE (gold-warm, linked)                   |
+------------------------------------------------------------------------------+
|  #about  ----rule----                                               pt 72    |
|  +--------+   ABOUT                                                          |
|  |  C T   |   Courtney Thomas (h2)                                           |
|  | 240x300|   three bio paragraphs, max 65ch                                 |
|  +--------+   More about Courtney ->                                         |
+------------------------------------------------------------------------------+
|  #journal  ----rule----                                             pt 72    |
|  JOURNAL  Notes from the page          [Read the Journal ->]  [RSS]          |
|  +-------------+  +-------------+  +-------------+                           |
|  | DATE        |  | DATE        |  | DATE        |                           |
|  | Title h3    |  | Title h3    |  | Title h3    |                           |
|  | description |  | description |  | description |                           |
|  | [chip][chip]|  | [chip][chip]|  | [chip][chip]|                           |
|  +-------------+  +-------------+  +-------------+                           |
+------------------------------------------------------------------------------+
|  #newsletter  (sunk panel)                                          pt 72    |
|  STAY CLOSE  Reader notes (h2)  promise (65ch)                               |
|  [Name          ] [Email               ] [ SUBSCRIBE ]                       |
|  privacy note (--step--1)                                                    |
+------------------------------------------------------------------------------+
|  #contact  ----rule----                                             pt 72    |
|  CONTACT                          | Name  [                    ]             |
|  Write to Courtney (h2)           | Email [                    ]             |
|  lede (65ch)                      | Note  [                    ]             |
|                                   | [ SEND ]                        pb 48    |
+------------------------------------------------------------------------------+
|  FOOTER (leather, as built)                                                  |
+------------------------------------------------------------------------------+
```

### 2.2 First two viewports at 390 × 844 (container 351, gutters 19.5)

```
+---------------------------------------+ 0      VIEWPORT 1 — hero, untouched.
|  Courtney Thomas            = MENU    |        Under reduced-motion / return
|                                       |        visit the open book fills
|        +-----------------------+      |        0–844 (s1-fixed-hero-390-
|        |   open book, text     |      |        reduced-motion.png). The band
|        |   written             |      |        is NOT inside this viewport —
|        +-----------------------+      |        see §3.1.
|                                       |
|               SCROLL                  |
|                 |                     |
+---------------------------------------+ 844    VIEWPORT 2 — lands here when
|  <main id="library">                  |        the cue / Skip / one swipe fires
|  (84 px scroll-margin absorbs the     |        (scroll-margin-top nav-h+1rem).
|   fixed header)                       |
|  +-----------+                        | 868    pt 24
|  |  cover    |                        |
|  |  160 px   |  h 263                 |
|  +-----------+                        | 1131   gap 16
|  THE PRICE SERIES · BOOK ONE          | 1147   eyebrow 18 + 8
|  Stories for the                      | 1173   H1 2 lines @ 40px = 82
|  chapters we survive.                 |
|  (Paperback · 2026)                   | 1267   pill 26 + 16
|  Kathryn wakes in the dark, wrists    | 1309   hook 3 lines @ --step-0 = 70
|  bound, and learns the man ...        |
|  [        BUY THE BOOK          ]     | 1403   44
|  [   EXPLORE THE PRICE SERIES   ]     | 1459   44
|  In print worldwide via IngramSpark   | 1515   18
+---------------------------------------+ 1567   pb 32   band = 723 px (measured)
|  START HERE (sunk panel)              | 1615   pt 48
|  +---------------------------------+  |
|  | [96] NEW TO THE SERIES?         |  |
|  |      Title / tagline            |  |
|  |      Start reading ->           |  |
|  +---------------------------------+  |
+---------------------------------------+ 1688   (end of viewport 2)
```

### 2.3 Height budget at 390 (proof for §3.1)

The header is fixed at `--nav-h` = 68 px; `#library` has `scroll-margin-top: calc(var(--nav-h) + 1rem)` = 84 px, so the usable height of the viewport the scroll cue lands on is **844 − 84 = 760 px**. The band must be ≤ 750 px at 390 so the primary and secondary buttons are both fully inside it.

I built the band as specced (real tokens, real fonts, real cover, the copywriter's `hero.hook` — 115 characters — and `hero.ctaSecondary`) and measured it headless at 390 × 844: **723 px** (`/home/claude/shots/ad2/band-390.png`; cover 263, eyebrow 18, H1 82, hook 70). Row by row:

| Row | Height | Running |
|---|---|---|
| `padding-top` `--space-5` | 24 | 24 |
| Cover 160 × (988/600) | 263 | 287 |
| gap `--space-4` | 16 | 303 |
| Eyebrow, one line (`--step--1` = 12.9 px × 1.4) | 18 | 321 |
| gap `--space-2` | 8 | 329 |
| H1 two lines (`--step-4` = 40.4 px × 1.02) | 82 | 411 |
| gap `--space-3` | 12 | 423 |
| Pill | 26 | 449 |
| gap `--space-4` | 16 | 465 |
| Hook three lines (`--step-0` = 16.1 px × 1.45 below 700; see §3.3) | 70 | 535 |
| gap `--space-5` | 24 | 559 |
| Primary button | 44 | 603 |
| gap `--space-3` | 12 | 615 |
| Secondary button | 44 | 659 |
| gap `--space-3` + trust line (18) | 30 | 689 |
| `padding-bottom` `--space-6` | 32 | **721** (measured 723) |

723 ≤ 760: both buttons sit ≥ 100 px above the fold and the trust line is the last thing in view. Three guards keep the budget true, and each was the difference between fitting and not during measurement: (a) the eyebrow is **one line** — `hero.eyebrow` ("The Price Series · Book One", 27 characters; the author's name is already in the header brand) and the validator rejects an eyebrow over 32 characters; (b) below 700 px the hook is set at `--step-0`, not `--step-1` — at `--step-1` the 115-character hook wraps to four lines and the band measures 770 px, over budget; (c) the hook is capped at 120 characters (three lines at `--step-0` in 351 px) — `scripts/validate-data.mjs` fails the build with a message rather than letting the band grow silently. At 320 × 568 the same band measures 759 px and needs one extra swipe, which is acceptable ("works at 320" means no overflow and no clipping, not one-viewport fit). **Max band height: 750 px at 390; 600 px at ≥ 1024** (measured 591 at both 1024 and 1440: 48 + 494 cover + 48).

---

## 3. Hero decision band — `#library` (directly after the hero)

**Purpose.** One book, one decision: the moment the animated hero ends, the reader sees the featured cover, the positioning line and exactly one primary action.

### 3.1 Where "above the fold" actually is (read before building)

The brief assumes the hero collapses to its end state on reduced-motion / return visits. It does not: `hero.css` sets `.bk-hero { min-height: 100dvh }` unconditionally, and `s1-fixed-hero-390-reduced-motion.png` shows the finished open book filling 0–844 at 390. Moving the band into the first 844 px would require shrinking the hero, which §0.1 forbids and which I am not asking for. The requirement is therefore restated in the only form that is honest and testable:

- The band is the **first child of `<main id="library">`**, so the hero's `#enter` scroll cue, the nav Skip button and the skip-link all land on it (`opening.js` calls `#library.scrollIntoView`; `scroll-margin-top` = 84 px is already set on `#library`).
- On reduced-motion and return visits, one swipe (or one tap on SCROLL) brings the whole band — cover, H1, pill, hook, both buttons — into view with nothing cut (§2.3).
- The primary "Buy the book" is the only `.btn--primary` in the hero + band region; the hero itself has no button styled as primary (Skip is outlined). "Exactly one primary above the fold" is measured over hero + band.

This is listed for Brian/PM in §16 as decision 3 in case they would rather trade the hero's `100dvh` for a shorter end state (I recommend not).

### 3.2 Layout

| | ≥ 1024 | 1024 > w ≥ 700 | < 700 (390, 320) |
|---|---|---|---|
| Grid | `grid-template-columns: 300px minmax(0, 1fr); gap: var(--space-7); align-items: center` | `220px minmax(0,1fr); gap: var(--space-6)` | one column; cover first, `justify-items: start` |
| Cover width | 300 | 220 | 160 (320: 140) |
| Text column | `max-width: var(--measure)` | same | full |
| Buttons | side by side, `gap: var(--space-3)`, `flex-wrap: wrap` | side by side | `.btn--block` each, stacked, `gap: var(--space-3)` |
| Section padding | `--space-7` top / `--space-7` bottom (exception to §1.2) | `--space-7` / `--space-6` | `--space-5` / `--space-6` |
| Cover → text gap | `--space-7` (column gap) | `--space-6` | `--space-4` (row gap) |
| Background | page paper (no panel); a `--line-firm` hairline at the section's bottom edge separates it from Start here | same | same |

Markup order (DOM = reading order = visual order at every width): eyebrow → H1 → pill → hook → buttons → trust line; the cover is `grid-column: 1; grid-row: 1 / span 6` at ≥ 700 and first in DOM (it precedes the text; `alt` is the book's `cover.alt`).

### 3.3 Type & content slots (no copy is written here)

| Element | Role | Slot |
|---|---|---|
| Eyebrow `<p class="eyebrow">` | §1.3 eyebrow, one line, ≤ 32 characters | `homeCopy.hero.eyebrow` (the author's name is the header brand directly above; `hero.name` is not rendered in the band — it costs a line at 390, see §2.3; it belongs in the JSON-LD `Person`) |
| `<h1 class="hero-band__title">` | Cormorant `--step-4` 500, `--ink`, `line-height 1.02`; `max-width: 14ch` at ≥ 1024 only (three lines beside the 494-px cover), no max-width below (two lines at 390) | `homeCopy.hero.positioning` |
| Pill `<span class="pill pill--outline">` | `.pill--outline` (gold border, gold-deep text) | `homeCopy.hero.statusPill` |
| Hook `<p class="hero-band__hook">` | Outfit 300, `--ink-soft`, `line-height 1.45`, `max-width: var(--measure)`; **`--step-1` at ≥ 700, `--step-0` below** (the stacked column has a 40-px H1, so the lede steps down with it; this is what keeps the band inside the 390 budget, §2.3) | `homeCopy.hero.hook`, ≤ 120 chars |
| Primary `<a class="btn btn--primary">` | label `hero.ctaPrimary`, `aria-label` `hero.ctaPrimaryAria` | `/books/{hero.featuredSlug}.html#buy` |
| Secondary `<a class="btn btn--secondary">` | label `hero.ctaSecondary` | `#reading-order` (Sprint 3: series page) |
| Trust line `<p class="hero-band__trust">` | Outfit `--step--1` 400, `--ink-soft` | `site.distribution` |

### 3.4 Imagery, motion, states, a11y

- Cover: `.jacket` at the widths above, `--lift-2` at rest; full `srcset` (1x + 2x, jpg + webp); `loading="eager"`, `decoding="async"`, **no** `fetchpriority="high"`. Hover/focus lift as §1.4.
- Motion: **none**. No `.reveal` on anything in the band; it is fully painted when the hero finishes or is skipped.
- Reference renders of this section built from the real tokens, fonts, cover and `homeCopy.hero` strings: `/home/claude/shots/ad2/band-1440.png`, `band-1024.png`, `band-390.png`, `band-320.png` (measured heights 591 / 591 / 723 / 759).
- Interaction: as §1.6. The two buttons are `<a>`; both are ≥ 44 px tall at every width and, at < 700, full width.
- Empty state: `site.featuredSlug` unresolvable → band renders H1 + trust line + one `.btn--secondary` to `#books`, no cover column, no pill, no hook; grid collapses to one column. (Launch data has a featured book, so this is a guard, not a design.)
- A11y: `<main id="library">` is the page's only `main`; the band is `<section aria-labelledby="hero-band-title">`; the H1 is the page's only `<h1>` (the hero contains no heading elements — verified in `hero.njk`); the cover's `<a>` has the book title as accessible name via the image `alt`.

---

## 4. Start here — sunk panel (inside `#library`, after the band)

**Purpose.** Route two reader types — new-to-the-series and devotional readers — with one card each, before the full shelves.

```
+--.panel.panel--sunk-------------------------------------------------------+
|  +----------------------------------+ +----------------------------------+ |
|  | +----+  NEW TO THE PRICE SERIES? | | +----+  NEED A DAILY WORD?       | |
|  | | 96 |  The Price of Choosing You| | | 96 |  365 Days of Grace        | |
|  | |    |  tagline (2 lines max)    | | |    |  tagline                  | |
|  | +----+  Start reading ->         | | +----+  Read a day ->            | |
|  +----------------------------------+ +----------------------------------+ |
+--------------------------------------------------------------------------+
```

| | 1440 | 1024 | 390 (320) |
|---|---|---|---|
| Panel | `.panel.panel--sunk` spanning the container; inner grid `repeat(2, minmax(0,1fr))`, `gap: var(--space-6)` | same, `gap: var(--space-5)` | one column (`≤ 700`), `gap: var(--space-5)`; panel padding uses the component's clamp |
| Card | `grid-template-columns: 96px minmax(0,1fr); gap: var(--space-4); align-items: start` | same | same (96 px cover holds at 320: 96 + 16 + 176 text) |
| Section padding | §1.2 defaults | | |

Type: eyebrow (`.eyebrow`, `--gold-deep`); H3 = `.book-card h3` role (Cormorant `--step-1` 500, linked to the book page); tagline `--step-0` 400 `--ink-soft`, clamp to 2 lines (`-webkit-line-clamp: 2` with `overflow: hidden`, and the full sentence remains the link's `title`-less text — clamping is visual only, so no information is lost from the accessibility tree; if the engineer prefers no clamp, the panel simply grows); quiet link `.btn.btn--quiet.btn--small` with the built `→`.

Imagery: `.jacket` 96 px, `small: true`, lazy, `--lift-1` (smaller shadow for a smaller object — `--lift-1` is in the token set). Whole card is **not** one link (two links per card: cover/title and the quiet CTA, both reaching the same URL; the cover link's accessible name is the title via `alt`).

Motion: `.reveal`, stagger 0 / `--dur-fast`. States: §1.6. Empty state: the block is data-driven from two slugs in `site.startHere[]` (engineer adds; defaults `the-price-of-choosing-you`, `365-days-of-grace`); one missing → single card, panel keeps one column at all widths; both missing → block absent. A11y: `<section aria-labelledby="start-here-title">` with a visually-hidden `<h2 id="start-here-title">` ("Start here" from data), cards are `<article>`; heading level inside cards is H3.

---

## 5. The Price Series shelf — `#books` + reading order — `#reading-order`

**Purpose.** The catalogue's spine: three novels in explicit order, then a strip that says the order out loud.

### 5.1 Shelf

```
----rule---------------------------------------------------------------------
THE PRICE SERIES (eyebrow: site.bookGroups[series].label)
Three novels ... (h2 at --step-3)            lede 28rem       [Series page ->]

+---------+     +---------+     +---------+
|         |     |         |     |         |      cover slot aspect 600/1213,
|  cover  |     |  cover  |     |  cover  |      jackets bottom-aligned
+---------+     +---------+     +---------+
BOOK 1 OF 3     BOOK 2 OF 3     BOOK 3 OF 3     <- one line, never wraps
Title (h3)      Title           Title
2026·Paperback  2026·Paperback  2026·Paperback
tagline ...     tagline ...     tagline ...
[READ MORE][BUY][READ MORE][BUY][READ MORE][BUY]  <- pinned to card bottom
```

| | 1440 | 1024 | 900–1023 | < 900 (390, 320) |
|---|---|---|---|---|
| Layout | `.book-grid` as 3 explicit columns `repeat(3, minmax(0,1fr))`, `gap: var(--space-7) var(--space-6)` | same | same, cover `max-width: 200px` | `.rail` (built): track with `scroll-snap-type: x mandatory`, items `clamp(150px, 42vw, 210px)` → 164 px at 390, 150 at 320; ~2.1 cards visible; `--rail-gap: var(--space-5)` |
| Cover width | `max-width: 240px` | 240 (column is 286) | 200 | rail item width |
| Section head | `.section-head.section-head--rule` + right-aligned lede (`max-width: 28rem`, `--ink-soft`) and the series link in `.section-head__actions` on the same row (`display:flex; justify-content: space-between; align-items: end`) | same | stacked | stacked; the rail's prev/next buttons sit on the row below the head, right-aligned, always visible |

Card = built `.book-card`: `.book-card__label` eyebrow **"Book N of 3"** (from `series.order` and the series count; the built label appends "· The Price Series" and wraps to two lines at 240 px — drop the suffix in this shelf, the section title already says it, so the label is one line and rows align), H3 title link, `.book-card__meta` "`year` · `format`", `.book-card__tagline` (`--ink-soft`, 0.93rem as built; clamp 3 lines), `.book-card__actions` with `.btn.btn--secondary.btn--small` "Read more" and `.btn.btn--quiet.btn--small` "Buy" (→ book page `#buy`). Exactly one bordered button per card so three cards do not read as six buttons. Card `max-width: 260px` (built) in the grid; `none` in the rail.

Imagery: `.jacket` at the widths above, `small: true`, lazy, `--lift-2`; cover slot bottom-aligned per §1.4. **Do not** normalise the jackets to one ratio and do not crop — What We Keep is simply taller. (The low-resolution What We Keep source is an art problem, §16 Q4.)

Motion: `.reveal` with a 0 / `--dur-fast` / 2 × `--dur-fast` stagger across the three cards. Rail scrolling is user-initiated only.

States: §1.6; rail buttons `←` `→` are the built `.rail__btn` (44 × 44 circles), `:disabled` at the ends, always rendered (never hover-revealed). Keyboard: track is focusable (`tabindex="0"`, built), arrow keys scroll one item.

Empty state: the shelf renders only if `books | where("shelf","price-series")` has ≥ 1 record; with 1–2 records the grid keeps 3 columns and leaves the trailing column empty (no placeholder card); if the shelf is absent the reading-order strip is also absent.

A11y: `<section id="books" aria-labelledby="books-title">`, H2; `.book-grid` is a `<ul>` of `<li>`; rail is `role="region" aria-label="The Price Series, scrollable"` with `aria-roledescription="carousel"` **not** used (no auto-advance, no slides semantics); `.rail__status` live region announces "Book N of 3" on button use (built). Each card's link text is unique ("Read more about {title}", "Buy {title}" via the built `.visually-hidden` spans — which are now correctly clipped since `252b6c3`).

### 5.2 Reading-order strip

```
READ IN THIS ORDER                                        About the series ->
 (1)          (2)          (3)
+----+       +----+       +----+
| 56 |-------| 56 |-------| 56 |        gold rule: 1px --gold, vertically at
+----+       +----+       +----+        the covers' bottom third
Choosing     Letting Go   What We Keep
```

- Sits inside the same `#books` section wrapper, `padding-top: var(--space-6)` (exception: no section gap above it, it belongs to the shelf), with `id="reading-order"` on its own `<div>` so the nav's "The Price Series" anchor and `scroll-margin-top` keep working.
- Layout ≥ 700: `display: grid; grid-template-columns: repeat(3, max-content) 1fr; align-items: end; gap: var(--space-5)`; the fourth column holds the `.btn--quiet` series link, right-aligned. The gold rule is a `::before` on each step after the first: `position:absolute; height:1px; background: var(--gold); left: -var(--space-5); width: var(--space-5); bottom: 24px`. Numbers are the built `.nav-drop__num` treatment (1.3rem circle, `--gold` border, `--gold-deep` digit) placed above each mini cover.
- < 700: strip becomes a horizontal row that fits at 320 (3 × 56 + 2 × 24 gap + numbers = 216 px); titles below covers wrap to two lines at `--step--1`; the series link drops to its own line below, left-aligned.
- Type: label eyebrow; step titles Outfit `--step--1` 500 `--ink`, linked (whole step is one `<a>` wrapping number, cover and title; min-height 44 via the cover).
- Imagery: `.jacket` 56 px, `small: true`, lazy, `--lift-1`, no hover lift (too small to rotate legibly; hover = title turns leather, focus = ring).
- Motion: none beyond colour. Empty state: absent with the shelf. A11y: `<nav aria-label="Reading order">` containing an `<ol>`; the visible numerals are `aria-hidden` (the `<ol>` provides order).

---

## 6. Devotionals & Nonfiction — `#faith` (+ "For children" row)

**Purpose.** Give the standalone titles the same dignity as the novels: same card, same shelf, one eyebrow that tells the truth about a retitled book.

```
----rule---------------------------------------------------------------------
DEVOTIONALS & NONFICTION (site.bookGroups[nonfiction].label)
h2 / lede
+---------+     +---------+     +---------+
|  cover  |     |  cover  |     |  cover  |
+---------+     +---------+     +---------+
NONFICTION      PUBLISHED AS    DEVOTIONAL         <- label line always rendered
Rooted in ...   FINDING YOURSELF 365 Days of Grace
2025·Paperback  Finding Your... 2025·Paperback
tagline         2024·Paperback  tagline
[READ MORE][BUY] ...

FOR CHILDREN (site.bookGroups[children].label)
+--.panel (paper-lift)----------------------------------------------------+
| +-----+  CHILDREN'S · 2024                                              |
| | 120 |  Finding Drake's Feather (h3)                                   |
| |     |  tagline                                                        |
| +-----+  [READ MORE] [BUY]                                              |
+-------------------------------------------------------------------------+
```

Shelf: identical to §5.1 in layout, card, rail, motion, states and a11y. Differences only:
- Eyebrow line: `book.publishedAs` present → "Published as {publishedAs}" (uppercase via CSS); otherwise the category noun from `book.category` ("Nonfiction", "Devotional") so the label line is never empty and rows align. Never "Book N of N" here.
- Order: `site.bookGroups[nonfiction]` order = `books.json` order (Rooted, Self-Worth, 365) — the same order the nav dropdown and footer use since `252b6c3`.

Children's row (`padding-top: var(--space-6)` after the shelf, inside `#faith`; exception to §1.2):
- Sub-head: eyebrow only (`site.bookGroups[children].label`), no H2 (H3 lives on the card).
- `.panel` (paper-lift, `--lift-1`, `.panel--spine` leather spine at left as built); inside, `grid-template-columns: 120px minmax(0, 1fr); gap: var(--space-5); align-items: start` at ≥ 700; at < 700 `96px minmax(0,1fr); gap: var(--space-4)` (fits 320: 96 + 16 + 176).
- Card parts are the same `.book-card__*` classes (label "Children's · 2024", H3, meta, tagline, actions); the tagline is not clamped here (one book, room to breathe).
- Cover `.jacket` 120 / 96, `small`, lazy, `--lift-2`, hover lift as §1.4.
- Empty state: no `category === "children"` records → the eyebrow and panel are absent, the shelf's bottom padding is the section's.
- A11y: the panel is an `<article aria-labelledby>`; the eyebrow is a `<p>` not a heading, so heading order stays H2 (shelf) → H3 (cards, children's card).

---

## 7. Quote band (leather panel)

**Purpose.** One sentence in Courtney's own words from a real book, as a breath between the shelves and the author.

```
+--.panel.panel--leather.panel--quote----------------------------------------+
|                                                                            |
|            "Your purpose is not lost. It's growing quietly,                |
|                    even when you cannot see it."                           |
|                                                                            |
|                      — ROOTED IN PURPOSE  (gold-warm, linked)              |
+----------------------------------------------------------------------------+
```

- Container: `.container`, then the panel; inner `max-width: var(--measure)`; `margin-inline: auto; text-align: center`. Section padding is the §1.2 default **plus** the panel's own padding: override the panel to `padding: var(--space-8) var(--space-6)` at ≥ 1024 and `var(--space-7) var(--space-5)` below.
- Type: `blockquote` Cormorant italic 500 at **`--step-3`** (override the component's clamp), `line-height: 1.3`, colour `--paper`, `max-width: 30ch` centred (built); opening/closing quotes are typographic characters in the text, no decorative glyph; `cite` Outfit `--step--1` 500, `letter-spacing: 0.2em`, uppercase, `--gold-warm`, wrapped in `<a href="/books/{bookSlug}.html">` with `border-bottom: 1px solid currentColor`, `min-height: var(--target)` via `display:inline-flex; align-items:center`.
- Background: the built `.panel--leather` gradient (`--leather → --leather-lo`), `--lift-2`. No other ornament.
- Motion: `.reveal` on the panel. States: cite link hover → `--paper` text + underline; focus → `--focus` ring (gold-warm on leather: 5.4:1).
- Empty state: `author.quotes` empty → section absent; only the first quote renders (`eleventyFeedHead(1)` as today).
- A11y: `<section aria-label="A line from Rooted in Purpose">` computed from the data (`"A line from " + q.source`); `<blockquote cite="/books/{slug}.html">`; no heading (a quote is not a landmark heading).

---

## 8–9. Author intro — `#about`

**Purpose.** The author in her own voice, with a real photo or an honest stand-in — never a stock person.

```
----rule---------------------------------------------------------------------
+--------------+   ABOUT
|              |   Courtney Thomas (h2, --step-3)
|     C T      |   p1 (bioLong[0])
|   240 x 300  |   p2 (bioLong[1], contains <strong>/<em> book names)
|   leather    |   p3 (bioLong[2])
+--------------+   More about Courtney ->
 credit line (only with a real photo)
```

| | 1440 / 1024 | < 900 | 390 |
|---|---|---|---|
| Grid | `grid-template-columns: 240px minmax(0, 1fr); gap: var(--space-7); align-items: start` | `200px 1fr; gap: var(--space-6)` | one column; monogram/headshot 160 × 200, `margin-bottom: var(--space-5)`, left-aligned with the text |
| Text | `max-width: var(--measure)` | | |

Two states of the media column (both built; the template switches on `author.headshot`):

1. **Monogram (launch state).** `<div class="monogram" aria-hidden="true">CT</div>`: 240 × 300 (4:5, `aspect-ratio: 4/5`), `background: var(--leather)` (flat, not the panel gradient), `border-radius: var(--radius-m)`, `box-shadow: var(--lift-2)`, letters Cormorant 600 at `--step-5`, `--gold-warm`, `letter-spacing: 0.02em`, centred with `display:grid; place-items:center`, and a 1-px inset keyline `inset 0 0 0 1px var(--paper-a18)` (existing alpha token). It is decorative (`aria-hidden`); the H2 beside it carries the name.
2. **Headshot (when supplied).** Same 4:5 box, `<img>` via `<picture>` with `object-fit: cover`, same radius/shadow, `loading="lazy"`, `width/height` from `author.headshot`; credit line beneath in Outfit `--step--1` `--ink-soft` from `author.headshot.credit`, rendered only when non-empty. Because both states share one 4:5 box, swapping in the photo causes no layout shift.

Type: eyebrow; H2 `--step-3`; paragraphs Outfit `--step-0` 400 `--ink-soft`, `line-height 1.6`, `margin-bottom: var(--space-4)`; `<strong>` inherits weight 500 `--ink`, `<em>` italic (the second paragraph already carries them from data); the quiet link `.btn--quiet` "More about Courtney" → `/#about` until Sprint 3's `/about.html` exists (the link is real either way — it never points nowhere).

Imagery: no covers here. Motion: `.reveal` on the two columns (0 / `--dur-fast`). States: §1.6. Empty state: `bioLong` empty → section absent (it is not); `headshot` null → monogram. A11y: `<section id="about" aria-labelledby="about-title">`, H2 = author name; no role on the monogram; if a headshot renders its `alt` comes from data (never empty and never "headshot").

---

## 10. Journal teaser — `#journal`

**Purpose.** Three latest posts, so the site reads as alive without a widget.

```
----rule---------------------------------------------------------------------
JOURNAL  Notes from the page (h2)           [READ THE JOURNAL ->]  [RSS]
+------------------+  +------------------+  +------------------+
| 3 SEP 2026       |  | 16 JUL 2026      |  | 4 JUN 2026       |
| Keeping what     |  | Grace for        |  | A garden still   |
| love leaves (h3) |  | ordinary days    |  | growing          |
| description ...  |  | description ...  |  | description ...  |
| [Drake's][365]   |  | [365][Self-Worth]|  | [Rooted][Self-W] |
+------------------+  +------------------+  +------------------+
```

| | 1440 / 1024 | ≤ 700 |
|---|---|---|
| Grid | `repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6)` → 3 columns at both | one column, `gap: var(--space-5)` |
| Head | `.section-head--rule` with `.section-head__actions` on the right: `.btn.btn--secondary.btn--small` "Read the Journal" + `.btn.btn--quiet.btn--small` "RSS" (`href="/blog/rss.xml"`, `type="application/rss+xml"`) | actions wrap under the lede |

Card (`<article class="post-card">`): `padding: var(--space-5)`, `background: var(--paper-lift)`, `border: 1px solid var(--ink-a08)`, `border-radius: var(--radius-s) var(--radius-m) var(--radius-m) var(--radius-s)`, `box-shadow: var(--lift-1)` (= the built `.panel` recipe; use `.panel` directly), flex column with the chip row `margin-top: auto` so chips align across cards.
- Date `<time>` Outfit `--step--1` 500, `--gold-deep`, uppercase tracked (eyebrow role), format from the existing date filter.
- Title `<h3>` Cormorant `--step-2` 500, `--ink`, linked (hover leather, focus ring), `margin: var(--space-2) 0`.
- Description `post.data.description` Outfit `--step-0` 400 `--ink-soft`, clamp 3 lines.
- Chips: the built `.chips` list, max **2** per card (first two of `relatedBooks`, resolved against `books.json` for the title and link), each `.chips a` (44 px min-height, paper-lift, `--line` border); no `↗` (internal links, so no `data-track`).
- Hover on the card: none (the card is not a link; title and chips are). Card shadow does not change on hover.

Motion: `.reveal`, stagger 0 / `--dur-fast` / 2 × `--dur-fast`. Empty state: `collections.postsNewest` empty → section absent; 1–2 posts → grid fills what it has (auto-fit), no placeholders; a post with no `relatedBooks` → chip row absent and the card is simply shorter (bottom-aligned chips only apply when present). A11y: `<section id="journal" aria-labelledby="journal-title">`; cards are `<article>` with H3; `<time datetime>`; chip links are distinct by book title.

---

## 11. Newsletter — `#newsletter` (sunk panel)

**Purpose.** The one ask, inline, with a promise Courtney can keep. No modal, no slide-in, no exit intent.

```
+--.panel.panel--sunk--------------------------------------------------------+
|  STAY CLOSE                                                                |
|  Reader notes (h2)                                                         |
|  promise (site.newsletter.lede, 65ch)                                      |
|  Name                      Email                         (labels, visible) |
|  [                    ]    [                        ]  [   SUBSCRIBE   ]   |
|  privacy note (--step--1)                                                  |
+----------------------------------------------------------------------------+
```

| | ≥ 700 | < 700 |
|---|---|---|
| Form row | `display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.4fr) auto; gap: var(--space-3); align-items: end`; the button's bottom edge aligns with the inputs' | one column; inputs and button full width, `gap: var(--space-3)` |
| Field | `<label>` visible above the input: Outfit `--step--1` 500 `--ink-soft`, `margin-bottom: var(--space-1)`; input `min-height: var(--target)`, `padding: 0 var(--space-4)`, `background: var(--paper-lift)`, `border: 1px solid var(--line-firm)`, `border-radius: var(--radius-s)`, text `--step-0` `--ink`, placeholder `--ink-soft` (7.7:1 on paper-lift) | same |
| Button | `.btn.btn--primary` (leather — the Sprint 1 review's "one primary" decision; the ink `button[type=submit]` style in `styles.css` is no longer applied here) | `.btn--block` |
| Panel | `.panel--sunk`; padding `var(--space-7) var(--space-6)` ≥ 1024, component default below | |

Type: eyebrow; H2 `--step-3`; promise `--step-1` 300 `--ink-soft` (lede role), `max-width: var(--measure)`; privacy note Outfit `--step--1` 400 `--ink-soft`, `margin-top: var(--space-3)`, text from `site.newsletter.privacy` (slot; e.g. a sentence that links to `/privacy.html`); lead-magnet line, same style, only when `site.newsletter.leadMagnet` is set.

States: input focus → `border-color: var(--gold-warm)` + `--focus` ring; `:user-invalid` → `border-color: var(--leather)` (no icon, no red); button states §1.6. Motion: none (forms never fade). Empty state: n/a (the form always renders). A11y: `<section id="newsletter" aria-labelledby="newsletter-title">`; labels are real `<label for>` (visible); `autocomplete="name"` / `"email"`; the honeypot `<p hidden>` stays; no `aria-required` beyond the native `required`. Footer mini-form keeps its built compact style (email only, gold-warm button on leather) — unchanged.

Markup note (engineer decision §16 Q6): the visible label means removing `.visually-hidden` from the existing `<label>`, and the name field is a new `<label>Name <input type="text" name="name" autocomplete="name"></label>` before email. Netlify attributes are untouched.

---

## 12. Contact — `#contact`

**Purpose.** A plain, warm way to write to Courtney: book clubs, readings, notes.

```
----rule---------------------------------------------------------------------
CONTACT                          |  Name   [                              ]
Write to Courtney (h2)           |  Email  [                              ]
lede (65ch)                      |  Note   [                              ]
                                 |         [                              ]
                                 |  [ SEND ]
                                 |  (form-note: paper-lift strip, gold rule)
```

| | ≥ 1024 | < 1024 |
|---|---|---|
| Grid | `grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--space-8)` (lede left, form right) | one column; lede then form; `gap: var(--space-5)` |
| Form | `display: grid; gap: var(--space-4)`; every field full width of its column; inputs `min-height: var(--target)`; textarea `min-height: 8rem` (built), `resize: vertical` | same |
| Button | `.btn.btn--primary`, left-aligned, `min-width: 10rem` | `.btn--block` |

Field styling = §11 (labels visible — already the case in the built markup, `<label>Name <input>` — restyle the label as a block with the input beneath: `display: grid; gap: var(--space-1)`; label text Outfit `--step--1` 500 `--ink-soft`).

Form note (`#form-note`, `opening.js` writes it and toggles `is-sent`): `margin-top: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--paper-lift); border-left: 3px solid var(--gold-warm); color: var(--ink); font-size: var(--step-0)`; error (no `.is-sent`) → `border-left-color: var(--leather)`. This replaces the out-of-palette `#1e3a2f` green on `.form-note.is-sent` in `styles.css` (restyle the class; the JS is untouched). The note is `aria-live="polite"` (built).

Motion: none. Empty state: n/a. A11y: `<section id="contact" aria-labelledby="contact-title">`; H2; labels wrap their inputs (built); `required` on all three; focus ring on every control; the Netlify honeypot paragraph stays `hidden`.

---

## 13. Footer (as built in Sprint 1)

`s1-fixed-footer-1440.png` is the reference: four-column leather sitemap, gold-warm column heads, `--paper-a86` links, compact email form, legal row. Nothing new is designed. Spacing corrections carried from the AD review, all landed in `252b6c3` and re-checked here:
- Footer links and legal links are `min-height: var(--target)` (was 40 px).
- Books column order derives from `site.bookGroups` (matches the dropdown).
- Mini-form no longer wraps at 1440 (`flex-wrap: nowrap`).
- One remaining correction for this sprint: the footer's `padding-top: 3.4rem` should become `var(--space-8)` (72 px) and the legal row's `margin-top: 2.6rem` → `var(--space-7)`, so the footer's rhythm is on the same scale as the sections above it (visual change ≤ 6 px; no layout change). Book-page-only `padding-bottom` for the buy bar stays.
- Contact section `padding-bottom` is `--space-7`; the footer follows with no extra gap (the leather edge is the separator).

---

## 14. Data slots the templates read (no copy in this spec)

| Section | Copy keys (`homeCopy.json`) | Facts (other files) |
|---|---|---|
| §3 Decision band | `hero.eyebrow`, `hero.positioning`, `hero.statusPill`, `hero.hook`, `hero.ctaPrimary`, `hero.ctaPrimaryAria`, `hero.ctaSecondary` | `hero.featuredSlug` → `books[]` for cover/alt/link; `site.distribution` |
| §4 Start here | `startHere.eyebrow`, `heading` (visually hidden per §4 — or shown if the PM prefers; the panel has room for it at all widths), `lede` (rendered above the cards at `--step-0` `--ink-soft` if present), `cards[].eyebrow/title/body/cta/slug` | `books[]` covers |
| §5 Series shelf | `series.eyebrow`, `heading`, `lede`, `orderLabel`, `orderNote` (rendered under the strip at `--step--1` `--ink-soft`, max `--measure`), `seriesLink` | `books` where `shelf == price-series`; `series.order`, `year`, `format`, `tagline` |
| §6 Standalone + children | `standalone.eyebrow`, `heading`, `lede`, `childrenEyebrow`, `childrenLede` (under the eyebrow at `--step-0` `--ink-soft`) | `books` where `shelf == faith-home`, split on `category`; `publishedAs` |
| §7 Quote | `quote.eyebrow` (rendered as the panel eyebrow in `--gold-warm` above the blockquote) | `author.quotes[0].text/source/bookSlug` |
| §9 About | `about.eyebrow`, `heading`, `moreLink` | `author.bioLong[]`, `author.headshot` |
| §10 Journal | `journal.eyebrow`, `heading`, `lede`, `cta`, `rss`, `relatedLabel` (visually-hidden label on each chip row) | `collections.postsNewest` (3), `books[]` for chip titles |
| §11 Newsletter | `newsletter.eyebrow`, `heading`, `promise`, `nameLabel`, `emailLabel`, `button`, `privacyNote` (HTML), `leadMagnetLine` | `site.newsletter.formName`; `site.newsletter.leadMagnet` (null → line hidden) |
| §12 Contact | `contact.eyebrow`, `heading`, `lede`, `nameLabel`, `emailLabel`, `messageLabel`, `button`, `successNote`, `errorNote` (the JS in `opening.js` writes the note text today; the engineer decides whether to pass these strings through `data-` attributes) | `site.contact.formName` |
| §13 Footer | `footer.*` | as built |
| Rails / nav | `a11y.railPrev`, `railNext`, `skipLink` | |

---

## 15. Contrast table (every text/background pairing on the page)

Ratios computed from the token hex values (WCAG 2.x relative luminance). "Small" = under 24 px regular / 18.7 px bold; every pair used for small text is ≥ 4.5:1, every pair used for large text or UI borders ≥ 3:1.

| Foreground | Background | Ratio | Used for | AA |
|---|---|---:|---|---|
| `--ink` | `--paper` | 15.6 | body, H1/H2/H3, card titles | pass |
| `--ink` | `--paper-sunk` | 14.4 | start-here / newsletter text on sunk panel | pass |
| `--ink` | `--paper-lift` | 16.8 | post-card titles, input text, children's card | pass |
| `--ink-soft` | `--paper` | 7.1 | ledes, meta, bio, trust line, privacy note | pass |
| `--ink-soft` | `--paper-sunk` | 6.6 | labels and promise on sunk panels | pass |
| `--ink-soft` | `--paper-lift` | 7.7 | placeholders, post descriptions, chip text | pass |
| `--gold-deep` | `--paper` | 5.8 | eyebrows, dates, "Book N of 3", pill--outline text | pass |
| `--gold-deep` | `--paper-sunk` | 5.4 | eyebrows on sunk panels | pass |
| `--gold-deep` | `--paper-lift` | 6.3 | eyebrows on lift panels / cards | pass |
| `--leather` | `--paper` | 11.0 | secondary/quiet button text, title hover | pass |
| `--leather` | `--paper-lift` | 11.9 | secondary hover fill text | pass |
| `--paper` | `--leather` | 11.0 | primary button text, quote text | pass |
| `--paper` | `--leather-lo` | 13.5 | primary hover, quote panel lower gradient | pass |
| `--gold-warm` | `--leather` | 5.4 | quote cite, monogram letters, footer heads | pass (large + small) |
| `--gold-warm` | `--leather-lo` | 6.7 | same on the gradient's dark end | pass |
| `--ink` | `--gold-warm` | 7.7 | footer Subscribe button text | pass |
| `--paper-a86` on leather | `--leather` | 8.5 | footer links | pass |
| `--paper-a70` on leather-lo | `--leather-lo` | 7.2 | footer legal text | pass |
| `--gold` (border) | `--paper` | 4.2 | secondary button border, pill border, reading-order rule — **non-text, needs 3:1** | pass |
| `--gold` (text) | `--paper` | 4.2 | **not approved for text**; use `--gold-deep` | — |
| `--ink-faint` (text) | `--paper` | 3.7 | **not approved for text**; only the `↗` glyph beside chip text (decorative) | — |
| `--gold-warm` (text) | `--paper` | 2.0 | **never** on paper; leather backgrounds only | — |
| `--focus` ring `--gold-warm` | `--paper` | 2.0 vs paper, 5.4 vs leather | the ring is 3 px with `outline-offset: 2px` and sits against both the control's own edge (leather/ink border) and the page; against paper alone it fails 3:1 — keep the built 2-px `outline-offset` so the ring is adjacent to the control's dark border, which is what makes it visible; on leather panels it passes outright | as built |

---

## 16. Sprint 1 AD review — resolution of every SHOULD FIX

| # | Item | Resolution |
|---|---|---|
| 1 | Hero evidence from an intermediate build | Process: `check-hero.mjs` captures last in the Sprint 2 build; re-verified in `252b6c3` ("check-hero OK"). Spec §0.1. |
| 2 | Header reflow when Skip hides | Fixed in `252b6c3` (`.nav-skip[hidden]` keeps its slot). The band under the hero therefore has a stable top edge. |
| 3 | Mobile Buy bar over footer / duplicate CTA | Fixed in `252b6c3` (`buy-bar.js`); book pages only — no bar on the home page (§3 has one primary, no sticky bar). |
| 4 | Synopsis measure ~90 ch | Fixed in `252b6c3` (34rem). Home: every text block is `max-width: var(--measure)` (§1.1). |
| 5 | Cover column too light on book page | Fixed in `252b6c3` (340 px ≥ 1200). Home band uses 300 px at ≥ 1024 (§3.2) — proportionate to a band, not a page. |
| 6 | Ragged cards | Fixed in `252b6c3` (flex column, `margin-top:auto`, reserved label line). Spec adds: series labels are one line ("Book N of 3" only, §5.1), category nouns fill the line on standalone cards (§6), covers bottom-aligned on the 600/1213 slot (§1.4). |
| 7 | Two primary button styles | Home forms use `.btn--primary` leather (§11, §12); the ink `button[type=submit]` rule is not applied on the home page. |
| 8 | Nav duplicate `/#books` | Fixed in `252b6c3` ("The Price Series" → `/#reading-order`); §5.2 guarantees that anchor lands on the strip with the header offset. |
| 9 | Footer book order | Fixed in `252b6c3` (derived from `site.bookGroups`); §6 uses the same order for the shelf. |
| 10 | Eyebrow gold 4.2:1 | Fixed in `252b6c3`; §15 table forbids `--gold` for text anywhere on the home page. |
| 11 | 40-px targets | Fixed in `252b6c3`; §1.6 and every section state `--target`. |
| 12 | Styleguide states / scroll-margin | Fixed in `252b6c3`. New components from this spec (`.hero-band`, `.start-here`, `.reading-order`, `.post-card`, `.monogram`, `.form-note` variants, `.reveal`) must be added to `/styleguide.html` with forced-state rows. |
| 13 | Placeholder-only newsletter label | §11: visible labels above both fields; footer mini-form keeps its compact form (label remains visually hidden there — it is a secondary, single-field repeat). |
| Backlog | Disabled tint, alpha tokens, drawer button, cover art, mini-form wrap | First four fixed in `252b6c3`; cover art is Q4 below. |

---

## 17. What publisher-grade looks like here

The page should feel like a Picoult or Hannah site with a smaller list: one spine you can scan in five seconds — a book, a sentence, a button — and then shelves that never make the reader guess what order to read in. Rivers' sites give fiction and nonfiction equal dignity, so the devotionals get the same card, the same shelf head and the same button pair as the novels, not a smaller "also by" row; the children's book gets a gentler panel but the same components. Martin's scroll cue is the model for how the hero hands off: the cue points at a real destination (the decision band) rather than at more hero. Warmth comes from Courtney's own sentences (the quote, the bio) and from the jackets' shadows on paper, not from decoration. What I am deliberately not doing: no star rows, badge rows or press strips (none exist, and empty trust is worse than none), no testimonial carousel, no auto-advancing rail, no popup or sticky bar on the home page, no stock photograph standing in for the author, no second display face, no colour outside paper/leather/gold, and no cropping of jackets to make the shelf tidy at the cost of the books looking like themselves.

---

## 18. Open questions for Brian (not embedded in the spec)

1. **Featured title.** The band defaults to *The Price of Choosing You* with status "Paperback · 2026". Confirm, or name an upcoming release with a real status line and its links.
2. **Author photo.** Is there a rights-cleared photo with a photographer credit? If yes, supply file + credit + `alt`; if no, the monogram ships (§9) and the site is honest about it.
3. **"Above the fold" on phones.** The hero is 100dvh by design, so the decision band is one swipe (or one tap on SCROLL) below it on every visit (§3.1). Accept this, or approve a hero change in a later sprint — I recommend accepting it.
4. **What We Keep jacket.** The 600 × 1213 source is visibly soft and a different ratio from the other two novels (`s1-fixed-styleguide-cards-1440.png`). A print-resolution file from the designer would fix both; until then it ships as is, uncropped.
5. **Newsletter promise + privacy sentence.** Approve the promise copy (`site.newsletter.lede`) and supply the one-line privacy note (`site.newsletter.privacy`); confirm whether a lead magnet exists (`leadMagnet` stays null until it does).
6. **Newsletter name field.** Adding "Name" to the form changes the Netlify form's field set (a new submission column). Confirm you want name + email; otherwise §11 ships email only with the visible label.
7. **Lead-magnet line.** `homeCopy.newsletter.leadMagnetLine` is written but renders only when `site.newsletter.leadMagnet` is set; confirm whether a real sample will be sent before it is switched on.
8. **Series page link.** "Explore the series" and "About the series" point to `#reading-order` until `/books/the-price-series.html` exists (Sprint 3). Confirm that page is still planned.
