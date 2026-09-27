import handler from "../netlify/functions/checkout";

export function POST(req: Request) {
  return handler(req);
}
