import collect from "../netlify/functions/collect";
import checkout from "../netlify/functions/checkout";
import journalPage from "../netlify/functions/journal-page";
import login from "../netlify/functions/login";
import logout from "../netlify/functions/logout";
import media from "../netlify/functions/media";
import orders from "../netlify/functions/orders";
import productPage from "../netlify/functions/product-page";
import content from "../netlify/functions/public";
import stripeWebhook from "../netlify/functions/stripe-webhook";
import studio from "../netlify/functions/studio";
import summary from "../netlify/functions/summary";

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

async function route(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  const method = req.method;

  if (path === "/api/checkout" && method === "POST") return checkout(req);
  if (path === "/api/orders" && method === "POST") return orders(req);
  if (path === "/api/stripe/webhook" && method === "POST") return stripeWebhook(req);
  if (path === "/api/auth/login" && method === "POST") return login(req);
  if (path === "/api/auth/logout" && method === "POST") return logout(req);
  if ((path === "/api/journal" || path === "/api/connect" || path === "/api/products") && method === "GET") return content(req);
  if (path === "/api/analytics/summary" && method === "GET") return summary(req);
  if (path === "/api/analytics/collect" && (method === "POST" || method === "OPTIONS")) return collect(req);
  if (path.startsWith("/api/media/product/") && method === "GET") return media(req);
  if (path === "/api/merch-item" && method === "GET") return productPage(req);
  if (path === "/api/journal-post" && method === "GET") return journalPage(req);
  if (path.startsWith("/api/studio/")) return studio(req);
  return notFound();
}

export function GET(req: Request) {
  return route(req);
}
export function POST(req: Request) {
  return route(req);
}
export function PATCH(req: Request) {
  return route(req);
}
export function DELETE(req: Request) {
  return route(req);
}
export function OPTIONS(req: Request) {
  return route(req);
}
