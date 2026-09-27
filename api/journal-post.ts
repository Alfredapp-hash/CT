import handler from "../netlify/functions/journal-page";

export function GET(req: Request) {
  return handler(req);
}
