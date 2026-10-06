-- Marketplace: jual-beli kartu dengan sistem poin. Jalankan SEKALI di SQL Editor Supabase.
-- Saldo awal 20.000 poin per akun. Poin naik dari hasil jual, turun dari beli.

-- ===== poin pada profil =====
alter table public.profiles add column if not exists points int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'points_nonneg') then
    alter table public.profiles add constraint points_nonneg check (points >= 0);
  end if;
end $$;

-- akun baru langsung dapat 20.000 poin
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, nickname, points)
  values(new.id, coalesce(nullif(left(new.raw_user_meta_data->>'full_name',18),''),'Pemain')||'#'||substr(new.id::text,1,4), 20000)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- akun lama yang belum sempat pakai poin disetel juga (sekali dijalankan saat fitur rilis)
update public.profiles set points = 20000 where points = 0;

-- ===== tabel marketplace =====
create table if not exists public.marketplace(
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references public.cards(id) on delete cascade,
  seller_id uuid not null references auth.users on delete cascade,
  price int not null check (price between 100 and 1000000),
  created_at timestamptz not null default now());
create index if not exists marketplace_seller_idx on public.marketplace(seller_id);
alter table public.marketplace enable row level security;
-- akses hanya lewat fungsi security definer di bawah, jadi tanpa policy.

-- riwayat transaksi (tidak untuk dibaca user, cukup dicatat)
create table if not exists public.market_transactions(
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete set null,
  seller_id uuid references auth.users, buyer_id uuid references auth.users,
  price int not null,
  created_at timestamptz not null default now());
alter table public.market_transactions enable row level security;

-- ===== notifikasi in-app =====
create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null, body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now());
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "baca notifikasi sendiri" on public.notifications for select using (auth.uid() = user_id);
-- notif baru masuk lewat fungsi buy_card (security definer), dibaca realtime
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ===== fungsi marketplace =====

-- pasang kartu untuk dijual
create or replace function public.list_card(cid uuid, price int) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  if price < 100 or price > 1000000 then raise exception 'Harga harus antara 100 - 1.000.000 poin'; end if;
  if not exists (select 1 from cards where id = cid and user_id = uid) then
    raise exception 'Kartu ini bukan milikmu';
  end if;
  if exists (select 1 from marketplace where card_id = cid) then
    raise exception 'Kartu ini sudah dipajang di marketplace';
  end if;
  insert into marketplace(card_id, seller_id, price) values(cid, uid, price);
end $$;

-- batalkan jual
create or replace function public.unlist_card(lid uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  delete from marketplace where id = lid and seller_id = uid;
  if not found then raise exception 'List tidak ditemukan'; end if;
end $$;

-- kartu-kartu yang sedang dijual oleh user ini (untuk menu "batal jual")
create or replace function public.market_my_listing() returns setof marketplace
language sql security definer set search_path=public as $$
  select * from marketplace where seller_id = auth.uid() $$;

-- beli kartu. Semua langkah dalam satu transaksi: cek lalu pindah poin, pindah
-- kepemilikan kartu, bersihkan pamer penjual, catat transaksi, kirim notifikasi.
create or replace function public.buy_card(lid uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  m marketplace%rowtype;
  b int; s int; cname text;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  select * into m from marketplace where id = lid for update;
  if m.id is null then raise exception 'Kartu sudah terjual'; end if;
  if uid = m.seller_id then raise exception 'Kamu tidak bisa membeli kartumu sendiri'; end if;
  -- kunci profil pembeli & penjual berurutan supaya dua transaksi silang tidak buntu
  if uid < m.seller_id then
    select points into b from profiles where id = uid for update;
    select points into s from profiles where id = m.seller_id for update;
  else
    select points into s from profiles where id = m.seller_id for update;
    select points into b from profiles where id = uid for update;
  end if;
  if b < m.price then raise exception 'Poin tidak cukup'; end if;
  update profiles set points = b - m.price where id = uid;
  update profiles set points = s + m.price where id = m.seller_id;
  select name into cname from cards where id = m.card_id;
  update cards set user_id = uid where id = m.card_id;
  update profiles set featured_card_ids = array_remove(coalesce(featured_card_ids,'{}'::uuid[]), m.card_id) where id = m.seller_id;
  insert into market_transactions(card_id, seller_id, buyer_id, price) values(m.card_id, m.seller_id, uid, m.price);
  insert into notifications(user_id, title, body) values
    (m.seller_id, 'Kartu terjual', 'Kartu "' || cname || '" telah berhasil terjual!'),
    (uid, 'Pembelian berhasil', 'Selamat! Kartu "' || cname || '" berhasil Anda beli');
  delete from marketplace where id = lid;
end $$;

-- daftar kartu yang dijual + penjualnya (menembus RLS kartu biar bisa dibaca semua pembeli)
create or replace function public.market_listings() returns table(
  id uuid, card_id uuid, price int, created_at timestamptz,
  seller_nickname text, seller_avatar text,
  name text, element text, rarity text, hp int, atk int, def int, spd int,
  skill text, skill_desc text, hue int, image_url text)
language sql security definer set search_path=public as $$
  select m.id, m.card_id, m.price, m.created_at,
         p.nickname, p.avatar,
         c.name, c.element, c.rarity, c.hp, c.atk, c.def, c.spd,
         c.skill, c.skill_desc, c.hue, c.image_url
  from marketplace m
  join cards c on c.id = m.card_id
  join profiles p on p.id = m.seller_id
  order by m.created_at desc limit 100 $$;

create or replace function public.notif_mark_all_read() returns void
language sql security definer set search_path=public as $$
  update notifications set read = true where user_id = auth.uid() $$;

grant execute on function public.list_card(uuid, int) to authenticated;
grant execute on function public.unlist_card(uuid) to authenticated;
grant execute on function public.market_my_listing() to authenticated;
grant execute on function public.buy_card(uuid) to authenticated;
grant execute on function public.market_listings() to authenticated, anon;
grant execute on function public.notif_mark_all_read() to authenticated;