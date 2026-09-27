/**
 * Single-author session auth for the private analytics dashboard.
 *
 * Credentials live only in Netlify env vars:
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD_HASH   scrypt:<salt>:<hash>  (base64url)
 *   SESSION_SECRET
 * The password itself is never stored.
 */
import { createHash, createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = "ct_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  exp: number;
};

function configured(): { email: string; passwordHash: string; secret: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
  const secret = process.env.SESSION_SECRET?.trim() ?? "";
  if (!email || !passwordHash || !secret) return null;
  return { email, passwordHash, secret };
}

export function authConfigured(): boolean {
  return configured() !== null;
}

function emailsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided.trim().toLowerCase()).digest();
  const b = createHash("sha256").update(expected.trim().toLowerCase()).digest();
  return timingSafeEqual(a, b);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "base64url");
    expected = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  if (salt.length < 8 || expected.length < 16) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function credentialsMatch(email: string, password: string): Promise<boolean> {
  const settings = configured();
  if (!settings) return false;
  if (password.length === 0 || password.length > 200) return false;
  const passwordOk = await verifyPassword(password, settings.passwordHash);
  const emailOk = emailsMatch(email, settings.email);
  return emailOk && passwordOk;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSession(email: string): string | null {
  const settings = configured();
  if (!settings) return null;
  const body: SessionPayload = {
    sub: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload, settings.secret)}`;
}

export function readSession(token: string | null | undefined): SessionPayload | null {
  const settings = configured();
  if (!settings || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload, settings.secret);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!emailsMatch(data.sub, settings.email)) return null;
    return data;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

export function sessionFromRequest(req: Request): SessionPayload | null {
  return readSession(readCookie(req, SESSION_COOKIE));
}

export function sessionCookie(token: string, req: Request, maxAge = SESSION_TTL_SECONDS): string {
  const host = new URL(req.url).hostname;
  const secure = host !== "localhost" && host !== "127.0.0.1";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
