import { bookTitle, database, iso, query } from "./_shared/content";
import { escapeHtml } from "./_shared/prose";
import { page } from "./_shared/shell";

type Row = Record<string, unknown>;

export default async (req: Request) => {
  const slug = (new URL(req.url).searchParams.get("slug") || "").replace(/\.html$/, "");
  const rows = await query<Row>(database().sql`
    SELECT title, description, body_html, related_book, published_at
    FROM journal_posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
  `);
  const post = rows[0];
  if (!post) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  const when = iso(post.published_at);
  const related = bookTitle(post.related_book as string | null);
  const html = page({
    title: String(post.title),
    description: String(post.description || post.title),
    main: `<article class="post-body">
      <p class="post-meta"><time datetime="${when || ""}">${when ? when.slice(0, 10) : ""}</time></p>
      <h1>${escapeHtml(String(post.title))}</h1>
      ${post.body_html}
      ${related ? `<p>Related book: <a href="/books/${escapeHtml(String(post.related_book))}.html">${escapeHtml(related)}</a></p>` : ""}
    </article>`,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
