CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT,
  password_hash TEXT,
  password_iterations INTEGER,
  google_subject TEXT UNIQUE,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key_hash TEXT PRIMARY KEY NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS auth_oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;
