# Sprints 1–2 — closing report

Delivered 2026-09-24. Detail lives in `PLAN.md`, `SPRINT-1-REVIEW.md`, `SPRINT-1-AD-REVIEW.md`, `SPRINT-2-REVIEW.md`, `QA-SPRINT-2.md`, `HOME-SPEC.md`, `COPY-NOTES.md`, `DEPLOY.md`.

## What shipped

- **Eleventy 3 migration.** Source in `src/`, output in `_site/`. Every page is generated from data: `src/_data/books.json` (7 titles), `site.json` (nav, retailers, featured title, newsletter), `author.json`, `homeCopy.json`. Netlify builds with `npm run build`, publishes `_site/`; forms and the analytics functions are unchanged.
- **Every old URL still works** (67/67, verified by `npm run verify`; 1,259 local links checked). The 3D book hero is byte-identical to the pre-migration site (`npm run check-hero`).
- **Design system.** Tokens + type scale, `components.css` (buttons, retailer chips grouped by format, book cards with "Book N of 3", panels, rails with keyboard control, status pills), nav with Books dropdown and accessible mobile menu, rich footer, `/styleguide.html`, `/accessibility.html`.
- **Home page** rebuilt: decision band (featured title + Buy / Explore CTAs) → Start here → Price Series shelf + reading order → Essays & devotionals → children's row → quote band → author intro → journal teaser → newsletter → contact.
- **Book pages** from one template: cover, pub details, format-grouped retailers, synopsis, excerpt, related titles, sticky mobile buy bar, Book + Breadcrumb JSON-LD.
- **Self-hosted fonts** (no Google Fonts request), home JSON-LD (Person / WebSite / ItemList), full OG/Twitter meta with measured image dimensions.

Local dev: `npm install` → `npm start` (http://localhost:8080). Gates: `npm run verify`, `npm run check-hero`, `npm run validate`.

## Acceptance status

| Criterion | Status |
|---|---|
| Build clean, all URLs resolve, forms intact | PASS |
| Hero byte-identical, timing/reduced-motion parity | PASS (0 px diff at 1440) |
| axe 0 serious/critical on /, book, blog, styleguide | PASS |
| Keyboard: nav, dropdown, mobile menu, rails, skip link | PASS |
| 320 px, no horizontal scroll | PASS |
| Lighthouse desktop ≥ 95 ×4 | PASS (98 / 100 / 100 / 100) |
| Lighthouse mobile ≥ 95 ×4 | **FAIL on performance: 78–81** (a11y/BP/SEO 100). LCP is the frozen hero's 204 KB cover + blocking `opening.js`; the original site scores ~75 on the same test. Fixable only by touching hero assets. |
| Featured cover + CTA in first mobile viewport | **FAIL** — the 100dvh hero fills it by design. |
| No fabricated content | PASS (validator bans award/bestseller/review/TODO strings) |

## Decisions for Brian

1. **Mobile performance.** Authorise a hero-assets-only pass (AVIF/smaller `cover.jpg`, lighter page textures, deferred `opening.js`)? Expected to reach ≥ 95. Or accept ~80 to keep the hero frozen.
2. **Featured title.** Defaults to *The Price of Choosing You* (`site.json → featured`). Change slug/pill/hook there.
3. **Header "Newsletter" button** is a second primary CTA on desktop; keep, or demote to secondary.
4. **Author photo.** `author.headshot` is null → monogram. Supply a real photo + credit to replace it.
5. **Socials, lead magnet, praise/press slots** all render only when filled in `site.json` / `books.json`.

## Deferred to Sprints 3–5

Book-page polish (excerpt pages, discussion guides), Author & Press (long-form about, press kit, events/booking), blog design pass, image pipeline (AVIF), final cross-browser QA.
