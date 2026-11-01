CREATE TABLE IF NOT EXISTS ai_conversation_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  active_provider TEXT NOT NULL CHECK (active_provider IN ('gemini', 'groq', 'openrouter', 'mistral', 'cohere')),
  model_name TEXT NOT NULL,
  input_payload TEXT NOT NULL,
  output_payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ai_conversation_logs_user_created_idx
  ON ai_conversation_logs(user_id, created_at DESC);
