import handler from "../../netlify/functions/summary";

export function GET(req: Request) {
  return handler(req);
}
