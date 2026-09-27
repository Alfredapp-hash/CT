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

type NodeRequest = AsyncIterable<Buffer> & {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

export default async function handler(req: Request | NodeRequest, res?: { statusCode: number; setHeader: (name: string, value: string | string[]) => void; end: (body?: Buffer) => void }) {
  if (typeof (req.headers as Headers).get === "function") return route(req as Request);
  const nodeReq = req as NodeRequest;
  const hostHeader = nodeReq.headers["x-forwarded-host"] || nodeReq.headers.host || "www.booksbycourtney.site";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protoHeader = nodeReq.headers["x-forwarded-proto"] || "https";
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const url = new URL(nodeReq.url || "/", `${proto}://${host}`);
  const chunks: Buffer[] = [];
  if (nodeReq.method !== "GET" && nodeReq.method !== "HEAD") {
    for await (const chunk of nodeReq) chunks.push(chunk);
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const request = new Request(url, {
    method: nodeReq.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  const response = await route(request);
  if (!res) return response;
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
