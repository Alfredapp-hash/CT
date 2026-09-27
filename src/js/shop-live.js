(function () {
  "use strict";
  var mount = document.getElementById("shop-live");
  if (!mount || !window.fetch) return;

  function money(cents, currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
    } catch (e) {
      return "$" + ((cents || 0) / 100).toFixed(2);
    }
  }

  function card(product) {
    var item = document.createElement("li");
    item.className = "product-card" + (product.inStock ? "" : " product-card--out");
    item.setAttribute("data-slug", product.slug);

    var media = document.createElement("a");
    media.className = "product-card__media";
    media.href = product.url;
    media.tabIndex = -1;
    media.setAttribute("aria-hidden", "true");
    if (product.image) {
      var img = document.createElement("img");
      img.src = product.image;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
    } else {
      var blank = document.createElement("span");
      blank.className = "product-card__blank";
      media.appendChild(blank);
    }

    var body = document.createElement("div");
    body.className = "product-card__body";
    var title = document.createElement("h3");
    title.className = "product-card__title";
    var titleLink = document.createElement("a");
    titleLink.href = product.url;
    titleLink.textContent = product.name;
    title.appendChild(titleLink);
    body.appendChild(title);
    if (product.description) {
      var desc = document.createElement("p");
      desc.className = "product-card__desc";
      desc.textContent = product.description;
      body.appendChild(desc);
    }
    var price = document.createElement("p");
    price.className = "product-card__price";
    price.textContent = money(product.priceCents, product.currency);
    if (!product.inStock) {
      var pill = document.createElement("span");
      pill.className = "pill pill--outline";
      pill.textContent = "Sold out";
      price.appendChild(document.createTextNode(" "));
      price.appendChild(pill);
    }
    body.appendChild(price);
    var actions = document.createElement("div");
    actions.className = "product-card__actions";
    var buy = document.createElement("a");
    buy.className = "btn btn--primary btn--small";
    buy.href = product.url;
    buy.textContent = product.inStock ? "Buy" : "View";
    actions.appendChild(buy);
    body.appendChild(actions);

    item.appendChild(media);
    item.appendChild(body);
    return item;
  }

  fetch("/api/products", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data || !data.products || !data.products.length) return;
      var known = {};
      document.querySelectorAll("[data-slug]").forEach(function (node) { known[node.getAttribute("data-slug")] = true; });
      var fresh = data.products.filter(function (product) { return product.slug && !known[product.slug]; });
      if (!fresh.length) return;
      var empty = document.querySelector(".shop-empty");
      if (empty) empty.hidden = true;
      (data.categories || []).forEach(function (category) {
        var items = fresh.filter(function (product) { return product.category === category.key; });
        if (!items.length) return;
        var section = document.createElement("section");
        section.className = "wrap shop-section";
        var head = document.createElement("div");
        head.className = "section-head section-head--rule";
        var eyebrow = document.createElement("p");
        eyebrow.className = "eyebrow";
        eyebrow.textContent = category.label;
        var heading = document.createElement("h2");
        heading.textContent = category.blurb;
        head.appendChild(eyebrow);
        head.appendChild(heading);
        var list = document.createElement("ul");
        list.className = "product-grid";
        list.setAttribute("role", "list");
        items.forEach(function (product) { list.appendChild(card(product)); });
        section.appendChild(head);
        section.appendChild(list);
        mount.appendChild(section);
      });
      mount.hidden = false;
    })
    .catch(function () {});
})();
