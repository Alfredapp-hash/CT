import { neon } from "@neondatabase/serverless";

const statements = [
  `CREATE TABLE IF NOT EXISTS journal_posts (
    id serial PRIMARY KEY,
    slug varchar(120) NOT NULL UNIQUE,
    title varchar(220) NOT NULL,
    description text NOT NULL DEFAULT '',
    body text NOT NULL DEFAULT '',
    body_html text NOT NULL DEFAULT '',
    status varchar(20) NOT NULL DEFAULT 'draft',
    related_book varchar(120),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_posts_status_check CHECK (status IN ('draft', 'published'))
  )`,
  `CREATE INDEX IF NOT EXISTS journal_posts_status_published_idx ON journal_posts (status, published_at DESC)`,
  `CREATE TABLE IF NOT EXISTS social_profiles (
    platform varchar(40) PRIMARY KEY,
    label varchar(80) NOT NULL,
    url text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT social_profiles_platform_check CHECK (platform IN ('instagram', 'facebook', 'goodreads', 'amazonAuthor'))
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id serial PRIMARY KEY,
    slug varchar(120) NOT NULL UNIQUE,
    name varchar(180) NOT NULL,
    description text NOT NULL DEFAULT '',
    details text NOT NULL DEFAULT '',
    price_cents integer NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    category varchar(40) NOT NULL DEFAULT 'signed',
    stock integer NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'draft',
    image_alt varchar(180) NOT NULL DEFAULT '',
    has_image boolean NOT NULL DEFAULT false,
    checkout_url text,
    shipping_note text NOT NULL DEFAULT 'Ships from Courtney.',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT products_status_check CHECK (status IN ('draft', 'listed')),
    CONSTRAINT products_category_check CHECK (category IN ('signed', 'apparel', 'home')),
    CONSTRAINT products_price_check CHECK (price_cents >= 0),
    CONSTRAINT products_stock_check CHECK (stock >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id serial PRIMARY KEY,
    product_id integer NOT NULL REFERENCES products (id),
    quantity integer NOT NULL,
    buyer_name varchar(160) NOT NULL,
    buyer_email varchar(180) NOT NULL,
    address text NOT NULL DEFAULT '',
    note text NOT NULL DEFAULT '',
    status varchar(20) NOT NULL DEFAULT 'new',
    paid boolean NOT NULL DEFAULT false,
    stripe_session_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT orders_status_check CHECK (status IN ('new', 'fulfilled', 'cancelled')),
    CONSTRAINT orders_quantity_check CHECK (quantity > 0 AND quantity <= 20)
  )`,
  `CREATE TABLE IF NOT EXISTS social_pieces (
    id serial PRIMARY KEY,
    platform varchar(40) NOT NULL,
    title varchar(180) NOT NULL DEFAULT '',
    caption text NOT NULL DEFAULT '',
    status varchar(20) NOT NULL DEFAULT 'idea',
    related_book varchar(120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT social_pieces_platform_check CHECK (platform IN ('instagram', 'facebook', 'goodreads', 'amazonAuthor')),
    CONSTRAINT social_pieces_status_check CHECK (status IN ('idea', 'drafting', 'ready', 'posted'))
  )`,
  `INSERT INTO social_profiles (platform, label, url)
   VALUES ('facebook', 'Facebook', 'https://www.facebook.com/profile.php?id=61593191562395')
   ON CONFLICT (platform) DO UPDATE SET url = EXCLUDED.url, label = EXCLUDED.label, updated_at = now()`,
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("missing database url");
  process.exit(1);
}
const sql = neon(url);
for (const statement of statements) {
  await sql.query(statement);
}
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log(tables.map((row) => row.table_name).join(","));
