# Analytics

Privacy-friendly, first-party analytics for the site. No cookies, no fingerprinting, no IP addresses,
no personal data. Only daily aggregate counts are stored in a Netlify Blobs store named `analytics`,
one JSON object per day at `day/YYYY-MM-DD.json`.

## Pieces

| File | Purpose |
|---|---|
| `js/analytics.js` | Client beacon. Fire-and-forget pageview POST, skips `/admin`. |
| `netlify/functions/collect.ts` | `POST /api/analytics/collect` — increments the day rollup, returns 204. |
| `netlify/functions/summary.ts` | `GET /api/analytics/summary?days=30` — key-protected JSON report. |
| `admin/analytics.html` | Private dashboard at `/admin/analytics`, key held in `sessionStorage`. |

## Setting the access key

The summary endpoint and dashboard require `ANALYTICS_KEY`. It is a secret and must never be committed.
Generate a long random value and set it on the Netlify site:

```bash
openssl rand -base64 32
netlify env:set ANALYTICS_KEY "<paste-the-generated-value>"
```

Redeploy afterwards so the functions pick it up:

```bash
netlify deploy --prod
```

For local development, `netlify dev` pulls the same variable from the linked site. If you want a
different local value, put it in an untracked `.env` file as `ANALYTICS_KEY=...`.

## Using the dashboard

Open `/admin/analytics`, paste the key, and the dashboard loads totals, a daily bar chart, top pages,
top referrers, and event counts. The key is stored in `sessionStorage` only, so it is cleared when the
tab closes, and "Sign out" removes it immediately.

## Custom events

Any script on the site can record a named event:

```js
fetch("/api/analytics/collect", {
  method: "POST",
  keepalive: true,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: location.pathname, event: "buy-click" }),
});
```

Event names are lowercased and limited to `a-z 0-9 . _ -`.
