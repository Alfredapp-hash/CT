# Deploying the Courtney Thomas site

The site is built by [Eleventy](https://www.11ty.dev/) 3 from `src/` into `_site/` and served by Netlify.

## Build settings (netlify.toml)

- `publish = "_site"`, `command = "npm run build"`, Node 22 (`.nvmrc` + `NODE_VERSION`).
- Netlify Functions stay in `netlify/functions/` (not part of the Eleventy input) and keep their `/api/analytics/*` routes.
- Netlify Forms are detected from the HTML in `_site/index.html` after the build (`newsletter` and `notes`).
- Redirects: `/thank-you`, `/admin`, plus extensionless conveniences (`/privacy`, `/accessibility`, `/books/:slug`, `/blog/posts/:slug`) as 200 rewrites. The `.html` URLs remain the canonical ones.

## Pretty URLs must be OFF

In the Netlify UI, **Site configuration → Build & deploy → Post processing → Asset optimization**, "Pretty URLs" must be **disabled**.
If it is on, Netlify 301-redirects `/books/x.html` to `/books/x/`, which breaks the canonical tags, `og:url`, the sitemap, and the RSS `guid`s (all of which use the `.html` URLs).

## Local development

```
nvm use            # Node 22
npm install
npm start          # eleventy --serve on http://localhost:8080
npm run dev        # netlify dev: proxies Eleventy and serves the functions + form emulation
```

## Verification gates (run before merging)

```
npm run validate   # data integrity (ISBN checksums, cover files, unique slugs)
npm run verify     # build, serve, request every inventoried URL, assert forms and file inventory
npm run check-hero # hero markup and assets byte-identical to commit c0027e3
```

Environment: `ANALYTICS_KEY` (Netlify env var) is untouched by the migration. Canonicals always point at production (`site.url` in `src/_data/site.json`), never at `DEPLOY_PRIME_URL`.
