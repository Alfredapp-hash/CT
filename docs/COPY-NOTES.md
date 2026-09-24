# Home page copy notes (Sprint 2)

Source file: `src/_data/homeCopy.json`. Engineering renders the home page from this file only. Nothing here is a template or CSS change.

Note on the filename: the brief names the file `homeCopy.json` in the JSON-shape section and `home.json` in its closing paragraph. One file was written, `homeCopy.json`, keyed exactly to the required shape. The "featured" block the closing paragraph asks for is `hero.featuredSlug` + `hero.statusPill` + `hero.hook`; the default is documented below.

## Voice rules used

- First person where Courtney speaks, third person where the site speaks about her (section ledes, about block).
- Short sentences. Concrete nouns (chains, a feather, early alarms, a garden). No exclamation marks, no emoji.
- No sales register: no "must-read", "unlock", "leverage", "transformational", "journey" as a noun (the word "journey" appears in the 365 Days of Grace blurb in `books.json`; it was not carried into any home string).
- No churchy shorthand. The only scripture-adjacent line on the page is the existing Rooted in Purpose quote from `author.json`, untouched.
- Every book description on the page is the existing `tagline` or a sentence lifted from the existing `blurb`. No new plot claims.

## Where each string comes from

| Key | Source | Status |
| --- | --- | --- |
| `hero.positioning`, `footer.tagline` | `site.tagline` | verbatim, required |
| `hero.eyebrow` | `books[0].eyebrow` ("The Price Series · Book One") | verbatim |
| `hero.hook` | first sentence of the Book One `blurb` | verbatim (115 chars) |
| `hero.statusPill` | brief default | "Available now" |
| `startHere.cards[0].body` | Book One `tagline` | verbatim |
| `startHere.cards[1].body` | 365 Days of Grace `tagline` | verbatim |
| `series.lede` | current shelf lede on index.njk | verbatim |
| `standalone.childrenLede` | last sentence of the Finding Drake's Feather `blurb` | verbatim |
| `journal.heading` | `site.blog.heading` ("Notes from the page") | verbatim |
| `newsletter.eyebrow` / `.heading` / `.button` | `site.newsletter.*` and the current form | verbatim |
| `contact.heading` / `.lede` / labels / `.button` | `site.contact.*` and the current form | verbatim |
| `a11y.*`, `hero.ctaPrimary`, `hero.ctaSecondary`, `series.orderLabel`, `series.seriesLink`, `about.*`, `journal.cta/.rss/.relatedLabel` | brief | as specified |

## Strings changed from the current site

1. **Intro eyebrow "Faith, healing, loss, and purpose" is not reused on the home page.** Sprint 2 replaces the intro block with the hero pill/hook and the "Start here" cards. The phrase still lives in the about paragraphs (`author.json`) and in `site.description`. If the intro section survives, put the old eyebrow back; nothing in `homeCopy.json` depends on it.
2. **Faith & home shelf lede.** Was: "Books written from lived seasons — purpose, self-worth, working motherhood, and a child's grief." Now `standalone.lede`: "Purpose, self-worth, and working motherhood, written from seasons Courtney has lived through herself." The child's-grief clause moved to its own `childrenLede` because the children's book gets its own eyebrow.
3. **Shelf heading "Faith & home" becomes the eyebrow**; the heading is now "Essays and devotionals". The two nonfiction titles are essays; 365 Days of Grace is a devotional. No other category words were added.
4. **Journal lede.** Was: "Essays on surviving into story, reading the series, gardens of purpose, ordinary grace, and what love leaves behind." Now: "Short essays on the work behind the books: surviving into story, gardens of purpose, ordinary grace, and what love leaves behind." Dropped "reading the series" because the reading order now has its own section directly above; borrowed "the work behind the books" from `site.blog.lede`.
5. **Journal CTA.** "Visit the blog" becomes "Read the Journal" (brief), which also matches the nav label.
6. **Reading-order intro.** The old section had eyebrow "Start here" and heading "The Price Series reading order". "Start here" now names the two-card section above it; the reading order is folded into the series block as `orderLabel` + `orderNote`. The old per-book one-liners ("Survival and the first choice." etc.) are not in this file; the engineer can keep them in the template if the step list stays, since they are existing site copy.
7. **Newsletter promise.** Was `site.newsletter.lede`: "Occasional letters about new books, journal posts, and quiet encouragement for hard seasons. No spam." Now `newsletter.promise` says the same three things, states cadence honestly ("A few times a year, not more") and adds that leaving is easy. `footer.newsletterMini` is the two-word version: "Occasional letters. No spam."
8. **Newsletter name field.** `nameLabel: "First name"` is new; the current form is email only. Adding the input is an engineering change to the Netlify form (keep `form-name`, `data-netlify`, honeypot).
9. **Contact success/error notes** are new strings. `opening.js` currently owns the `#form-note` text for `form[name='notes']`; since opening.js must not be edited, the engineer should decide whether to read these strings via data attributes or leave the JS text as is. Either way the strings are here.
10. **Privacy note under the newsletter** is new and links to `/privacy.html`.

## Decisions for Brian

1. **Featured title.** Default is `the-price-of-choosing-you` (Book One, in print). Change `hero.featuredSlug` and `hero.eyebrow`, `hero.hook`, `hero.ctaPrimaryAria` together if a different book should lead.
2. **Status pill wording.** Default "Available now". Alternatives that stay true: "In print", "Book One". Do not use "Coming soon" or "New" unless there is a real upcoming or newly released title to point at.
3. **Newsletter cadence.** The promise says "a few times a year, not more". If Courtney will write more often, say so plainly ("about once a month"); do not promise weekly.
4. **"Journal" vs "Blog".** The nav says Journal, the footer group says Blog, and the blog index is titled Journal. This file uses "Journal" throughout. The footer link label in `site.json` (`footerNav`) still says "Blog"; pick one.
5. **Lead magnet.** `newsletter.leadMagnetLine` ("A short sample from the books comes with your first letter.") renders only when `site.newsletter.leadMagnet` exists. It deliberately does not name a chapter, a PDF, or a book. If the actual gift is something else (a 7-day devotional sampler, say), rewrite the line to match what is sent.
6. **Site credit.** `footer.credit` is an empty string, so it renders nothing. Supply text if a credit line is wanted.
7. **About link.** `about.moreLink` ("More about Courtney") assumes an `/about` page exists or will. If it does not ship in Sprint 2, the engineer should hide the link rather than point it at `#about`.

## Hero hook: chosen line and one alternative

- **Chosen** (115 chars, blurb sentence one, verbatim): "Kathryn wakes in the dark, wrists bound, and learns the man holding the key is not the worst thing looking for her."
- **Alternative** (118 chars, blurb sentence two, lightly compressed): "A novel of survival and sacrifice: the rules of silence, the cost of mercy, and a choice made when fear changes shape."

The chosen line puts a person and a room on the page before any category words. The alternative reads more like a jacket line and would suit a hero that already shows the cover large.

## Acceptance checks run

1. `node -e "JSON.parse(...)"` passes; all required keys present (checked by script).
2. `grep -Ei "award|bestsell|★|review|TODO|lorem|coming soon|weekly|free chapter"` on the file returns nothing.
3. Both card slugs and the featured slug exist in `books.json`; card bodies equal the `tagline` fields exactly (checked by script).
4. Every string read for register; none of the banned words appear.
