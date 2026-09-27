import handler from "../netlify/functions/public";

export function GET(req: Request) {
  return handler(req);
}
