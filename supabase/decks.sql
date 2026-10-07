-- Simpan komposisi 3 kartu. Jalankan SETELAH rooms.sql / afk.sql (butuh pgcrypto dari rooms.sql)
create table if not exists public.decks(
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  card_ids uuid[] not null,
  created_at timestamptz not null default now());
alter table public.decks enable row level security;
create policy "deck milik sendiri" on public.decks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.decks to authenticated;