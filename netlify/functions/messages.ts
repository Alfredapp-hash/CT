import { database, iso, query } from "./_shared/content";
import { json, readJson, text } from "./_shared/http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let ready: Promise<void> | null = null;

export function ensureMessages(): Promise<void> {
  if (!ready) {
    ready = database().sql.query(`CREATE TABLE IF NOT EXISTS messages (
      id serial PRIMARY KEY,
      kind varchar(20) NOT NULL,
      name varchar(160) NOT NULL DEFAULT '',
      email varchar(180) NOT NULL,
      body text NOT NULL DEFAULT '',
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT messages_kind_check CHECK (kind IN ('newsletter', 'note'))
    )`).then(() => undefined).catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function fieldsOf(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await readJson(req);
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  }
  const form = await req.formData();
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

function finish(req: Request, ok: boolean, message: string): Response {
  if ((req.headers.get("accept") || "").includes("application/json")) {
    return json(ok ? { ok: true } : { error: message }, ok ? 200 : 400);
  }
  if (ok) return Response.redirect(new URL("/thank-you.html", req.url), 303);
  return new Response(message, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default async function messages(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const fields = await fieldsOf(req);
    if (text(fields["bot-field"], 200)) return finish(req, true, "");
    const formName = text(fields["form-name"], 40);
    const kind = formName === "notes" ? "note" : formName === "newsletter" ? "newsletter" : "";
    if (!kind) return finish(req, false, "That form was not recognized.");
    const email = text(fields.email, 180).toLowerCase();
    const name = text(fields.name, 160);
    const body = text(fields.message, 4000);
    if (!EMAIL.test(email)) return finish(req, false, "Enter a real email address.");
    if (kind === "note" && (!name || !body)) return finish(req, false, "A name and a note are needed.");
    await ensureMessages();
    const db = database();
    await db.sql`
      INSERT INTO messages (kind, name, email, body)
      VALUES (${kind}, ${name}, ${email}, ${body})
    `;
    return finish(req, true, "");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "letter");
    return finish(req, false, "That could not be saved.");
  }
}

export async function listMessages(): Promise<{ id: number; kind: string; name: string; email: string; body: string; read: boolean; createdAt: string | null }[]> {
  await ensureMessages();
  const rows = await query<Record<string, unknown>>(database().sql`
    SELECT id, kind, name, email, body, read, created_at
    FROM messages ORDER BY created_at DESC LIMIT 100
  `);
  return rows.map((row) => ({
    id: Number(row.id),
    kind: String(row.kind),
    name: String(row.name || ""),
    email: String(row.email || ""),
    body: String(row.body || ""),
    read: row.read === true,
    createdAt: iso(row.created_at),
  }));
}
