/**
 * Records a paid Checkout Session as an order and decrements stock.
 * Signature verification uses the raw request body.
 */
import Stripe from "stripe";
import { database } from "./_shared/content";
import { json, uniqueViolation } from "./_shared/http";
import { stripeSecret, webhookSecret } from "./_shared/stripe-env";

type PostalAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function logSafe(error: unknown): void {
  const raw = error instanceof Error ? error.message : "Webhook failed";
  console.error(raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]"));
}

function formatAddress(address: PostalAddress | null | undefined): string {
  if (!address) return "";
  const cityLine = [address.city, address.state, address.postal_code].filter((part) => part && part.trim()).join(", ");
  return [address.line1, address.line2, cityLine, address.country]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n");
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

async function recordPaidOrder(session: Stripe.Checkout.Session): Promise<Response> {
  const quantity = Number(session.metadata?.quantity);
  const productId = Number(session.metadata?.product_id);
  if (!session.id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !Number.isInteger(productId) || productId < 1) {
    console.error(`Paid Stripe session ${session.id || "unknown"} has unusable order metadata.`);
    return json({ error: "Order metadata is incomplete." }, 500);
  }

  const shipping = session.collected_information?.shipping_details;
  const email = clip(session.customer_details?.email || session.customer_email || "", 180);
  if (!email) {
    console.error(`Paid Stripe session ${session.id} has no customer email.`);
    return json({ error: "Customer email is missing." }, 500);
  }
  const buyerName = clip(shipping?.name || session.customer_details?.name || session.customer_details?.individual_name || "Buyer", 160) || "Buyer";
  const address = formatAddress(shipping?.address || session.customer_details?.address);

  const db = database();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO orders (product_id, quantity, buyer_name, buyer_email, address, note, status, paid, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', true, $7)
       ON CONFLICT (stripe_session_id) DO NOTHING
       RETURNING id`,
      [productId, quantity, buyerName, email, address, "Paid through Stripe Checkout.", session.id],
    );
    if (!inserted.rows[0]) {
      await client.query("COMMIT");
      return json({ received: true });
    }

    const locked = await client.query("SELECT stock FROM products WHERE id = $1 FOR UPDATE", [productId]);
    const stock = Number(locked.rows[0]?.stock ?? 0);
    if (stock < quantity) {
      console.error(
        `Paid Stripe session ${session.id} for product ${productId} asked for ${quantity} but only ${stock} remain. Stock will not go below zero.`,
      );
    }
    await client.query("UPDATE products SET stock = $1, updated_at = now() WHERE id = $2", [
      Math.max(0, stock - quantity),
      productId,
    ]);
    await client.query("COMMIT");
    return json({ received: true });
  } catch (error) {
    await client.query("ROLLBACK");
    if (uniqueViolation(error)) return json({ received: true });
    throw error;
  } finally {
    client.release();
  }
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const signingSecret = webhookSecret();
  if (!signingSecret) return json({ error: "Stripe webhook is not configured." }, 500);
  if (!stripeSecret()) return json({ error: "Card checkout is not set up yet." }, 500);

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature." }, 400);

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret());
    event = stripe.webhooks.constructEvent(payload, signature, signingSecret);
  } catch (error) {
    logSafe(error);
    return json({ error: "Invalid signature." }, 400);
  }

  if (event.type !== "checkout.session.completed") return json({ received: true });
  const session = event.data.object;
  if (session.payment_status !== "paid") return json({ received: true });

  try {
    return await recordPaidOrder(session);
  } catch (error) {
    logSafe(error);
    return json({ error: "The order could not be recorded." }, 500);
  }
};
