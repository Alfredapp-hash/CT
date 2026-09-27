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

/** Localhost and the production host keep their own origin. Everything else returns to production. */
export function checkoutOrigin(req: Request): string {
  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.origin === PRODUCTION_ORIGIN) {
    return url.origin;
  }
  return PRODUCTION_ORIGIN;
}
