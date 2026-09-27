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
  const dated = when
    ? new Date(when).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "";
  const html = page({
    title: String(post.title),
    description: String(post.description || post.title),
    main: `<article class="post-body">
      <p class="post-meta"><time datetime="${when || ""}">${escapeHtml(dated)}</time></p>
      <h1>${escapeHtml(String(post.title))}</h1>
      ${post.body_html || ""}
    </article>
    ${related ? `<section class="related-books"><p class="eyebrow">Books in this post</p><ul><li><a href="/books/${escapeHtml(String(post.related_book))}.html">${escapeHtml(related)}</a></li></ul></section>` : ""}`,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
