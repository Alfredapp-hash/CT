import { readFileSync } from "node:fs";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";

const site = JSON.parse(readFileSync(new URL("./src/_data/site.json", import.meta.url), "utf8"));

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

export default function (eleventyConfig) {
  // Static assets are copied byte-for-byte at the same public paths as today.
  eleventyConfig.addPassthroughCopy({
    "src/css": "css",
    "src/js": "js",
    "src/media": "media",
    "src/admin": "admin",
    "src/robots.txt": "robots.txt",
  });

  // admin/analytics.html is a self-contained dashboard: copied verbatim, never templated or collected.
  eleventyConfig.ignores.add("src/admin/**");

  // RSS: /blog/rss.xml generated from the posts collection (newest first).
  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/blog/rss.xml",
    collection: { name: "posts", limit: 0 },
    metadata: {
      language: "en-us",
      title: site.blog.title,
      subtitle: site.blog.description,
      base: site.url + "/blog/",
      author: { name: site.name },
    },
  });

  // NOTE: the feed plugin's template applies `| reverse` to the collection it is given,
  // so `posts` stays oldest→newest (the feed then emits newest first). Templates that
  // want newest-first use `postsNewest`.
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByTag("posts").sort((a, b) => a.date - b.date)
  );
  eleventyConfig.addCollection("postsNewest", (api) =>
    api.getFilteredByTag("posts").sort((a, b) => b.date - a.date)
  );

  // "March 12, 2026" (UTC so the build is host-timezone independent).
  eleventyConfig.addFilter("readableDate", (value) => {
    const d = toDate(value);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  });
  // "2026-03-12"
  eleventyConfig.addFilter("isoDate", (value) => toDate(value).toISOString().slice(0, 10));
  eleventyConfig.addFilter("bookBySlug", (books, slug) => (books || []).find((b) => b.slug === slug) || null);
  // absoluteUrl(url, base) is provided by @11ty/eleventy-plugin-rss; templates pass site.url as base.
  eleventyConfig.addFilter("bySlugs", (books, slugs) =>
    (slugs || []).map((s) => (books || []).find((b) => b.slug === s)).filter(Boolean)
  );
  eleventyConfig.addFilter("where", (arr, key, value) => (arr || []).filter((x) => x && x[key] === value));
  eleventyConfig.addFilter("year", () => new Date().getUTCFullYear());
  // Retailer links: book.retailers overrides win; otherwise site.retailerTemplates × isbn in fixed order.
  eleventyConfig.addFilter("retailerLinks", (book, isbn) => {
    if (book && Array.isArray(book.retailers)) return book.retailers;
    const code = isbn || (book && book.isbn);
    if (!code) return [];
    return site.retailerTemplates.map((r) => ({ name: r.name, url: r.url.replace("{isbn}", code) }));
  });
  eleventyConfig.addFilter("setAttribute", (obj, key, value) => ({ ...obj, [key]: value }));

  // Sitemap helpers: keep today's ordering (home, blog, posts oldest→newest, books in catalogue order).
  const SITEMAP_EXCLUDE = new Set(["/404.html", "/thank-you.html"]);
  eleventyConfig.addFilter("sitemapPages", (pages) => {
    const books = JSON.parse(readFileSync(new URL("./src/_data/books.json", import.meta.url), "utf8"));
    const bookRank = new Map(books.map((b, i) => [`/books/${b.slug}.html`, i]));
    const rank = (p) => {
      if (p.url === "/") return [0, 0, ""];
      if (p.url === "/blog/") return [1, 0, ""];
      if (p.url.startsWith("/blog/posts/")) return [2, p.date ? p.date.getTime() : 0, p.url];
      if (bookRank.has(p.url)) return [3, bookRank.get(p.url), p.url];
      return [4, 0, p.url];
    };
    return (pages || [])
      .filter((p) => p.url && !p.url.startsWith("/admin") && !SITEMAP_EXCLUDE.has(p.url) && !(p.data && (p.data.excludeFromSitemap || p.data.noindex)) && !p.url.endsWith(".xml"))
      .map((p) => ({ p, r: rank(p) }))
      .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || (a.r[2] < b.r[2] ? -1 : a.r[2] > b.r[2] ? 1 : 0))
      .map((x) => x.p);
  });
  eleventyConfig.addFilter("sitemapUrl", (url, base) => base + url);

  // The feed plugin emits <content:encoded> when a post has `summary` but never declares the
  // content namespace; add it so the RSS stays valid XML.
  eleventyConfig.addTransform("rssContentNamespace", function (content) {
    if (this.page?.outputPath?.endsWith("rss.xml") && !content.includes('xmlns:content=')) {
      return content.replace('<rss version="2.0"', '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    }
    return content;
  });

  eleventyConfig.setServerOptions({ port: 8080 });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
