// Every book page keeps its existing .html URL: /books/<slug>.html
// Step 5 interim: the hand-written pages render verbatim (no layout); step 6 replaces them with books.njk pagination.
export default {
  layout: false,
  tags: ["book"],
  permalink: "/books/{{ page.fileSlug }}.html",
};
