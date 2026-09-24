# Sprint 1 — Art director review

Reviewed: build of `master` @ `1f3b2c1` (rebuilt locally with `npx @11ty/eleventy`, served from `_site/` on :8080), the c0027e3 baseline served on :8081 for side-by-side captures, the engineer's screenshots in `/home/claude/shots/sprint1/`, and `docs/SPRINT-1-REVIEW.md`. My own captures are `/home/claude/shots/s1-review-*.png`.

## Verdict: BLOCKED

One structural defect (horizontal document overflow on every page that carries a `.rail`) fails a hard constraint and is visible in the engineer's own screenshots. Everything else is at "should fix" level or better. The hero is preserved — but the review's hero evidence was captured from an intermediate build, so I re-ran it against the final build (it passes; see the table).

---

## BLOCKING (must fix before Sprint 2)

1. **Horizontal page scroll on every page with a rail** — `sprint1/book-390.png` (1013 px wide for a 390 viewport), `sprint1/book-1024.png` (1271 px), `sprint1/styleguide-{1440,1024,390}.png` (1714 / 1605 / 1201 px), and my `s1-review-book-rooted-390.png`, `s1-review-book-rooted-1024.png`. The white gutter on the right of those captures is the document overflowing. Measured: `documentElement.scrollWidth` = 940 at 320, 1013 at 390, 1271 at 1024 on `/books/*`; a horizontal wheel over the page body moves the *window* 559 px. Cause (isolated by toggling rules in the browser): the two `.visually-hidden` spans inside every rail card's "Read more" / "Buy" links (`src/_includes/partials/book-card-new.njk` lines 23–24) are `position: absolute`; their containing block is `.rail` (`position: relative`), not the scroll track, so they escape the track's clip and sit at each card's un-scrolled x-offset. Hiding them alone returns scrollWidth to the viewport width. *Fixed looks like:* `scrollWidth === clientWidth` on `/`, every `/books/*.html`, `/blog/` and `/styleguide.html` at 320, 390, 1024 and 1440; the full-page captures are exactly viewport-wide. The cheapest correct fix is `position: relative` on `.rail__track` (or `.book-card`) so the hidden spans are clipped inside the scroller; `overflow-x: clip` on `.rail` would also work. *Violates:* "works at 320px", "no horizontal scrollbar in any capture", and the review's own stated gate ("No horizontal scroll at 320px … scrollWidth = 320"), which I could not reproduce.

---

## SHOULD FIX (in Sprint 2 alongside the home build)

1. **Hero verification was run against an intermediate build** — `sprint1/after-390-t0.8s.png`, `after-390-t2.4s.png`, `after-1440-*.png` all show the *old* inline header (BOOKS BLOG ABOUT CONTACT, clipped at 390). They are timestamped 13:55 (commit 86148ef); the nav (14:01), footer, book layout, `components.css` link and the inline `has-nav-js` script (14:17) all landed afterwards. The "pixel-identical" claim therefore did not test the shipped head order or header height. I re-captured from the final build (`s1-review-after-*`) and the hero passes — see the table — but `scripts/check-hero.mjs` should take its screenshots as the last step of the build, not mid-sprint. *Fixed looks like:* hero screenshots regenerated from the same tree the review reports on, with the new header visible in them. *Constraint:* hero evidence must match the artefact being reviewed.

2. **Header reflows ~277 px when the hero Skip button hides** — `s1-review-header-strip.png` (rows 3–4: during animation vs end). The new nav sits with a ~250 px gap before "SKIP" while the animation runs, then jumps right when Skip is hidden. Baseline moved 54 px (row 1–2). *Fixed:* reserve the Skip slot (`visibility: hidden` instead of `[hidden]`, or absolute-position `.nav-skip`) so the nav does not move at hero end. *Violates:* "home page should look the same as before except the new nav"; the jump is a new artefact in the hero moment.

3. **Mobile Buy bar covers the footer legal row and duplicates the in-view CTA** — `sprint1/book-390-viewport.png` shows "Buy the book" and the bar's "Buy" in the same viewport; `s1-review-buybar-bottom-390.png` shows the bar (780–844) sitting over Privacy / Accessibility (legal row bottom = 812) at the end of the page, so those links are unreachable. The bar's button is 58 × 44. *Fixed:* show the bar only once `#buy`/the primary CTA has scrolled out (IntersectionObserver, or hide when the footer is in view), add `padding-bottom` equal to the bar height on the footer, and make the bar's button ≥ 50% width. *Principle:* "full-width 44px buy buttons"; "one primary action per viewport".

4. **Synopsis measure ~90 characters** — `sprint1/book-1440.png`, `s1-review-book-rooted-1440.png`. `.blurb` gets a 736 px max-width (≈ 90 ch at 17.28 px Outfit); `--measure` is 65ch. First line of the Choosing You synopsis is 91 characters. *Fixed:* `.blurb, .where .dist { max-width: var(--measure) }`. *Criterion 3:* 55–75 ch.

5. **Cover column too light at 1440** — `sprint1/book-1440.png`, `s1-review-book-rooted-1440.png`. Cover column 280 px vs text column 824 px (25/75). Publisher spines (Picoult, Hannah) run closer to 35/65. *Fixed:* `grid-template-columns: 340px minmax(0,1fr)` ≥ 1200, keep 240 px at 1024. *Criterion 6.*

6. **Rail / grid cards are ragged** — `s1-review-styleguide-stack.png` (middle panel), `sprint1/book-1440.png`. Button rows land at four different y-positions across five cards because cards without a series eyebrow (Rooted in Purpose) collapse, and buttons are not pinned to the card bottom. *Fixed:* `.book-card { display:flex; flex-direction:column }`, actions `margin-top:auto`, and a reserved eyebrow line (`min-height: 2 lines` or an always-present eyebrow such as "Devotional"). *Criterion 4.*

7. **Two primary button styles now coexist** — `s1-review-styleguide-stack.png` (bottom panel: ink "SUBSCRIBE" beside leather `.btn--primary` in the same guide); `sprint1/home-1440.png` (ink SEND/SUBSCRIBE) vs leather NEWSLETTER in the nav. Expected in Sprint 1 (home is frozen), but Sprint 2 must pick one. *Fixed:* the home forms adopt `.btn--primary` (leather) in Sprint 2; the styleguide shows one primary. *Criterion 7.*

8. **Nav: "Books" and "The Price Series" both link to `/#books`** — `_site/index.html` header; `sprint1/nav-dropdown-1440.png`. Two top-level items with one destination reads as padding. Also: the dropdown caret sits ~20 px from "BOOKS" (looks detached), and the three group columns' first rows do not align (Devotionals label wraps to two lines: 131 / 147 / 131 px). *Fixed:* either make "The Price Series" the series landing page (Sprint 2 plans one) or drop it until it exists; caret at 6 px; align group lists with a fixed-height label. *Criterion 5:* 4–6 items, each distinct.

9. **Footer book order differs from the dropdown** — `sprint1/footer-1440.png`: … Finding Your Self-Worth, Finding Drake's Feather, 365 Days of Grace; dropdown: Rooted, Self-Worth, 365, Drake's. *Fixed:* one ordering from `books.json` (series 1–3, devotionals, children's) used by nav, footer and rails. *Principle:* "Series order is explicit, never inferred."

10. **Eyebrow gold on paper is 4.2:1** — engineer's own note; visible on `sprint1/home-top-*`, `book-1440.png` eyebrows and `.post-meta`. Small letter-spaced caps at ~11–14 px need 4.5:1. `--gold-deep` (#755526, 5.8:1) already exists and is within the fixed palette. *Fixed:* eyebrows/meta use `--gold-deep`; `--gold` stays for rules, quote marks and large display use. *Constraint:* WCAG AA.

11. **Footer links and nav CTA are 40 px tall** — `components.css` lines 406, 478, 592 set `min-height: 40px` while `--target` is 44 px. Rows measure ~41 px in `sprint1/footer-390.png`. *Fixed:* `min-height: var(--target)`. *Constraint:* 44 px tap targets at 390.

12. **Styleguide cannot show hover/focus/active** — `s1-review-styleguide-sg-buttons-1440.png` shows primary/secondary/quiet/disabled/small only; hover and focus rules exist in CSS (`.btn--primary:hover` etc., gold focus ring confirmed in `s1-review-nav-open-390-kbd.png`) but are not reviewable from a screenshot. Section anchors also slide under the fixed header (`scroll-margin-top` missing). *Fixed:* forced-state rows (`.is-hover`, `.is-focus`, `.is-active` mirroring the pseudo-class rules) and `scroll-margin-top: calc(var(--nav-h) + 1rem)` on `.sg-block`.

13. **Newsletter forms have no visible label** — `sprint1/home-1440.png`, `footer-1440.png`, styleguide: placeholder "Your email" only; the `<label>` is `.visually-hidden`. Inherited from baseline and axe-clean, but placeholder-as-label fails once the field has focus/content. *Fixed:* a visible small label ("Email") above the input in the Sprint 2 newsletter component, home and footer.

---

## NICE TO HAVE (Sprint 3+ backlog)

- `s1-review-styleguide-sg-buttons-1440.png` — the disabled primary renders as a dusty rose (leather at reduced opacity); it reads as a new hue. Prefer `--paper-sunk` fill + `--ink-soft` text.
- `components.css` — `rgba(246,237,215,α)` (paper at alpha) appears 12 times and `rgba(28,20,16,α)` 4 times; promote to `--paper-a10/--paper-a35/--paper-a78` and `--ink-a08` tokens.
- `s1-review-nav-open-390-wheel2.png` — the Newsletter button inside the mobile menu is 152 px wide; full-width in the drawer would match the "full-width buttons on mobile" principle.
- `s1-review-cmp-shelf-1440.png` — cover source files have five different aspect ratios (600×903 to 600×1213) and the What We Keep jacket is visibly low-resolution (title only, soft). Inherited from baseline; ask Brian for print-resolution artwork and normalise to one ratio before Sprint 2's home shelf.
- `sprint1/footer-1440.png` — footer mini-form wraps "Subscribe" under the input at 1440; a single-row input+button would sit tighter.
- Full-page captures show a hard edge in the paper gradient at y = viewport height (`sprint1/book-1440.png`, `book-1024.png`). This is `background-attachment: fixed` on `body` (baseline rule) interacting with full-page screenshots, not a rendering defect; note it in the capture helper so future reviewers don't chase it.
- `grep -rEil "bestsell|award|★|lorem|TODO" _site` returns only `media/book/open-left.jpg` — a byte coincidence inside a sha-identical hero texture, not text. No fabricated content anywhere in the built HTML.

---

## Hero verification table

Reference = `sprint1/before-{w}-{t}.png` (c0027e3 tree). Two "after" sets: the engineer's (`sprint1/after-*`, captured 13:55 from the pre-nav build) and mine (`s1-review-after-*`, captured from the final `1f3b2c1` build). "Below header" excludes the 0–70 px header band, which intentionally changed (new nav).

| Width × timestamp | Engineer's after (pre-nav build) | My after (final build), below header | Notes |
|---|---|---|---|
| 1440 × t≈0.8 s | identical (0 px) | identical (0 px) | cover closed, same shadow and stage position |
| 1440 × t≈2.4 s | identical (0 px) | differs, sub-frame: whole left page ~1 px, edge pixels only (`diff-1440-t2.4s.png`); max Δ within page texture; 96 % of differing pixels < 32/255 | page-turn timing jitter between runs, not a layout change |
| 1440 × end | identical | identical (0 px) | open book, write-on complete, scroll cue in place |
| 1440 × second load | identical | identical (0 px) | `ct-hero-opened` skip path: book already open, Skip hidden |
| 1440 × reduced motion | identical | identical (0 px) | finished open book, no animation artefacts, `bk-pre` absent |
| 390 × t≈0.8 s | 26 px (scroll-cue line) | 1 px (scroll-cue line) | cue-line is a CSS animation; expected |
| 390 × t≈2.4 s | 104,714 px differ but max channel Δ = 10/255 (visually identical) | 1 px | mid-turn texture anti-aliasing; engineer's "≤ 1 px" wording was wrong but the conclusion holds |
| 390 × end | 22 px (cue line) | 1 px (cue line) | identical |
| 390 × second load | 12 px (cue line) | 0 px | identical |
| 390 × reduced motion | identical | identical (0 px) | finished open book, no artefacts |

Header band (0–70 px): differs in every "after" capture by design (Books ▾ / The Price Series / About / Journal / Contact / Newsletter button; MENU hamburger at 390). Paper colour, book position, page angle at end state, text write-on, shadow and scroll cue: unchanged. **Hero: PASS.**

Home page body vs baseline (`s1-review-cmp-home-1440-{a,b}.png`, `s1-review-cmp-home-390-{a,b}.png`, `s1-review-cmp-shelf-1440.png`): identical from the hero through the contact form; the only differences are the header and the new footer (page grows 348 px at 1440 / 892 px at 390, all footer). Both baseline and after show blank shelf cards in full-page captures — a scroll-timeline reveal artefact present on the baseline too; the viewport capture `s1-review-cmp-shelf-1440.png` confirms the shelf renders identically.

---

## Publisher-grade scorecard (1–5)

| # | Criterion | Score | Evidence |
|---|---|---:|---|
| 1 | Hierarchy | 3 | Home is frozen and unchanged (`s1-review-cmp-home-390-a.png`: H1 + lede, no CTA yet — Sprint 2's job); the book page at 390 shows two Buy actions in one viewport (`sprint1/book-390-viewport.png`). |
| 2 | Spacing rhythm | 3 | Book page sections use 48 / 56 / 72 px padding (`.book-related` pt 48, `.newsletter` pt 56 pb 72) — tighter than the 96–128 px target at 1440 and not drawn from one step; home rhythm is the baseline's. |
| 3 | Typography | 3 | Display steps are clean and predictable (`s1-review-styleguide-sg-buttons-1440.png` / tokens block); synopsis and distribution copy run ~85–90 ch (`sprint1/book-1440.png`); no orphaned heading words seen at 1440. |
| 4 | Covers | 2 | Same shadow/radius everywhere, @2x sources present and crisp, but five aspect ratios (`s1-review-cmp-shelf-1440.png`) leave the home shelf and rails ragged; the rail's `aspect-ratio: 600/1213` reserve bottom-aligns covers but the text rows still stagger (`s1-review-styleguide-stack.png`). |
| 5 | Nav | 3 | Brand left, one button, grouped dropdown in the right order with 1–3 numerals (`sprint1/nav-dropdown-1440.png`); mobile drawer is full-height, scrollable, keyboard-focusable and closable (`s1-review-nav-open-390-kbd.png`, `-wheel2.png`); loses points for the duplicate `/#books` items and the 277 px Skip-button reflow. |
| 6 | Book page | 3 | Retailer chips are format-grouped and identical on both pages checked (`sprint1/book-1440.png`, `s1-review-book-rooted-1440.png`: Amazon, B&N, Bookshop.org, ChristianBook.com, Walmart, Books-A-Million); cover column is under-weighted (280/824) and the mobile bar covers the legal row. |
| 7 | Restraint | 4 | No dividers beyond hairlines, one accent per section, no icons except ↗ on external chips and ←/→ rail controls (`s1-review-styleguide-stack.png`); the only slip is the rose-tinted disabled state. |
| 8 | Footer | 4 | Reads as a three-group sitemap with a quiet legal row (`sprint1/footer-1440.png`); text on leather is comfortably above AA; small deduction for the wrapped mini-form and the ordering mismatch with the dropdown. |

---

## Claims in `docs/SPRINT-1-REVIEW.md` I could not confirm

- "No horizontal scroll at 320px on `/`, book page, `/blog/`, `/styleguide.html` (scrollWidth = 320)" — **false for the book pages and styleguide** (940 / 1114 px at 320). True for `/` and `/blog/`.
- "Hero screenshots before vs after are pixel-identical at 1440 (all 5 states); at 390 the only differing pixels (max 1) are the scroll-cue's animated line" — the captures were taken from the pre-nav build; the 390 t2.4s pair differs across 104k pixels (all ≤ 10/255). Re-verified from the final build above: the conclusion stands, the evidence did not.
- "Mobile menu: … first item focused on open" — confirmed only under keyboard operation (`s1-review-nav-open-390-kbd.png`); the engineer's `nav-open-390.png` (mouse-opened) shows no ring, which is correct `:focus-visible` behaviour, not a defect.
- Lighthouse figures (`lh-x.json` 76/100/100/100, blog 92, book 97) — read back from the saved JSON and match the review. Home performance remains below 95 as stated; it is baseline-identical and hero/font bound.
- axe "0 violations" — not re-run; no contradicting evidence in the captures.

---

## Notes for the Sprint 2 art director

- **Tokens.** The spacing scale tops out at `--space-8` = 4.5rem (72 px). Section rhythm at 1440 needs a 96 px and a 128 px step (`--space-9: 6rem`, `--space-10: 8rem`) so sections are not hand-padded. `--measure: 65ch` exists — apply it; `.blurb` and `.dist` currently override it in px. `--gold-deep` (#755526) is the correct small-text gold; treat `--gold` (#8f6a30) as a rule/ornament colour. `--target: 44px` exists but three rules still hard-code 40 px.
- **Covers.** Do not build the home shelf on the source files as they are: five ratios and one low-res jacket. Either normalise every jacket to 2:3 (letterbox on `--paper-sunk` inside `.jacket`) or get print-res files first. The rail's "reserve the tallest ratio" trick bottom-aligns covers but cannot align titles; the card needs a flex column with actions pinned to the bottom and a permanent eyebrow line.
- **Cover shadow.** `.jacket` (spine highlight `::before`, page-edge `::after`, `--lift-2` shadow) is consistent across card, rail and book page — keep it as the single cover treatment; the styleguide should show it once at each size rather than five times.
- **Rail.** Works with keyboard, buttons, snap and no auto-rotate; the horizontal-overflow bug is in card markup, not the rail. When fixed, the rail is reusable for the home shelf. Rail items are `clamp(150px, 42vw, 210px)` — at 390 that is two cards with a ragged third edge, which is the right affordance; at 1440 seven cards do not fit and the seventh is cut, which is also fine.
- **Buttons.** Decide one primary. The nav Newsletter, book Buy and styleguide `.btn--primary` are leather; the home forms are ink. Leather is the brand's accent and should win; the home Send/Subscribe change is in Sprint 2's remit.
- **Header.** Fix the Skip-slot reflow before adding the decision band under the hero; anything sitting below the hero will otherwise shift with it. Keep the header at the current 70 px; the mobile drawer's `overflow-y: auto` and scroll lock are correct.
- **Book page.** Cover column to ~340 px at ≥ 1200; the sticky cover works. The Buy bar needs a show/hide rule tied to the primary CTA's visibility and a footer offset. Retailer chips are the right shape; group headings ("Paperback"/"Hardcover") already come from data.
- **Forms.** Keep the Netlify attributes exactly as they are (verified byte-equivalent by the engineer); add visible labels in the new newsletter component rather than editing the existing home form markup.
