import handler from "../../netlify/functions/logout";

export function POST(req: Request) {
  return handler(req);
}
