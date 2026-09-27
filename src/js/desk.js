(function () {
  "use strict";
  if (!window.fetch || location.pathname.indexOf("/admin") === 0) return;

  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function pretty(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return months[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
  }
  function hasHref(root, href) {
    return !!root.querySelector('a[href="' + href.replace(/"/g, "") + '"]');
  }

  var list = document.querySelector(".post-list");
  var grid = document.querySelector(".journal-home__grid");
  if (list || grid) {
    fetch("/api/journal", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.posts) return;
        data.posts.forEach(function (post) {
          if (!post.url) return;
          if (list && !hasHref(list, post.url)) {
            var item = document.createElement("li");
            item.className = "post-card";
            var meta = document.createElement("p");
            meta.className = "post-meta";
            var time = document.createElement("time");
            time.dateTime = (post.date || "").slice(0, 10);
            time.textContent = pretty(post.date);
            meta.appendChild(time);
            var heading = document.createElement("h2");
            var link = document.createElement("a");
            link.href = post.url;
            link.textContent = post.title;
            heading.appendChild(link);
            var copy = document.createElement("p");
            copy.textContent = post.description || "";
            var more = document.createElement("a");
            more.className = "card-cta";
            more.href = post.url;
            more.textContent = "Read";
            item.appendChild(meta);
            item.appendChild(heading);
            item.appendChild(copy);
            item.appendChild(more);
            list.insertBefore(item, list.firstChild);
          }
          if (grid && !hasHref(grid, post.url)) {
            var article = document.createElement("article");
            article.className = "panel post-tile";
            var when = document.createElement("p");
            when.className = "post-tile__date";
            when.textContent = pretty(post.date);
            var title = document.createElement("h3");
            title.className = "post-tile__title";
            var titleLink = document.createElement("a");
            titleLink.href = post.url;
            titleLink.textContent = post.title;
            title.appendChild(titleLink);
            article.appendChild(when);
            article.appendChild(title);
            if (post.description) {
              var desc = document.createElement("p");
              desc.className = "post-tile__desc";
              desc.textContent = post.description;
              article.appendChild(desc);
            }
            grid.insertBefore(article, grid.firstChild);
          }
        });
      })
      .catch(function () {});
  }

  var socials = document.querySelector(".footer-list--inline");
  if (socials) {
    fetch("/api/connect", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.links) return;
        data.links.forEach(function (link) {
          if (!link.href || hasHref(socials, link.href)) return;
          var item = document.createElement("li");
          var anchor = document.createElement("a");
          anchor.href = link.href;
          anchor.rel = "me noopener";
          anchor.textContent = link.label;
          item.appendChild(anchor);
          socials.insertBefore(item, socials.firstChild);
        });
      })
      .catch(function () {});
  }
})();
