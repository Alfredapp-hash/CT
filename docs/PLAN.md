# Courtney Thomas — Publisher-Grade Author Site: Delivery Plan

Project manager's plan for Sprints 1 and 2, with the design principles every specialist follows, what is deferred to Sprints 3–5, and the decisions only Brian can make.

Repo: `/home/claude/ct` · Stack: Eleventy 3.1.6 (Node 22) → static `_site/` on Netlify · Palette and type are fixed (tokens at the top of `css/styles.css`).

---

## 0. Non-negotiables (apply to every sprint)

1. The 3D "book opens and writes itself" hero (`index.html` §`.bk-hero`, `css/hero.css`, `js/opening.js`, `media/book/`) is preserved **pixel-for-pixel in behavior**. Its CSS/JS are never rewritten; markup is copied verbatim into a partial. The inline `bk-pre` script stays inline, in the same position (after `styles.css` + `hero.css`, before the favicon). `opening.js` stays a non-deferred script at the end of `<body>` on the home page only.
2. Every public URL listed in the architecture scout's inventory keeps returning 200 with the same content type (all `.html` permalinks, `/blog/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/css/*`, `/js/*`, `/media/**`, `/admin`, `/thank-you`, `/api/analytics/*`).
3. Netlify Forms markup (`name`, `method="POST"`, `action="/thank-you"`, `data-netlify="true"`, `netlify-honeypot="bot-field"`, hidden `form-name` input) is emitted unchanged for both `newsletter` and `notes` forms.
4. No invented facts: no praise, awards, press, star ratings, bestseller claims, author photos, or social links that Brian has not supplied. Empty data arrays render nothing (no "TODO" text leaks into production HTML).
5. Quality gates on every sprint: Lighthouse ≥ 95 in all four categories, axe 0 serious/critical, WCAG 2.1 AA, `prefers-reduced-motion` honored, works at 320px with no horizontal scroll, no stock photos of people.
6. Commit after each meaningful step with a clear message.

---

## 1. Design principles (distilled from the bestseller + faith-market audits)

1. **One hero, one book, one decision.** The hero's job is the featured title: cover (via the 3D book), a one-sentence hook, a status pill ("Available now" / "Coming <Month Year>"), one primary "Buy" CTA and one secondary "Explore the series" CTA. Nothing else competes above the fold, and on reduced-motion or slow mobile the cover + CTA are visible immediately.
2. **Books are one click away, everywhere.** "Books" is a first-class nav item with a dropdown grouped **The Price Series (Book 1–3) · Devotionals & Nonfiction · Children's**. Fiction and devotionals get equal dignity (the Francine Rivers pattern).
3. **Series order is explicit, never inferred.** "Book 1 of 3" labels on cards, a reading-order strip, and a "Start here" block ("New to the Price Series? Start with *The Price of Choosing You*. Need a daily word? *365 Days of Grace*.").
4. **Every book page follows the same spine.** Cover → status/pub details (format, year, ISBN, pages when known) → tagline → synopsis → format-grouped retailer buttons → excerpt → discussion-guide slot → related titles ("Next in series" / "Read alongside") → newsletter. Data-driven from `books.json`, so nothing drifts.
5. **Retailers are plural, format-grouped, and identical on every book.** Paperback/Hardcover · eBook · Audiobook rows, fixed retailer order (Amazon, Barnes & Noble, Bookshop.org, ChristianBook, Walmart, Books-A-Million; audio/e-book retailers only when the format exists). Never a lone Amazon button; never an unlabeled mixed list.
6. **Newsletter is inline, twice, with a promise Courtney can keep.** Once near the hero/"Start here", once in the footer. Name + email only, Netlify Forms, no popups/exit-intent/slide-ins. A lead-magnet slot exists but renders only when Brian supplies real content.
7. **Warmth comes from voice, not decoration.** First-person specifics in About and the home teaser; one credited real author photo (or none); no scripts/florals/stock women-with-coffee. Visual richness comes from covers and typography inside the fixed paper/burgundy/gold palette.
8. **Trust signals are real or absent.** Publication years, series count, format availability, distribution line, credits (photo/design), privacy, accessibility statement, affiliate-disclosure slot. Praise/awards/press blocks render only when populated with attributed sources.
9. **Restraint in chrome: 4–6 top-level nav items**, rich footer sitemap (Books / About / Connect groups), generous whitespace, one serif display face, one accent. No third-party embeds (social feeds, players, carts) above the fold — link out instead.
10. **Mobile-first for a phone-heavy readership.** Hamburger nav, covers in a swipeable horizontal rail with tap/keyboard controls, full-width stacked buy buttons with 44px targets, nothing hover-only, no autoplay video, no auto-rotating carousels.

---

## 2. Sprint 1 — Foundation

**Goal:** Migrate the static site to Eleventy 3 with zero URL breakage and a byte-identical hero, then establish the design system (tokens, type scale, component library, global nav with mobile menu, footer, book-detail layout) that Sprint 2 builds on. Output must be visually indistinguishable from today except where a component is intentionally introduced.

### Team for this sprint
- PM (this plan, sprint review, acceptance sign-off)
- Build engineer (Eleventy migration, data model, URL gate)
- Design-systems engineer (tokens, components, nav/footer)
- QA engineer (screenshots, Lighthouse, axe, URL diff)
- Prompt/spec writer (writes the per-task briefs for the specialists from this document; keeps facts pinned to `books.json`/`site.json`)

### Ordered tasks

1. **Unlock and scaffold.** `chmod -R u+w` the repo (files are `r--r--r--`). Add `.nvmrc` (22), `.gitignore` entries `_site/`, `.cache/`, and `**/node_modules/**`. `npm i -D @11ty/eleventy@^3.1.6 @11ty/eleventy-plugin-rss@^3.0.0`. Add scripts `build: eleventy`, `start: eleventy --serve`, keep `dev: netlify dev`. Commit.
2. **Write `eleventy.config.js`** (ESM): input `src`, output `_site`, includes `_includes`, data `_data`; template formats `njk, md, html, 11ty.js`; passthrough copy for `src/css`, `src/js`, `src/media`, `src/admin`, `src/robots.txt`; `feedPlugin` with `outputPath: "/blog/rss.xml"`; `posts` collection sorted by date; `readableDate` and `bookBySlug` filters; server port 8080. HTML minification stays **off**. Commit.
3. **Move source under `src/`** (`git mv`) with Eleventy directory data files fixing permalinks: `src/books/books.11tydata.js` → `/books/{{ page.fileSlug }}.html`, `src/blog/posts/posts.11tydata.js` → `/blog/posts/{{ page.fileSlug }}.html`, explicit permalinks for `/index.html`, `/blog/index.html`, `/privacy.html`, `/thank-you.html`, `/404.html`, `/sitemap.xml`. Delete the hand-written `rss.xml` and `sitemap.xml` sources (both become generated). Commit.
4. **Create the data layer** — `src/_data/site.json` (name, tagline, url, description, distribution line, unified `fontsHref`, favicon data-URI, `assetVersion`, `nav[]`, `footerNav[]`, `retailerTemplates[]`, `social{}` with null slots, form names), `src/_data/books.json` (7 records exactly per the scout's schema; every value transcribed from the existing `books/*.html`; `pages`, `reviews`, `awards`, `press`, `audiobook`, `ebookIsbn`, `discussionGuide`, `praise` as empty/null "TODO: Brian to supply" slots), `src/_data/author.json` (bio paragraphs verbatim from `#about`, `headshot: null`, `quotes[]`). Add a `scripts/validate-data.mjs` that asserts every ISBN is 13 digits, every cover file exists at 1x/2x jpg+webp, and every `slug` is unique. Commit.
5. **Build layouts and partials.** `layouts/base.njk` (shared head with canonical/OG/twitter/RSS alternate, skip link, nav, content, footer, analytics script except when `noAnalytics`), `layouts/home.njk` (extends base; adds cover preload, `hero.css`, the **verbatim** inline `bk-pre` script in the original order, and `opening.js` non-deferred at body end), `layouts/book.njk`, `layouts/post.njk`, `layouts/page.njk`; partials `hero.njk` (index.html lines 38–82 copied byte-for-byte), `nav.njk`, `footer.njk` (Privacy link on every page), `cover.njk` macro, `book-card.njk`, `shelf.njk`, `retailers.njk`, `newsletter-form.njk`, `contact-form.njk`, `jsonld-book.njk`. Nav/footer hrefs become root-absolute. Convert blog posts to `.md`/`.html` with front matter (`title`, `date`, `description`, `books[]`). Build `index.njk` by composing the partials so the home page renders identically to today. Commit.
6. **Book pages via pagination** — one `src/books/books.njk` template paginating `books.json` with permalink `/books/{{ book.slug }}.html`; renders JSON-LD, cover, eyebrow, meta line, blurb, excerpt, retailers from `retailerTemplates`, and "Also by" computed from the collection. Remove the 7 hand-written book HTML files once the diff is clean. Commit.
7. **Netlify wiring.** `netlify.toml`: `publish = "_site"`, `command = "npm run build"`, `NODE_VERSION = "22"`, `[dev]` block, keep `/thank-you` and `/admin` rewrites, keep `/admin/*` noindex/no-store and `/media/*` immutable headers, add extensionless convenience 200 rewrites (`/books/:slug`, `/blog/posts/:slug`, `/privacy`) — additions only. Note in `docs/DEPLOY.md` that Netlify "Pretty URLs" must be OFF. Commit.
8. **URL preservation gate.** `scripts/check-urls.mjs`: builds, serves `_site` on 8080, curls every URL in the scout's inventory (pages, anchors' host pages, feed, sitemap, css/js/media, admin, thank-you) and fails on any non-200 or wrong content-type; plus `diff <(git ls-files at c0027e3 | filtered) <(find _site -type f)` asserting no file is missing. Wire as `npm run verify`. Commit.
9. **Hero byte-diff + motion screenshots.** Script extracts `<section class="bk-hero" …>…</section>` from the original `index.html` (commit `c0027e3`) and from `_site/index.html` and asserts they are identical. Capture before/after screenshots at 1440×900 and 390×844 at t≈0.8s, t≈2.4s and end state, plus a reduced-motion run; QA reviews them with the Read tool. Commit the diff script; save PNGs under `/home/claude/shots/sprint1/`.
10. **Design tokens and type scale.** Extend the existing `:root` block (do not rename existing tokens): spacing scale `--space-1…--space-9`, radii `--radius-sm/md/pill`, focus ring `--focus`, container widths `--measure`, `--wide`, motion tokens `--dur-1/2/3`, and a documented usage of the existing `--step-*` scale (h1 = step-5 … small = step--1). Reduced-motion media query zeroes durations for new components only (hero.css untouched). Commit.
11. **Component library** in `src/css/components.css` (linked after `styles.css`, before `hero.css`): buttons (`.btn`, `.btn--primary` leather, `.btn--secondary` outline gold, `.btn--quiet`, 44px min target, visible focus), retailer chips (`.retailer-group` with format heading + `.chip` list; fixed order from `site.json`), book card (`.card` with cover macro, series label "Book 1 of 3", year, one-line tagline, "Read more" + "Buy"), panel (`.panel`, `.panel--sunk`, `.panel--leather` for quote bands), section header (`.section-head` eyebrow + h2 + lede), cover rail (`.rail` horizontal scroll-snap with scroll buttons and keyboard support), status pill (`.pill`). A `/styleguide.html` page (excluded from sitemap, `noindex`) renders every component in every state for review. Commit.
12. **Global nav with mobile menu.** `nav.njk`: brand, 5 items (Books ▾, The Price Series, About, Journal, Contact) + Newsletter button; "Books" dropdown grouped Series / Devotionals & Nonfiction / Children's, populated from `books.json`; `<button aria-expanded>` hamburger at ≤ 900px opening a full-height panel; Escape closes; focus trap; `aria-current="page"`; works without JS (menu content is in DOM, hidden via CSS toggled by the button; a `<details>` fallback is acceptable). New `src/js/nav.js` (deferred) — `opening.js` untouched. Commit.
13. **Footer.** Three link groups (Books: all 7 titles; About: About, Journal, Press [placeholder link only when page exists], Contact; Connect: newsletter mini-form, socials rendered only when `site.social` values are non-null, RSS), then a legal row: © year, Privacy, Accessibility statement link (page in Sprint 3), affiliate-disclosure slot (renders only when `site.affiliateDisclosure` set), site-credit line. Commit.
14. **Book-detail layout** (`layouts/book.njk`) implementing the spine: two-column at ≥ 1024 (sticky cover column), stacked at 390; sections: header (eyebrow/series label, h1, tagline, pill), pub details list, format-grouped retailers, synopsis, excerpt blockquote, discussion-guide slot (renders only when `book.discussionGuide`), praise slot (only when `book.praise.length`), related titles (series siblings first, then "Read alongside" companions from `book.related[]`), newsletter partial; sticky bottom "Buy" bar at < 900px. JSON-LD `Book` + `BreadcrumbList`. Content still equals today's data — visual upgrade only. Commit.
15. **QA pass and sprint review.** Run `npm run verify`, Lighthouse on `/`, `/books/the-price-of-choosing-you.html`, `/blog/`; axe on the same; screenshots at 1440/1024/390 of home, a book page, blog index, styleguide, mobile menu open. Write `docs/SPRINT-1-REVIEW.md` with metrics and screenshot paths, listing the two intentional visual changes (unified font weights, Privacy link on every page). Final commit.

### Acceptance criteria (all must pass)

- `npm run build` succeeds on Node 22 with zero Eleventy warnings; `_site/` contains every file from the original repo listing (minus source-only files) — `scripts/check-urls.mjs` exits 0 with every inventoried URL returning 200 and correct content-type.
- The rendered `<section class="bk-hero">` in `_site/index.html` is byte-identical to commit `c0027e3`; `hero.css`, `opening.js`, `media/book/*` are byte-identical; head order `styles.css → hero.css → inline bk-pre script → favicon` preserved; `opening.js` is the last non-deferred script on the home page only.
- Hero screenshots (1440 and 390; t≈0.8s, 2.4s, end; plus reduced-motion) match the pre-migration captures on visual review; sessionStorage skip path (`ct-hero-opened`) still works on second load.
- Both Netlify forms appear in `_site/index.html` with identical attributes to the original (asserted by a grep in `verify`); `/thank-you` rewrite kept.
- `/blog/rss.xml` is valid RSS 2.0 with 5 items, newest first, same guids as before; `/sitemap.xml` lists the same 14 URLs (admin/404/thank-you excluded).
- Lighthouse ≥ 95 (performance, accessibility, best-practices, SEO) on `/`, one book page and `/blog/` at mobile preset; axe reports 0 serious/critical on the same three pages plus `/styleguide.html`.
- Mobile menu: opens/closes via button and Escape, `aria-expanded` toggles, focus returns to the button, fully usable by keyboard and screen reader, and the page is navigable with JS disabled.
- All components pass WCAG AA contrast on paper (`#f6edd7`) and leather (`#5a1d27`) backgrounds; every interactive target ≥ 44×44 px; visible focus indicators on every control.
- No horizontal scroll at 320px on any page; `prefers-reduced-motion` disables rail/menu transitions (hero already handles itself).
- No fabricated content: grep of `_site/` for `TODO`, `lorem`, `★`, "bestselling", "award" returns nothing; every empty data slot renders no markup.
- Screenshots at 1440/1024/390 for home, book page, blog index, styleguide and open mobile menu saved under `/home/claude/shots/sprint1/` and referenced in `docs/SPRINT-1-REVIEW.md`.

---

## 3. Sprint 2 — Home page to publisher grade

**Goal:** Turn `index.njk` into a publisher-grade home page that ends the hero with a decision, orients readers across a mixed catalogue (series + devotionals + children's), and captures newsletter interest — while the hero stays untouched and every Sprint 1 gate keeps passing. Ship complete structured data and Open Graph for the home page.

### Ordered tasks

1. **Featured-title data.** Add `featured` config to `site.json` (`featuredSlug`, `status` pill text, `hook` sentence, `primaryCta`, `secondaryCta`) defaulting to `the-price-of-choosing-you` with hook derived from its existing tagline, pending Brian's decision. Templates read only from data so the hero can never advertise a stale status. Commit.
2. **Hero decision band (below the preserved hero, not inside it).** Immediately after `section.bk-hero`, a `.hero-band` panel: author name + one-line positioning statement (the existing tagline "Stories for the chapters we survive." — no invented credentials), status pill, featured cover (cover macro, `fetchpriority` left to the hero's preload), hook sentence, primary "Buy the book" (anchors to the featured book's retailer section) and secondary "Explore the Price Series". The band is visible without scrolling on 390 when the hero is skipped (reduced-motion / return visit) — verify with screenshots. The `#enter` scroll cue and `#library` target remain. Commit.
3. **"Start here" block.** Two cards: "New to the Price Series? Start with Book 1" (cover, 1-line, "Start reading" CTA to the book page) and "Need a daily word? 365 Days of Grace" (cover, 1-line, CTA). Copy is limited to the book taglines already in `books.json`. Commit.
4. **Series shelf with reading order.** `#books` section: section header ("The Price Series"), three cards labelled "Book 1 of 3 / 2 of 3 / 3 of 3" with year, a reading-order strip (numbered covers connected by a rule, "Read in this order"), and a "Series page" link (page arrives in Sprint 3; until then the link anchors to `#books`). Keep ids `#books` and `#reading-order`. Rail layout at < 900px. Commit.
5. **Standalone shelf.** `#faith` section: header ("Devotionals & Nonfiction"), cards for Rooted in Purpose, Finding Your Self-Worth ("Published as Finding Yourself" kept as eyebrow), 365 Days of Grace; then a smaller "For children" row with Finding Drake's Feather. Each card: cover, eyebrow, title, year/format, tagline, Read more + Buy. Commit.
6. **Quote band.** Re-home the existing "Your purpose is not lost…" quote from `author.json` into `.panel--leather` with attributed source (book title, linked). Only quotes in the data file render. Commit.
7. **Author intro.** `#about`: existing three bio paragraphs verbatim, first-person; headshot slot renders a real photo only when `author.headshot` is set (otherwise a typographic monogram panel — never a stock image); "More about Courtney" link (About page in Sprint 3; until then anchors to `#about`). Commit.
8. **Journal teaser.** `#journal`: latest 3 posts from `collections.posts` (newest first) with date, title, description, related-book chips; "Read the Journal" + RSS link. Commit.
9. **Newsletter.** `#newsletter`: inline `newsletter` Netlify form (name + email), promise copy limited to what exists ("Release news and first-chapter previews, a few times a year. No spam."), lead-magnet line renders only when `site.newsletter.leadMagnet` is set. Footer mini-form stays. No modal. Commit.
10. **Contact.** `#contact`: existing `notes` Netlify form markup unchanged (opening.js still owns its submit handler); add short reader-friendly intro. Commit.
11. **Structured data + OG.** Home `<head>`: `Person` (name, url, sameAs only from non-null socials) + `WebSite` JSON-LD; `ItemList` of the 7 books; `og:type=website`, `og:image` = featured cover `@2x.jpg` absolute URL with `og:image:width/height/alt`, `twitter:card=summary_large_image`, canonical, RSS alternate. Book pages already carry `Book` JSON-LD from Sprint 1; add `BreadcrumbList` on all non-home pages. Validate with `npx -y schema-dts` style checks or the Google Rich Results test where network permits; record results. Commit.
12. **Performance polish needed to hold ≥ 95.** Self-host Cormorant Garamond and Outfit via `@fontsource` (subset latin, `font-display: swap`, preload the two display weights) replacing the Google Fonts link; confirm the hero animation timing is unaffected (font metrics identical); lazy-load all below-the-fold covers; verify LCP element is the hero cover preload. Commit.
13. **QA and sprint review.** Full `npm run verify`; Lighthouse on `/` mobile + desktop; axe; screenshots 1440/1024/390 of the full home page, hero band in reduced-motion, mobile rail mid-scroll, open dropdown; `docs/SPRINT-2-REVIEW.md`. Final commit.

### Acceptance criteria (all must pass)

- All Sprint 1 acceptance criteria still pass (`npm run verify` exit 0; hero section byte-identical to `c0027e3`; URL inventory 200; forms intact).
- Hero behavior unchanged on visual review: screenshots at 1440 and 390 at t≈0.8s / 2.4s / end match Sprint 1 captures; reduced-motion and return-visit paths show the featured cover + "Buy the book" CTA within the first viewport at 390×844 without scrolling.
- Home page contains exactly one primary CTA above the fold; "Start here", series shelf with "Book 1 of 3…" labels and reading-order strip, standalone shelf, children's row, quote band, author intro, journal teaser (3 latest posts, newest first), newsletter, and contact all render from data files; anchors `#top #library #books #reading-order #faith #journal #about #newsletter #contact` exist.
- Lighthouse ≥ 95 in all four categories on `/` at mobile and desktop presets; LCP < 2.5 s and CLS < 0.1 in the report; no render-blocking third-party requests (Google Fonts removed).
- axe: 0 serious/critical on `/`; every rail is keyboard-operable (arrow buttons focusable, scroll-snap, `aria-label`), no hover-only affordances; contrast AA everywhere.
- JSON-LD validates (Person, WebSite, ItemList on home; Book + BreadcrumbList on book pages) with no errors; OG/Twitter tags present with absolute image URL and dimensions; `sameAs` contains only real links.
- Screenshots at 1440/1024/390 of the full home page saved under `/home/claude/shots/sprint2/` and reviewed; no horizontal scroll at 320px.
- Grep of `_site/` for `TODO`, "bestselling", "award-winning", "★" is empty; headshot area shows no stock imagery.
- Both forms submit locally under `netlify dev` and appear in the Netlify Forms UI on the first deploy preview (Brian confirms).

---

## 4. Deferred to Sprints 3–5

**Sprint 3 — Books & series**
- The Price Series landing page (`/books/the-price-series.html`): premise, reading-order strip, "Start here" CTA, "if you only read one" note.
- Full book-page content pass on all 7 titles: format-grouped retailers extended to eBook/Audiobook rows once availability is confirmed, "Read alongside" companion cards (365 Days of Grace / Rooted in Purpose on Price Series pages), discussion-guide PDF slots, praise slot, `pages` field.
- Books hub page (`/books/`) grouped Series / Devotionals & Nonfiction / Children's with a print-friendly "Complete book list" (print stylesheet or generated PDF with ISBN + year).
- Signed-copies slot (indie partner) on book pages.
- Accessibility statement page; `/faq.html`.

**Sprint 4 — Reader services & author**
- `/about.html` with bio, "My story / testimony" section (Brian/Courtney supply), FAQ, credited headshot.
- `/press.html` press kit: short/medium/long bio slots, headshot downloads, hi-res cover downloads from `media/covers`, fact sheet, publicist/contact slot.
- `/book-clubs.html`: per-book discussion-guide slots + "Invite Courtney to your club" Netlify form.
- `/events.html` and `/news.html` (sparse-but-honest: "No upcoming events — invite Courtney to speak" + inquiry form).
- Blog upgrades: categories/tags, related posts, post OG images, newest-first index already set.

**Sprint 5 — Polish & operations**
- Optional `@11ty/eleventy-img` (AVIF, 300px widths) with deterministic filenames so `og:image` URLs survive; HTML minification only after hero byte-diff proves safe.
- Netlify dependency upgrades (`@netlify/functions` 6, `@netlify/blobs` 11) in an isolated, deploy-preview-tested commit; analytics dashboard re-check.
- Lead-magnet delivery flow (first chapter / devotional sampler) once content exists; affiliate-disclosure copy; social links.
- Cross-browser/device sweep (iOS Safari, Android Chrome, Firefox), print styles, 404 page with footer and search-less recovery links, final Lighthouse/axe regression suite in CI (GitHub Action or Netlify build plugin).

---

## 5. Decisions only Brian can make

1. **Featured title for the hero band** — default assumption is *The Price of Choosing You* (Book 1). Confirm, or name an upcoming release with a status ("Coming <Month Year>") and pre-order links.
2. **Does a real, rights-cleared author photo exist?** If yes, supply the file, photographer credit, and whether it may be offered as a press-kit download. If no, the site ships with a typographic monogram (no stock people).
3. **Retailer priority and set** — proposed fixed order: Amazon, Barnes & Noble, Bookshop.org, ChristianBook.com, Walmart, Books-A-Million. Confirm additions (Target, Apple Books, Kobo, Audible, Libro.fm) and which formats (eBook/audiobook) actually exist per title; supply direct product URLs if preferred over ISBN searches.
4. **Signed-copies partner** — is there an indie bookstore (or Courtney direct) to route signed orders through?
5. **Page counts, eBook ISBNs, audiobook availability** per title for the pub-details block.
6. **Social links** (Instagram, Facebook, Goodreads, Amazon Author, BookBub) — which exist and should be linked; none are shown until supplied.
7. **Newsletter promise and lead magnet** — approve the promise copy ("release news and first-chapter previews, a few times a year") and decide whether a lead magnet (first chapter PDF / 7-day grace sampler) will exist, and how it is delivered (Netlify Forms + manual email vs. a provider).
8. **Praise, awards, press** — supply any real, attributed quotes or coverage; otherwise those blocks stay hidden.
9. **Discussion guides / book-club questions** — will Courtney write them, and for which titles? Nothing is drafted in her voice without approval.
10. **Site URL** — confirm `https://courtney-thomas-books.netlify.app` remains canonical or whether a custom domain is coming (affects canonical/OG/feed URLs and sitemap).
11. **Blog ordering** — the generated index will be newest-first (today's hand-written index is oldest-first); confirm.
12. **Nav wording** — "Journal" vs "Blog"; "Newsletter" vs "Email updates"; whether "The Price Series" earns its own top-level item.
13. **Affiliate disclosure** — are any retailer links affiliate links? If yes, supply disclosure text.
14. **Contact routing** — confirm the `notes` form destination and whether a separate speaking/book-club inquiry form should be added in Sprint 4.
