-- Run this once in Supabase Dashboard > SQL Editor if chat_history is missing.
-- This migration is safe to run more than once.

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  response jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_history_user_created_at_idx
  on public.chat_history (user_id, created_at asc);

create index if not exists chat_history_turn_id_idx
  on public.chat_history (turn_id, created_at asc);

alter table public.chat_history enable row level security;

drop policy if exists "Users can view their own chat history" on public.chat_history;
create policy "Users can view their own chat history"
  on public.chat_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own chat history" on public.chat_history;
create policy "Users can create their own chat history"
  on public.chat_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat history" on public.chat_history;
create policy "Users can delete their own chat history"
  on public.chat_history for delete
  using (auth.uid() = user_id);

-- Refresh PostgREST's schema cache immediately after the table is created.
notify pgrst, 'reload schema';
