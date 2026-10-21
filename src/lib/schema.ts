import { createClient } from '@supabase/supabase-js';
import { appConfig } from '../config/env';
import type { ChatMessage } from '../types';

export const supabaseClient = appConfig.supabaseUrl && appConfig.supabaseAnonKey
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseSchemaSql = `
  create table if not exists profiles (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    full_name text,
    role text default 'operator',
    created_at timestamp with time zone default now()
  );

  create table if not exists user_activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    event_type text not null,
    event_metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now()
  );

  create table if not exists analytics_events (
    id uuid primary key default gen_random_uuid(),
    event_name text not null,
    event_metadata jsonb default '{}'::jsonb,
    occurred_at timestamp with time zone default now()
  );

  create table if not exists chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    title text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
  );

  create table if not exists chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references chat_sessions(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    created_at timestamp with time zone default now()
  );

  create index if not exists idx_activity_user_id on user_activity_logs(user_id);
  create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);
  create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
`;

const CHAT_SESSION_STORAGE_KEY = 'nexora-chat-session-id';

export async function resolveChatSessionId(userId: string): Promise<string> {
  const cachedSessionId = localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
  if (cachedSessionId) {
    return cachedSessionId;
  }

  if (!supabaseClient) {
    const generatedId = crypto.randomUUID();
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, generatedId);
    return generatedId;
  }

  const { data, error } = await supabaseClient
    .from('chat_sessions')
    .insert({ user_id: userId, title: 'NEXORA operations briefing' })
    .select('id')
    .single();

  if (error) {
    console.error('Unable to create chat session:', error);
    const fallbackId = crypto.randomUUID();
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, fallbackId);
    return fallbackId;
  }

  if (data?.id) {
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, data.id);
    return data.id;
  }

  const fallbackId = crypto.randomUUID();
  localStorage.setItem(CHAT_SESSION_STORAGE_KEY, fallbackId);
  return fallbackId;
}

export async function persistChatTurns({
  sessionId,
  turns,
}: {
  sessionId: string;
  turns: ChatMessage[];
}) {
  if (!supabaseClient) {
    return;
  }

  const payload = turns.map((turn) => ({
    session_id: sessionId,
    role: turn.role,
    content: turn.content,
  }));

  const { error } = await supabaseClient.from('chat_messages').insert(payload);

  if (error) {
    console.error('Failed to persist chat turns:', error);
  }
}
