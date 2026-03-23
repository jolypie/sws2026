-- Migration 001: JWT auth + multi-domain support
-- Safe to run on an existing database — no data is lost.
-- Idempotent: running this script multiple times has no side effects.

-- 1. Create the domains table (links users to their hosted domains)
CREATE TABLE IF NOT EXISTS domains (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain      VARCHAR(190) UNIQUE NOT NULL,
  name        VARCHAR(100),
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 2. Move existing domains from users.domain → domains table
INSERT INTO domains (user_id, domain, created_at)
SELECT id, domain, created_at
FROM users
WHERE domain IS NOT NULL
ON CONFLICT (domain) DO NOTHING;

-- 3. Add name/description columns if the table already existed without them
ALTER TABLE domains ADD COLUMN IF NOT EXISTS name        VARCHAR(100);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Add user_id to ftp_users (links each FTP account to a portal user)
ALTER TABLE ftp_users
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 5. Populate user_id in ftp_users by matching ftp_dir → users.domain
--    ftp_dir format: /home/ftpusers/{domain}
UPDATE ftp_users f
SET user_id = u.id
FROM users u
WHERE f.ftp_dir = '/home/ftpusers/' || u.domain
  AND f.user_id IS NULL;

-- 6. Remove the domain column from users (data is now in the domains table)
ALTER TABLE users DROP COLUMN IF EXISTS domain;
