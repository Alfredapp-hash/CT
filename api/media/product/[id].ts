import handler from "../../../netlify/functions/media";

export function GET(req: Request) {
  return handler(req);
}
