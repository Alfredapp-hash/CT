/**
 * Unpaid order intake for shop products that Courtney fulfills herself.
 * Used only when Stripe is not configured. Card numbers are never accepted.
 * A checkout link, when set, is the payment path.
 */
import { database, isCatalogBook } from "./_shared/content";
import { json, readJson, text } from "./_shared/http";
import { stripeConfigured } from "./_shared/stripe-env";

export default async (req: Request) => {
  if (stripeConfigured()) {
    return json({ error: "This piece is purchased through checkout." }, 400);
  }
  try {
    const body = await readJson(req);
    const slug = text(body.slug, 120);
    const name = text(body.name, 160);
    const email = text(body.email, 180);
    const address = text(body.address, 500);
    const note = text(body.note, 800);
    const quantity = body.quantity;
    if (isCatalogBook(slug)) return json({ error: "Books are bought from the retailers on the book page." }, 400);
    if (!slug || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !address) {
      return json({ error: "Add your name, email, and where it should ship." }, 400);
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json({ error: "Choose a quantity between 1 and 20." }, 400);
    }

    const db = database();
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        "SELECT id, stock, checkout_url, status FROM products WHERE slug = $1 FOR UPDATE",
        [slug],
      );
      const product = found.rows[0] as { id: number; stock: number; checkout_url: string | null; status: string } | undefined;
      if (!product || product.status !== "listed") {
        await client.query("ROLLBACK");
        return json({ error: "That piece is not on the shop." }, 404);
      }
      if (product.checkout_url) {
        await client.query("ROLLBACK");
        return json({ error: "This piece is purchased through its checkout link." }, 400);
      }
      if (product.stock < quantity) {
        await client.query("ROLLBACK");
        return json({ error: "There are not that many left." }, 409);
      }
      await client.query("UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2", [quantity, product.id]);
      const inserted = await client.query(
        `INSERT INTO orders (product_id, quantity, buyer_name, buyer_email, address, note)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [product.id, quantity, name, email, address, note],
      );
      await client.query("COMMIT");
      return json({ ok: true, orderId: inserted.rows[0].id }, 201);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return json({ error: "The order could not be saved." }, 503);
  }
};
