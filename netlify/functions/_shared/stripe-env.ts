/** Presence checks only. Secret values stay in the environment and never go into HTML. */
export const PRODUCTION_ORIGIN = "https://www.booksbycourtney.site";

export function stripeSecret(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function stripeConfigured(): boolean {
  return stripeSecret().length > 0;
}

export function webhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Localhost and the production host keep their own origin. Everything else returns to production. */
export function checkoutOrigin(req: Request): string {
  const url = new URL(req.url);
  if (LOCAL_HOSTS.has(url.hostname) || url.origin === PRODUCTION_ORIGIN) return url.origin;
  return PRODUCTION_ORIGIN;
}

/** The origin a browser may use for desk and form posts. A missing Origin is allowed for non-browser clients. */
export function browserOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname)) return false;
    return url.origin === PRODUCTION_ORIGIN || url.hostname === "booksbycourtney.site" || LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Build a site URL from a request without trusting a forged forwarded host. */
export function siteOrigin(req: Request): string {
  const url = new URL(req.url);
  if (LOCAL_HOSTS.has(url.hostname)) return url.origin;
  return PRODUCTION_ORIGIN;
}
