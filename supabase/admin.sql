-- Dashboard admin: kelola kartu, pindah kepemilikan, broadcast, ban pemain.
-- Jalankan SETELAH skill.sql & afk.sql (fungsi find_match/join_room/create_room di-recreate di sini).
-- Set admin 1x:  update public.profiles set is_admin = true where email = '...' (lewat inbox_satu admin kalau perlu).

-- ===== kolom admin & ban =====
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists banned boolean not null default false;

-- guard: hanya admin yang bisa lanjut
create or replace function public.cek_admin() returns void
language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Hanya admin';
  end if;
end $$;

-- guard: akun dibekukan admin
create or replace function public.cek_ban() returns void
language plpgsql security definer set search_path=public as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and banned) then
    raise exception 'Akun kamu dibekukan admin';
  end if;
end $$;

-- ===== statistik =====
create or replace function public.admin_stats() returns table(
  total_cards bigint, total_players bigint,
  holy bigint, chaoz bigint, mogger bigint, sampah bigint, tai bigint)
language sql security definer set search_path=public as $$
  select
    (select count(*) from cards),
    (select count(*) from profiles),
    (select count(*) from cards where element='Holy Card'),
    (select count(*) from cards where element='Chaoz'),
    (select count(*) from cards where element='Mogger'),
    (select count(*) from cards where element='Sampah'),
    (select count(*) from cards where element='Tai ayam') $$;

-- ===== daftar kartu (cari nama kartu / pemain) =====
create or replace function public.admin_list_cards(q text default '', kategory text default null, lim int default 100, off int default 0)
returns table(id uuid, name text, element text, hp int, atk int, def int, spd int,
              skill text, skill_desc text, hue int, image_url text, user_id uuid, created_at timestamptz, owner text)
language plpgsql security definer set search_path=public as $$
begin
  perform public.cek_admin();
  return query
    select c.id, c.name, c.element, c.hp, c.atk, c.def, c.spd,
           c.skill, c.skill_desc, c.hue, c.image_url, c.user_id, c.created_at, p.nickname
    from cards c join profiles p on p.id = c.user_id
    where (kategory is null or c.element = kategory)
      and (q = '' or c.name ilike '%'||q||'%' or p.nickname ilike '%'||q||'%' or c.user_id::text like '%'||q||'%')
    order by c.created_at desc
    limit greatest(1, least(lim, 500)) offset greatest(0, off);
end $$;

-- ===== edit kartu (semua field) =====
create or replace function public.admin_update_card(
  cid uuid, new_name text, new_element text,
  new_hp int, new_atk int, new_def int, new_spd int, new_skill text, new_skill_desc text) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform public.cek_admin();
  if length(coalesce(new_name,'')) not between 2 and 40 then raise exception 'Nama 2-40 karakter'; end if;
  if new_hp<1 or new_hp>200 or new_atk<1 or new_atk>100 or new_def<1 or new_def>100 or new_spd<1 or new_spd>100
    then raise exception 'Stat tidak valid (HP 1-200, lainnya 1-100)'; end if;
  update cards
    set name=new_name, element=new_element, rarity=new_element,
        hp=new_hp, atk=new_atk, def=new_def, spd=new_spd,
        skill=coalesce(nullif(new_skill,''),'Serangan Biasa'), skill_desc=coalesce(new_skill_desc,'')
    where id = cid;
  if not found then raise exception 'Kartu tidak ditemukan'; end if;
end $$;

-- ===== hapus kartu =====
create or replace function public.admin_delete_card(cid uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform public.cek_admin();
  delete from cards where id = cid;
  if not found then raise exception 'Kartu tidak ditemukan'; end if;
end $$;

-- ===== pindah kepemilikan ke pemain lain =====
create or replace function public.admin_transfer_card(cid uuid, to_user uuid) returns void
language plpgsql security definer set search_path=public as $$
declare owner uuid; oname text; cname text; tname text;
begin
  perform public.cek_admin();
  select user_id, name into owner, cname from cards where id = cid;
  if owner is null then raise exception 'Kartu tidak ditemukan'; end if;
  select nickname into tname from profiles where id = to_user;
  if tname is null then raise exception 'Pemain tujuan tidak ditemukan'; end if;
  if owner = to_user then raise exception 'Sudah jadi milik pemain itu'; end if;
  -- batalkan penjualan kalau kartu sedang dipajang, lepas dari pameran pemilik lama
  delete from marketplace where card_id = cid;
  update profiles set featured_card_ids = array_remove(coalesce(featured_card_ids,'{}'::uuid[]), cid) where id = owner;
  select nickname into oname from profiles where id = owner;
  update cards set user_id = to_user where id = cid;
  insert into notifications(user_id, title, body) values
    (to_user, 'Kartu diterima', 'Admin memberi kartu "'||cname||'" ke inventory kamu.'),
    (owner, 'Kartu dipindahkan', 'Kartu "'||cname||'" dipindahkan admin ke '||tname||'.');
end $$;

-- ===== cari & set ban pemain =====
create or replace function public.admin_list_players(q text default '')
returns table(id uuid, nickname text, avatar text, wins int, losses int, rating int, points int, is_admin boolean, banned boolean)
language plpgsql security definer set search_path=public as $$
begin
  perform public.cek_admin();
  return query
    select p.id, p.nickname, p.avatar, p.wins, p.losses, p.rating, p.points, p.is_admin, p.banned
    from profiles p
    where q = '' or p.nickname ilike '%'||q||'%' or p.id::text like '%'||q||'%'
    order by p.rating desc
    limit 20;
end $$;

create or replace function public.admin_set_ban(pid uuid, banned boolean) returns void
language plpgsql security definer set search_path=public as $$
declare v_ban boolean := banned;
begin
  perform public.cek_admin();
  if pid = auth.uid() then raise exception 'Tidak bisa ban diri sendiri'; end if;
  update profiles set banned = v_ban where id = pid;
  if not found then raise exception 'Pemain tidak ditemukan'; end if;
end $$;

-- ===== broadcast notifikasi ke semua pemain =====
create or replace function public.admin_broadcast(title text, body text) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform public.cek_admin();
  if coalesce(title,'') = '' or coalesce(body,'') = '' then raise exception 'Judul & isi wajib diisi'; end if;
  insert into notifications(user_id, title, body)
  select id, title, body from profiles;
end $$;

-- ===== penegakan ban di titik masuk =====
create or replace function public.find_match(card_ids uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); snap jsonb; b battles; bid uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.cek_ban();
  perform public.afk_cleanup();
  select id into bid from battles where p1=uid and status='waiting' and name is null limit 1;
  if bid is not null then return bid; end if;
  snap := snap_cards(uid, card_ids);
  select * into b from battles where status='waiting' and name is null and p1<>uid order by created_at limit 1 for update skip locked;
  if found then
    update battles set p2=uid, p2_cards=snap, status='active', turn=p1, log=log||to_jsonb('Battle dimulai.'::text), updated_at=now() where id=b.id;
    return b.id;
  end if;
  insert into battles(p1,p1_cards) values(uid,snap) returning id into bid;
  return bid;
end $$;

create or replace function public.create_room(card_ids uuid[], room_name text, room_password text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); bid uuid; n text := trim(coalesce(room_name,''));
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.cek_ban();
  if length(n) not between 1 and 40 then raise exception 'Nama room harus 1-40 karakter'; end if;
  if length(coalesce(room_password,'')) > 50 then raise exception 'Password maksimal 50 karakter'; end if;
  delete from battles where p1=uid and status='waiting';
  insert into battles(p1,p1_cards,name,password_hash)
    values(uid, snap_cards(uid,card_ids), n, case when coalesce(room_password,'')='' then null else extensions.crypt(room_password, extensions.gen_salt('bf')) end)
    returning id into bid;
  return bid;
end $$;

create or replace function public.join_room(room_id uuid, card_ids uuid[], room_password text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); b battles;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.cek_ban();
  perform public.afk_cleanup();
  select * into b from battles where id=room_id and status='waiting' and name is not null and created_at > now()-interval '30 minutes' for update;
  if not found then raise exception 'Room sudah tidak tersedia'; end if;
  if b.p1 = uid then raise exception 'Ini room buatanmu sendiri'; end if;
  if b.password_hash is not null and b.password_hash <> extensions.crypt(coalesce(room_password,''), b.password_hash) then raise exception 'Password salah'; end if;
  update battles set p2=uid, p2_cards=snap_cards(uid,card_ids), status='active', turn=p1, log=log||to_jsonb('Battle dimulai.'::text), updated_at=now() where id=room_id;
  return room_id;
end $$;

create or replace function public.list_card(cid uuid, price int) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.cek_ban();
  if price < 100 or price > 1000000 then raise exception 'Harga harus antara 100 - 1.000.000 poin'; end if;
  if not exists (select 1 from cards where id = cid and user_id = uid) then
    raise exception 'Kartu ini bukan milikmu';
  end if;
  if exists (select 1 from marketplace where card_id = cid) then
    raise exception 'Kartu ini sudah dipajang di marketplace';
  end if;
  insert into marketplace(card_id, seller_id, price) values(cid, uid, price);
end $$;

create or replace function public.buy_card(lid uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid();
  m marketplace%rowtype;
  b int; s int; cname text;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.cek_ban();
  select * into m from marketplace where id = lid for update;
  if m.id is null then raise exception 'Kartu sudah terjual'; end if;
  if uid = m.seller_id then raise exception 'Kamu tidak bisa membeli kartumu sendiri'; end if;
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

create or replace function public.list_rooms() returns table(id uuid, name text, host_name text, has_password boolean, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  perform public.afk_cleanup();
  return query
    select b.id, b.name, coalesce(p.nickname,'Pemain'), b.password_hash is not null, b.created_at
    from battles b join profiles p on p.id=b.p1
    where b.status='waiting' and b.name is not null and not p.banned and b.created_at > now()-interval '30 minutes'
    order by b.created_at desc limit 50;
end $$;

-- market_listings tidak menampilkan penjual yang di-ban
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
  where not p.banned
  order by m.created_at desc limit 100 $$;

revoke all on function public.admin_stats, public.admin_list_cards, public.admin_update_card,
  public.admin_delete_card, public.admin_transfer_card, public.admin_list_players,
  public.admin_set_ban, public.admin_broadcast from public, anon;
grant execute on function public.admin_stats, public.admin_list_cards, public.admin_update_card,
  public.admin_delete_card, public.admin_transfer_card, public.admin_list_players,
  public.admin_set_ban, public.admin_broadcast to authenticated;

revoke all on function public.find_match, public.create_room, public.join_room,
  public.list_card, public.buy_card, public.market_listings, public.list_rooms from public, anon;
grant execute on function public.find_match, public.create_room, public.join_room,
  public.list_card, public.buy_card, public.market_listings, public.list_rooms to authenticated;
grant execute on function public.market_listings to anon;