import handler from "../../netlify/functions/stripe-webhook";

export function POST(req: Request) {
  return handler(req);
}
