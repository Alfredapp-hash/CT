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

function withPath(req: Request): Request {
  const url = new URL(req.url);
  const route = url.searchParams.get("route");
  if (!route) return req;
  url.pathname = `/api/${route.replace(/^\/+/, "")}`;
  return new Request(url, req);
}

async function route(req: Request): Promise<Response> {
  const directed = withPath(req);
  const path = new URL(directed.url).pathname;
  const method = directed.method;

  if (path === "/api/checkout" && method === "POST") return checkout(directed);
  if (path === "/api/orders" && method === "POST") return orders(directed);
  if (path === "/api/stripe/webhook" && method === "POST") return stripeWebhook(directed);
  if (path === "/api/auth/login" && method === "POST") return login(directed);
  if (path === "/api/auth/logout" && method === "POST") return logout(directed);
  if ((path === "/api/journal" || path === "/api/connect" || path === "/api/products") && method === "GET") return content(directed);
  if (path === "/api/analytics/summary" && method === "GET") return summary(directed);
  if (path === "/api/analytics/collect" && (method === "POST" || method === "OPTIONS")) return collect(directed);
  if (path.startsWith("/api/media/product/") && method === "GET") return media(directed);
  if (path === "/api/merch-item" && method === "GET") return productPage(directed);
  if (path === "/api/journal-post" && method === "GET") return journalPage(directed);
  if (path.startsWith("/api/studio/")) return studio(directed);
  return notFound();
}

function fail(error: unknown): Response {
  const raw = error instanceof Error ? error.message : "The desk could not answer.";
  const message = raw.replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]").slice(0, 180);
  console.error(message);
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

type NodeRequest = AsyncIterable<Buffer> & {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

async function toRequest(req: Request | NodeRequest): Promise<Request> {
  if (typeof (req.headers as Headers).get === "function") return req as Request;
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
  return new Request(url, {
    method: nodeReq.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

async function send(res: { statusCode: number; setHeader: (name: string, value: string | string[]) => void; end: (body?: Buffer) => void }, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

export default async function handler(req: Request | NodeRequest, res?: { statusCode: number; setHeader: (name: string, value: string | string[]) => void; end: (body?: Buffer) => void }) {
  try {
    const request = await toRequest(req);
    const response = await route(request);
    if (res) return send(res, response);
    return response;
  } catch (error) {
    const response = fail(error);
    if (res) return send(res, response);
    return response;
  }
}
