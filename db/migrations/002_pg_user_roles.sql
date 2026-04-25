-- Migration 002: PostgreSQL roles for hosting users with Row Level Security
-- Idempotent: safe to run multiple times.

-- 1. Function that maps the current PostgreSQL login role → hosting user_id
CREATE OR REPLACE FUNCTION current_hosting_user_id() RETURNS INTEGER AS $$
  SELECT user_id FROM ftp_users WHERE ftp_login = session_user LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Enable RLS on all three tables
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftp_users  ENABLE ROW LEVEL SECURITY;

-- 3. Policies: each hosting user sees only their own rows
--    (superuser/root bypasses RLS automatically)
DROP POLICY IF EXISTS hosting_user_self    ON users;
DROP POLICY IF EXISTS hosting_user_domains ON domains;
DROP POLICY IF EXISTS hosting_user_ftp     ON ftp_users;

CREATE POLICY hosting_user_self    ON users     FOR SELECT USING (id = current_hosting_user_id());
CREATE POLICY hosting_user_domains ON domains   FOR SELECT USING (user_id = current_hosting_user_id());
CREATE POLICY hosting_user_ftp     ON ftp_users FOR SELECT USING (user_id = current_hosting_user_id());

-- 4. Create PostgreSQL roles for all existing ftp_users entries
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT ftp_login, ftp_password FROM ftp_users LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rec.ftp_login) THEN
      EXECUTE format(
        'CREATE ROLE %I WITH LOGIN PASSWORD %L',
        rec.ftp_login, rec.ftp_password
      );
    ELSE
      EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', rec.ftp_login, rec.ftp_password);
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), rec.ftp_login);
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', rec.ftp_login);
    EXECUTE format('GRANT SELECT ON users, domains, ftp_users TO %I', rec.ftp_login);
  END LOOP;
END;
$$;