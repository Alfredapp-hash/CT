import handler from "../../netlify/functions/collect";

export function POST(req: Request) {
  return handler(req);
}

export function OPTIONS(req: Request) {
  return handler(req);
}
