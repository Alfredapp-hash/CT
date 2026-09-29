import collect from "../netlify/functions/collect";
import checkout from "../netlify/functions/checkout";
import journalPage from "../netlify/functions/journal-page";
import login from "../netlify/functions/login";
import logout from "../netlify/functions/logout";
import mail from "../netlify/functions/messages";
import media from "../netlify/functions/media";
import orders from "../netlify/functions/orders";
import productPage from "../netlify/functions/product-page";
import content from "../netlify/functions/public";
import stripeWebhook from "../netlify/functions/stripe-webhook";
import studio from "../netlify/functions/studio";
import summary from "../netlify/functions/summary";
import { PRODUCTION_ORIGIN } from "../netlify/functions/_shared/stripe-env";

type NodeResponse = {
  statusCode: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: string | Buffer) => void;
};

type NodeRequest = AsyncIterable<Buffer> & {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined> | Headers;
};

function redact(error: unknown): string {
  const raw = error instanceof Error ? error.message : "The desk could not answer.";
  return raw
    .replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    .slice(0, 180);
}

function publicOrigin(hostHeader: string, proto: string): string {
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() || "";
  const hostname = host.replace(/:\d+$/, "");
  if ((hostname === "localhost" || hostname === "127.0.0.1") && /^[a-z0-9.:-]+$/.test(host)) {
    const safeProto = proto === "http" ? "http" : "https";
    return `${safeProto}://${host}`;
  }
  return PRODUCTION_ORIGIN;
}

function pathnameOf(req: Request): string {
  const url = new URL(req.url);
  const route = url.searchParams.get("route");
  if (route) url.pathname = `/api/${route.replace(/^\/+/, "")}`;
  return url.pathname;
}

async function toRequest(req: Request | NodeRequest): Promise<Request> {
  if (typeof (req.headers as Headers).get === "function") return req as Request;
  const nodeReq = req as NodeRequest;
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const hostHeader = headers.get("x-forwarded-host") || headers.get("host") || "www.booksbycourtney.site";
  const proto = headers.get("x-forwarded-proto") || "https";
  const url = new URL(nodeReq.url || "/", publicOrigin(hostHeader, proto));
  const chunks: Buffer[] = [];
  if (nodeReq.method !== "GET" && nodeReq.method !== "HEAD") {
    for await (const chunk of nodeReq) chunks.push(chunk);
  }
  return new Request(url, {
    method: nodeReq.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

async function dispatch(req: Request): Promise<Response> {
  const path = pathnameOf(req);
  const method = req.method;
  if (path === "/api/health") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (path === "/api/checkout" && method === "POST") return checkout(req);
  if (path === "/api/orders" && method === "POST") return orders(req);
  if (path === "/api/messages" && method === "POST") return mail(req);
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
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

async function write(res: NodeResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

export default async function handler(req: Request | NodeRequest, res?: NodeResponse) {
  const finish = async (response: Response) => {
    if (res && typeof res.end === "function") {
      await write(res, response);
      return;
    }
    return response;
  };
  try {
    return await finish(await dispatch(await toRequest(req)));
  } catch (error) {
    console.error(redact(error));
    return finish(new Response(JSON.stringify({ error: "The desk could not answer." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    }));
  }
}
