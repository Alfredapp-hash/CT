/**
 * POST /api/auth/login
 * Body: { "email": "...", "password": "..." }
 * Sets an HttpOnly session cookie on success. The password is checked against
 * ADMIN_PASSWORD_HASH and is never written to logs or the response.
 */
import { authConfigured, createSession, credentialsMatch, sessionCookie } from "./_shared/auth";
import { blocked, clearAttempts, recordAttempt } from "./_shared/limit";
import { browserOriginAllowed } from "./_shared/stripe-env";

const json = (body: unknown, status: number, setCookie?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      ...(setCookie ? { "Set-Cookie": setCookie } : {}),
    },
  });

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!browserOriginAllowed(req)) {
    return json({ error: "Email or password was not accepted." }, 403);
  }
  if (await blocked(req, "login", 12, 15 * 60)) {
    return json({ error: "Try again in a little while." }, 429);
  }
  if (!authConfigured()) {
    return json({ error: "Admin login is not configured on this site." }, 500);
  }

  const raw = await req.text();
  if (raw.length > 2048) {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json({ error: "Try again in a little while." }, 429);
    }
    return json({ error: "Email or password was not accepted." }, 401);
  }

  let email = "";
  let password = "";
  try {
    const body = JSON.parse(raw) as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json({ error: "Try again in a little while." }, 429);
    }
    return json({ error: "Email or password was not accepted." }, 401);
  }

  const accepted = await credentialsMatch(email, password);
  if (!accepted) {
    if (await recordAttempt(req, "login", 12, 15 * 60)) {
      return json({ error: "Try again in a little while." }, 429);
    }
    return json({ error: "Email or password was not accepted." }, 401);
  }
  await clearAttempts(req, "login");

  const token = createSession(email);
  if (!token) {
    return json({ error: "Admin login is not configured on this site." }, 500);
  }

  return json({ ok: true, email: email.trim().toLowerCase() }, 200, sessionCookie(token, req));
};
