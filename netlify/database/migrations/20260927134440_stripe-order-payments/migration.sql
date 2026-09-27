ALTER TABLE orders ADD COLUMN stripe_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN paid boolean NOT NULL DEFAULT false;
