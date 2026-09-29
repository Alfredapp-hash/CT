/**
 * Public reads for the journal, social links, and the shop.
 * Only published pieces and listed products are returned.
 */
import { PLATFORM_LABELS, PLATFORMS, bookTitle, database, iso, query } from "./_shared/content";
import { json } from "./_shared/http";

type Row = Record<string, unknown>;

export default async (req: Request) => {
  const url = new URL(req.url);
  try {
    const db = database();
    if (url.pathname === "/api/journal") {
      const rows = await query<Row>(db.sql`
        SELECT slug, title, description, related_book, published_at
        FROM journal_posts WHERE status = 'published'
        ORDER BY published_at DESC
      `);
      return json({
        posts: rows.map((row) => ({
          slug: row.slug,
          title: row.title,
          description: row.description,
          date: iso(row.published_at),
          url: `/blog/posts/${row.slug}.html`,
          relatedBook: row.related_book,
          relatedTitle: bookTitle(row.related_book as string | null),
        })),
      });
    }
    if (url.pathname === "/api/connect") {
      const rows = await query<Row>(db.sql`SELECT platform, url FROM social_profiles WHERE url IS NOT NULL`);
      const links = PLATFORMS.flatMap((platform) => {
        const row = rows.find((item) => item.platform === platform);
        return row?.url ? [{ label: PLATFORM_LABELS[platform], href: String(row.url) }] : [];
      });
      return json({ links });
    }
    const rows = await query<Row>(db.sql`
      SELECT id, slug, name, description, price_cents, currency, category, stock, has_image, image_alt, updated_at
      FROM products WHERE status = 'listed' ORDER BY name
    `);
    return json({
      categories: [
        { key: "signed", label: "Signed copies", blurb: "Signed books, and the baskets sent from Courtney." },
        { key: "apparel", label: "Apparel", blurb: "The Bookworm cap, and room for more." },
        { key: "home", label: "For the reading nook", blurb: "Handmade pieces for the shelf." },
      ],
      products: rows.map((row) => {
        const updated = iso(row.updated_at);
        return {
          slug: row.slug,
          name: row.name,
          description: row.description,
          priceCents: row.price_cents,
          currency: row.currency,
          category: row.category,
          inStock: Number(row.stock) > 0,
          image: row.has_image ? `/api/media/product/${row.id}?v=${encodeURIComponent(updated || "")}` : null,
          imageAlt: row.image_alt || row.name,
          url: `/merch/item/${row.slug}`,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return json({ posts: [], links: [], products: [], categories: [] });
  }
};
