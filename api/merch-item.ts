import handler from "../netlify/functions/product-page";

export function GET(req: Request) {
  return handler(req);
}
