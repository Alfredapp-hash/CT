# Analytics

Privacy-friendly, first-party analytics for the site. No cookies, no fingerprinting, no IP addresses,
no personal data. Only daily aggregate counts are stored in a Netlify Blobs store named `analytics`,
one JSON object per day at `day/YYYY-MM-DD.json`.

## Pieces

| File | Purpose |
|---|---|
| `js/analytics.js` | Client beacon. Fire-and-forget pageview POST, skips `/admin`. |
| `netlify/functions/collect.ts` | `POST /api/analytics/collect` — increments the day rollup, returns 204. |
| `netlify/functions/login.ts` | `POST /api/auth/login` — checks the author email and password, sets an HttpOnly session cookie. |
| `netlify/functions/logout.ts` | `POST /api/auth/logout` — clears that cookie. |
| `netlify/functions/summary.ts` | `GET /api/analytics/summary?days=30` — session- or key-protected JSON report. |
| `admin/analytics.html` | Private dashboard at `/admin/analytics`. |

## Author login

The dashboard signs in with one author account. The password is never stored. Netlify holds:

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | The author email allowed to sign in. |
| `ADMIN_PASSWORD_HASH` | `scrypt:<salt>:<hash>` (base64url). |
| `SESSION_SECRET` | HMAC secret for the 12-hour session cookie. |

`ANALYTICS_KEY` still works as a header (`X-Analytics-Key`) for scripts. The dashboard itself uses the cookie.

These values belong in Netlify env vars and in an untracked local `.env`. Do not commit them.
After changing them, redeploy so the functions pick them up:

```bash
netlify deploy --prod
```

## Using the dashboard

Open `/admin/analytics`, sign in with the author email and password, and the dashboard loads totals,
a daily bar chart, top pages, top referrers, and event counts. "Sign out" clears the cookie immediately.
The cookie is HttpOnly, so page scripts cannot read it.

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
