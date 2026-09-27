(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  var gateError = document.getElementById("gate-error");
  var state = { books: [], posts: [], filePosts: [], pieces: [], products: [], orders: [], productId: null, pieceId: null, journalId: null };

  function say(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  function api(path, options) {
    options = options || {};
    options.credentials = "same-origin";
    options.cache = "no-store";
    return fetch(path, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || "Request failed");
        return body;
      });
    });
  }

  function cents(value) {
    var number = Number(String(value).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * 100);
  }

  function dollars(centsValue) {
    return ((centsValue || 0) / 100).toFixed(2);
  }

  function show(view) {
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== view;
    });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      if (button.getAttribute("data-view") === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (view === "numbers") loadNumbers();
  }

  function fillBooks(select) {
    select.innerHTML = '<option value="">None</option>';
    state.books.forEach(function (book) {
      var option = document.createElement("option");
      option.value = book.slug;
      option.textContent = book.title;
      select.appendChild(option);
    });
  }

  function renderJournal() {
    var list = document.getElementById("journal-list");
    list.textContent = "";
    state.filePosts.forEach(function (post) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.className = "row";
      link.href = post.url;
      var title = document.createElement("strong");
      title.textContent = post.title;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = "On the site · " + post.date;
      link.appendChild(title);
      link.appendChild(meta);
      item.appendChild(link);
      list.appendChild(item);
    });
    state.posts.forEach(function (post) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      var title = document.createElement("strong");
      title.textContent = post.title;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = post.status === "published" ? "On the site" : "Draft";
      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", function () { editJournal(post); });
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function editJournal(post) {
    state.journalId = post ? post.id : null;
    document.getElementById("j-title").value = post ? post.title : "";
    document.getElementById("j-slug").value = post ? post.slug : "";
    document.getElementById("j-description").value = post ? post.description : "";
    document.getElementById("j-body").value = post ? post.body : "";
    document.getElementById("j-book").value = post && post.relatedBook ? post.relatedBook : "";
    document.getElementById("j-status").value = post ? post.status : "draft";
    document.getElementById("journal-delete").hidden = !post;
    say("journal-error", "");
  }

  function renderSocial() {
    var list = document.getElementById("social-list");
    list.textContent = "";
    state.pieces.forEach(function (piece) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      var title = document.createElement("strong");
      title.textContent = piece.title || piece.caption.slice(0, 48);
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = piece.platform + " · " + piece.status;
      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", function () {
        state.pieceId = piece.id;
        document.getElementById("c-platform").value = piece.platform;
        document.getElementById("c-title").value = piece.title || "";
        document.getElementById("c-caption").value = piece.caption || "";
        document.getElementById("c-status").value = piece.status;
        document.getElementById("c-book").value = piece.relatedBook || "";
      });
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function renderProducts() {
    var list = document.getElementById("product-list");
    list.textContent = "";
    state.products.forEach(function (product) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      var title = document.createElement("strong");
      title.textContent = product.name;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = (product.status === "listed" ? "Listed" : "Draft") + " · " + dollars(product.priceCents);
      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", function () { editProduct(product); });
      item.appendChild(button);
      list.appendChild(item);
    });
    var open = state.orders.filter(function (order) { return order.status === "new"; }).length;
    document.getElementById("shop-nav").textContent = open ? "Shop · " + open : "Shop";
    document.getElementById("home-orders").textContent = String(open);
    document.getElementById("home-drafts").textContent = String(
      state.posts.filter(function (post) { return post.status !== "published"; }).length
    );
    var orders = document.getElementById("order-list");
    orders.textContent = "";
    if (!state.orders.length) {
      var empty = document.createElement("tr");
      var cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No orders yet.";
      empty.appendChild(cell);
      orders.appendChild(empty);
      return;
    }
    state.orders.forEach(function (order) {
      var row = document.createElement("tr");
      [order.createdAt ? order.createdAt.slice(0, 10) : "", order.productName, order.buyerName + " · " + order.buyerEmail, String(order.quantity)].forEach(function (value) {
        var cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      var action = document.createElement("td");
      if (order.status === "new") {
        var done = document.createElement("button");
        done.type = "button";
        done.className = "quiet";
        done.textContent = "Fulfilled";
        done.addEventListener("click", function () {
          api("/api/studio/orders/" + order.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "fulfilled" }) })
            .then(loadShop);
        });
        action.appendChild(done);
      } else {
        action.textContent = order.status;
      }
      row.appendChild(action);
      var address = document.createElement("tr");
      var note = document.createElement("td");
      note.colSpan = 5;
      note.textContent = order.address + (order.note ? " — " + order.note : "");
      address.appendChild(note);
      orders.appendChild(row);
      orders.appendChild(address);
    });
  }

  function editProduct(product) {
    state.productId = product ? product.id : null;
    document.getElementById("p-name").value = product ? product.name : "";
    document.getElementById("p-price").value = product ? dollars(product.priceCents) : "";
    document.getElementById("p-category").value = product ? product.category : "signed";
    document.getElementById("p-stock").value = product ? product.stock : 1;
    document.getElementById("p-description").value = product ? product.description : "";
    document.getElementById("p-details").value = product ? product.details : "";
    document.getElementById("p-shipping").value = product && product.shippingNote ? product.shippingNote : "Ships from Courtney.";
    document.getElementById("p-checkout").value = product && product.checkoutUrl ? product.checkoutUrl : "";
    document.getElementById("p-status").value = product ? product.status : "draft";
    document.getElementById("p-photo").value = "";
    var preview = document.getElementById("p-preview");
    if (product && product.imageUrl) {
      preview.hidden = false;
      preview.src = product.imageUrl;
      document.getElementById("p-photo-label").textContent = "Replace photograph";
    } else {
      preview.hidden = true;
      preview.removeAttribute("src");
      document.getElementById("p-photo-label").textContent = "Add a photograph";
    }
    document.getElementById("product-delete").hidden = !product;
    say("shop-error", "");
  }

  function renderBooks() {
    var list = document.getElementById("book-list");
    list.textContent = "";
    state.books.forEach(function (book) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.className = "row";
      link.href = "/books/" + book.slug + ".html";
      var title = document.createElement("strong");
      title.textContent = book.title;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = book.year ? String(book.year) : "Book";
      link.appendChild(title);
      link.appendChild(meta);
      item.appendChild(link);
      list.appendChild(item);
    });
  }

  function loadNumbers() {
    var days = document.getElementById("days").value;
    api("/api/analytics/summary?days=" + days).then(function (data) {
      document.getElementById("n-views").textContent = String(data.totals.pageviews || 0);
      document.getElementById("n-pages").textContent = String(data.totals.unique_paths || 0);
      document.getElementById("n-events").textContent = String(data.totals.events || 0);
      document.getElementById("home-views").textContent = String(data.totals.pageviews || 0);
      var chart = document.getElementById("chart");
      chart.textContent = "";
      var peak = (data.daily || []).reduce(function (max, day) { return Math.max(max, day.pageviews); }, 0);
      (data.daily || []).forEach(function (day) {
        var bar = document.createElement("i");
        bar.style.height = peak ? Math.max(2, Math.round((day.pageviews / peak) * 100)) + "%" : "2px";
        bar.title = day.date + ": " + day.pageviews;
        chart.appendChild(bar);
      });
      say("numbers-error", "");
    }).catch(function (error) { say("numbers-error", error.message); });
  }

  function loadShop() {
    return Promise.all([
      api("/api/studio/products"),
      api("/api/studio/orders"),
    ]).then(function (results) {
      state.products = results[0].products || [];
      state.orders = results[1].orders || [];
      renderProducts();
    });
  }

  function openDesk() {
    gate.hidden = true;
    app.hidden = false;
    Promise.all([
      fetch("/admin/catalog.json", { cache: "no-store" }).then(function (response) { return response.json(); }),
      api("/api/studio/posts"),
      api("/api/studio/social"),
      loadShop(),
      loadNumbers(),
    ]).then(function (results) {
      state.books = results[0].books || [];
      state.filePosts = results[0].posts || [];
      state.posts = results[1].posts || [];
      state.pieces = results[2].pieces || [];
      fillBooks(document.getElementById("j-book"));
      fillBooks(document.getElementById("c-book"));
      (results[2].profiles || []).forEach(function (profile) {
        var field = { instagram: "s-instagram", facebook: "s-facebook", goodreads: "s-goodreads", amazonAuthor: "s-amazon" }[profile.platform];
        if (field && profile.url) document.getElementById(field).value = profile.url;
      });
      renderJournal();
      renderSocial();
      renderBooks();
      renderProducts();
    }).catch(function (error) {
      say("gate-error", error.message);
    });
  }

  document.getElementById("gate-form").addEventListener("submit", function (event) {
    event.preventDefault();
    say("gate-error", "");
    api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email-input").value.trim(),
        password: document.getElementById("password-input").value,
      }),
    }).then(function () {
      document.getElementById("password-input").value = "";
      openDesk();
    }).catch(function (error) {
      say("gate-error", error.message);
    });
  });

  document.getElementById("sign-out").addEventListener("click", function () {
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(function () {
      app.hidden = true;
      gate.hidden = false;
    });
  });

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () { show(button.getAttribute("data-view")); });
  });

  document.getElementById("journal-new").addEventListener("click", function () { editJournal(null); });
  document.getElementById("journal-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var payload = {
      title: document.getElementById("j-title").value,
      slug: document.getElementById("j-slug").value,
      description: document.getElementById("j-description").value,
      body: document.getElementById("j-body").value,
      relatedBook: document.getElementById("j-book").value,
      status: document.getElementById("j-status").value,
    };
    var path = state.journalId ? "/api/studio/posts/" + state.journalId : "/api/studio/posts";
    api(path, { method: state.journalId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function () { return api("/api/studio/posts"); })
      .then(function (data) { state.posts = data.posts || []; renderJournal(); say("journal-error", "Saved. The journal updates as soon as a reader opens it."); })
      .catch(function (error) { say("journal-error", error.message); });
  });
  document.getElementById("journal-delete").addEventListener("click", function () {
    if (!state.journalId) return;
    api("/api/studio/posts/" + state.journalId, { method: "DELETE" })
      .then(function () { state.journalId = null; return api("/api/studio/posts"); })
      .then(function (data) { state.posts = data.posts || []; editJournal(null); renderJournal(); })
      .catch(function (error) { say("journal-error", error.message); });
  });

  document.getElementById("profile-form").addEventListener("submit", function (event) {
    event.preventDefault();
    api("/api/studio/profiles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instagram: document.getElementById("s-instagram").value,
        facebook: document.getElementById("s-facebook").value,
        goodreads: document.getElementById("s-goodreads").value,
        amazonAuthor: document.getElementById("s-amazon").value,
      }),
    }).then(function () { say("profile-error", "Saved. The footer picks these up on the next page view."); })
      .catch(function (error) { say("profile-error", error.message); });
  });

  document.getElementById("social-new").addEventListener("click", function () {
    state.pieceId = null;
    document.getElementById("social-form").reset();
  });
  document.getElementById("social-copy").addEventListener("click", function () {
    var caption = document.getElementById("c-caption").value;
    if (navigator.clipboard) navigator.clipboard.writeText(caption);
  });
  document.getElementById("social-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var payload = {
      platform: document.getElementById("c-platform").value,
      title: document.getElementById("c-title").value,
      caption: document.getElementById("c-caption").value,
      status: document.getElementById("c-status").value,
      relatedBook: document.getElementById("c-book").value,
    };
    var path = state.pieceId ? "/api/studio/social/" + state.pieceId : "/api/studio/social";
    api(path, { method: state.pieceId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function () { return api("/api/studio/social"); })
      .then(function (data) { state.pieces = data.pieces || []; renderSocial(); say("social-error", "Saved."); })
      .catch(function (error) { say("social-error", error.message); });
  });

  document.getElementById("p-photo").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var preview = document.getElementById("p-preview");
    preview.hidden = false;
    preview.src = URL.createObjectURL(file);
    document.getElementById("p-photo-label").textContent = file.name;
  });
  document.getElementById("product-new").addEventListener("click", function () { editProduct(null); });
  document.getElementById("product-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var file = document.getElementById("p-photo").files[0];
    var current = state.products.find(function (product) { return product.id === state.productId; });
    var status = document.getElementById("p-status").value;
    if (status === "listed" && !(current && current.hasImage) && !file) {
      say("shop-error", "Add a photograph before this can go on the shop.");
      return;
    }
    var payload = {
      name: document.getElementById("p-name").value,
      priceCents: cents(document.getElementById("p-price").value),
      category: document.getElementById("p-category").value,
      stock: Number(document.getElementById("p-stock").value),
      description: document.getElementById("p-description").value,
      details: document.getElementById("p-details").value,
      shippingNote: document.getElementById("p-shipping").value,
      checkoutUrl: document.getElementById("p-checkout").value,
      status: status === "listed" && !(current && current.hasImage) ? "draft" : status,
    };
    var path = state.productId ? "/api/studio/products/" + state.productId : "/api/studio/products";
    api(path, { method: state.productId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (data) {
        var product = data.product;
        if (!file) return product;
        var body = new FormData();
        body.append("photo", file);
        body.append("alt", product.name);
        return api("/api/studio/products/" + product.id + "/photo", { method: "POST", body: body });
      })
      .then(function (data) {
        if (status !== "listed" || !data.product || data.product.status === "listed") return data;
        return api("/api/studio/products/" + data.product.id, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.assign({}, payload, { status: "listed" })),
        });
      })
      .then(function () { return loadShop(); })
      .then(function () { say("shop-error", "Saved. Listed products show on the Shop page."); })
      .catch(function (error) { say("shop-error", error.message); });
  });
  document.getElementById("product-delete").addEventListener("click", function () {
    if (!state.productId) return;
    api("/api/studio/products/" + state.productId, { method: "DELETE" })
      .then(function () { editProduct(null); return loadShop(); })
      .catch(function (error) { say("shop-error", error.message); });
  });

  document.getElementById("days").addEventListener("change", loadNumbers);
  api("/api/studio/session").then(openDesk).catch(function () {});
})();
