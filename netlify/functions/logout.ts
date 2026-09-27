/**
 * POST /api/auth/logout — clears the analytics session cookie.
 */
import { sessionCookie } from "./_shared/auth";

export default async (req: Request) => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Set-Cookie": sessionCookie("", req, 0),
    },
  });
};
