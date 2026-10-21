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
