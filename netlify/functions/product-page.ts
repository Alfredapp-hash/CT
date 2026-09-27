import { database, iso, query } from "./_shared/content";
import { escapeHtml, renderProse } from "./_shared/prose";
import { page } from "./_shared/shell";
import { stripeConfigured } from "./_shared/stripe-env";

type Row = Record<string, unknown>;

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function checkoutBanner(flag: string | null): string {
  if (flag === "success") {
    return `<p class="form-note" role="status">${escapeHtml("Payment received. Courtney will write about shipping.")}</p>`;
  }
  if (flag === "cancel") {
    return `<p class="form-note" role="status">${escapeHtml("Checkout was canceled. Nothing was charged.")}</p>`;
  }
  return "";
}

export default async (req: Request) => {
  const slug = (new URL(req.url).searchParams.get("slug") || "").replace(/\.html$/, "");
  const db = database();
  const rows = await query<Row>(db.sql`SELECT * FROM products WHERE slug = ${slug} AND status = 'listed' LIMIT 1`);
  const product = rows[0];
  if (!product) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });

  const pageUrl = new URL(req.url);
  const origin = pageUrl.origin;
  const updated = iso(product.updated_at);
  const image = product.has_image ? `${origin}/api/media/product/${product.id}?v=${encodeURIComponent(updated || "")}` : "";
  const name = escapeHtml(String(product.name));
  const price = money(Number(product.price_cents), String(product.currency || "USD"));
  const stock = Number(product.stock);
  const inStock = stock > 0;
  const checkout = typeof product.checkout_url === "string" && product.checkout_url.trim() ? escapeHtml(product.checkout_url) : "";
  const stripeOn = stripeConfigured();
  const maxQuantity = Math.min(20, Math.max(1, stock));
  const details = renderProse(String(product.details || ""));
  const banner = checkoutBanner(pageUrl.searchParams.get("checkout"));
  const buy = checkout
    ? `<a class="btn btn--primary" href="${checkout}">Buy<span class="visually-hidden">: ${name}</span></a>`
    : stripeOn && inStock
      ? `<form class="order-form" id="checkout-form">
          <label>Quantity <input name="quantity" type="number" min="1" max="${maxQuantity}" value="1" required /></label>
          <button class="btn btn--primary" type="submit">Buy<span class="visually-hidden">: ${name}</span></button>
          <p class="form-note" id="checkout-note" hidden></p>
        </form>`
      : !stripeOn && inStock
        ? `<form class="order-form" id="order-form">
          <label>Name <input name="name" autocomplete="name" required /></label>
          <label>Email <input name="email" type="email" autocomplete="email" required /></label>
          <label>Quantity <input name="quantity" type="number" min="1" max="${maxQuantity}" value="1" required /></label>
          <label>Ship to <textarea name="address" required></textarea></label>
          <label>Note <textarea name="note"></textarea></label>
          <button type="submit">Order from Courtney</button>
          <p class="form-note" id="order-note" hidden></p>
        </form>`
        : `<p class="pill pill--outline">Sold out</p>`;

  const html = page({
    title: String(product.name),
    description: String(product.description || product.name),
    extraCss: "shop.css",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: image || undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: product.currency || "USD",
        price: (Number(product.price_cents) / 100).toFixed(2),
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `${origin}/merch/item/${product.slug}`,
      },
    },
    main: `<article class="wrap product-page">
      <p class="eyebrow"><a href="/merch.html">The Shop</a></p>
      <div class="product-page__grid">
        <div class="product-page__photo">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(String(product.image_alt || product.name))}" />` : `<span class="product-card__blank"></span>`}</div>
        <div>
          <h1>${name}</h1>
          <p class="product-page__price">${price}${inStock ? "" : " · Sold out"}</p>
          <p>${escapeHtml(String(product.description || ""))}</p>
          <p class="product-page__ship">${escapeHtml(String(product.shipping_note || ""))}</p>
          ${banner}
          ${buy}
        </div>
      </div>
      <div class="product-page__details post-body">${details}</div>
    </article>
    <script>
      var slug = ${scriptString(String(product.slug))};
      var orderForm = document.getElementById("order-form");
      if (orderForm) orderForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(orderForm);
        var note = document.getElementById("order-note");
        fetch("/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: slug,
            name: data.get("name"),
            email: data.get("email"),
            quantity: Number(data.get("quantity")),
            address: data.get("address"),
            note: data.get("note")
          })
        }).then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
          .then(function (result) {
            note.hidden = false;
            note.textContent = result.ok ? "Order received. Courtney will write back to confirm it." : (result.body.error || "The order could not be sent.");
            if (result.ok) orderForm.reset();
          });
      });
      var checkoutForm = document.getElementById("checkout-form");
      if (checkoutForm) checkoutForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var note = document.getElementById("checkout-note");
        var button = checkoutForm.querySelector("button");
        if (button) button.disabled = true;
        fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: slug, quantity: Number(new FormData(checkoutForm).get("quantity")) })
        }).then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
          .then(function (result) {
            if (result.ok && result.body && typeof result.body.url === "string" && result.body.url.indexOf("https://") === 0) {
              location.href = result.body.url;
              return;
            }
            note.hidden = false;
            note.textContent = (result.body && result.body.error) || "Checkout could not be started.";
            if (button) button.disabled = false;
          }).catch(function () {
            note.hidden = false;
            note.textContent = "Checkout could not be started.";
            if (button) button.disabled = false;
          });
      });
    </script>`,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
