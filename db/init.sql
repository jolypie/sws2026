CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain      VARCHAR(190) UNIQUE NOT NULL,
  name        VARCHAR(100),
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ftp_users (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ftp_login    VARCHAR(64) UNIQUE NOT NULL,
  ftp_password VARCHAR(255) NOT NULL,
  ftp_dir      VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);
