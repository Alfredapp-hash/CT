/**
 * Starts Stripe Checkout for a listed product. Stock is not changed here;
 * the webhook records the order after payment.
 */
import Stripe from "stripe";
import { database, query } from "./_shared/content";
import { json, readJson } from "./_shared/http";
import { checkoutOrigin, stripeSecret } from "./_shared/stripe-env";

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  stock: number;
  has_image: boolean;
  checkout_url: string | null;
};

function logSafe(error: unknown): void {
  const raw = error instanceof Error ? error.message : "Checkout failed";
  console.error(raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]"));
}

export default async (req: Request) => {
  const secret = stripeSecret();
  if (!secret) return json({ error: "Card checkout is not set up yet." }, 503);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await readJson(req);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const quantity = body.quantity;
    if (!slug) return json({ error: "Choose a piece from the shop." }, 400);
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: "Choose a quantity between 1 and 20." }, 400);
    }

    const db = database();
    const rows = await query<Product>(db.sql`
      SELECT id, slug, name, description, price_cents, currency, stock, has_image, checkout_url
      FROM products WHERE slug = ${slug} AND status = 'listed' LIMIT 1
    `);
    const product = rows[0];
    if (!product) return json({ error: "That piece is not on the shop." }, 404);
    if (typeof product.checkout_url === "string" && product.checkout_url.trim()) {
      return json({ error: "This piece is purchased through its checkout link." }, 400);
    }

    const stock = Number(product.stock);
    const priceCents = Number(product.price_cents);
    if (!Number.isInteger(stock) || stock < quantity) {
      return json({ error: "There are not that many left." }, 409);
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return json({ error: "This piece does not have a price yet." }, 400);
    }
    const currency = String(product.currency || "USD").toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) return json({ error: "This piece does not have a price yet." }, 400);

    const origin = checkoutOrigin(req);
    const itemPath = `/merch/item/${encodeURIComponent(product.slug)}`;
    const image = product.has_image && origin.startsWith("https://")
      ? `${origin}/api/media/product/${product.id}`
      : "";
    const description = String(product.description || "").trim().slice(0, 5000);

    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      line_items: [
        {
          quantity,
          price_data: {
            currency,
            unit_amount: priceCents,
            product_data: {
              name: String(product.name).slice(0, 250),
              ...(description ? { description } : {}),
              ...(image ? { images: [image] } : {}),
            },
          },
        },
      ],
      metadata: {
        product_id: String(product.id),
        slug: product.slug,
        quantity: String(quantity),
      },
      success_url: `${origin}${itemPath}?checkout=success`,
      cancel_url: `${origin}${itemPath}?checkout=cancel`,
    });

    if (!session.url) return json({ error: "Checkout could not be started." }, 502);
    return json({ url: session.url });
  } catch (error) {
    logSafe(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Could not read that." || message === "That was too long to save.") {
      return json({ error: "Could not read that." }, 400);
    }
    return json({ error: "Checkout could not be started." }, 502);
  }
};
