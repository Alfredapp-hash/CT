import handler from "../netlify/functions/orders";

export function POST(req: Request) {
  return handler(req);
}
