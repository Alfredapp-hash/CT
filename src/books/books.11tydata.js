// Every book page keeps its existing .html URL: /books/<slug>.html
export default {
  layout: "layouts/book.njk",
  tags: ["book"],
  permalink: "/books/{{ page.fileSlug }}.html",
  eleventyComputed: {
    book: (data) => (data.books || []).find((b) => b.slug === data.page.fileSlug) || null,
  },
};
