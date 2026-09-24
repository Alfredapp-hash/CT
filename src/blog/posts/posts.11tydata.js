// Every post keeps its existing .html URL: /blog/posts/<slug>.html
export default {
  layout: "layouts/post.njk",
  tags: ["posts"],
  permalink: "/blog/posts/{{ page.fileSlug }}.html",
  bodyClass: "blog-page",
  ogType: "article",
};
