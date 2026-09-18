-- Run this once in Supabase Dashboard > SQL Editor.
-- Authentication users are managed by Supabase Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  response jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_history_user_created_at_idx
  on public.analysis_history (user_id, created_at desc);

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

alter table public.profiles enable row level security;
alter table public.analysis_history enable row level security;
alter table public.chat_history enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can view their own history" on public.analysis_history;
create policy "Users can view their own history"
  on public.analysis_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own history" on public.analysis_history;
create policy "Users can create their own history"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own history" on public.analysis_history;
create policy "Users can delete their own history"
  on public.analysis_history for delete
  using (auth.uid() = user_id);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
