create table public.cards(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  image_hash text not null, image_url text not null,
  name text not null, element text not null, rarity text not null,
  hp int not null, atk int not null, def int not null, spd int not null,
  skill text not null, skill_desc text not null, hue int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, image_hash));
create index on public.cards(user_id, created_at desc);
alter table public.cards enable row level security;
create policy "baca kartu sendiri" on public.cards for select using (auth.uid() = user_id);
-- insert hanya lewat API server (service role), jadi tanpa policy insert.
