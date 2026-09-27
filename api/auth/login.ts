import handler from "../../netlify/functions/login";

export function POST(req: Request) {
  return handler(req);
}
