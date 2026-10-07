-- Clan: tag pendek (2-5 karakter) + nama. Tag tampil sebagai prefix nama saat battle: "BTR Rzfan03".
-- Jalankan SETELAH profiles.sql & admin.sql (create_clan/request_join memakai cek_ban).

create table if not exists public.clans(
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 32),
  tag text not null unique check (tag ~ '^[A-Z0-9]{2,5}$'),
  leader_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now());
alter table public.clans enable row level security;
-- drop dulu supaya file ini boleh dijalankan ulang tanpa error (create policy tidak punya IF NOT EXISTS)
drop policy if exists "clan terbaca semua" on public.clans;
create policy "clan terbaca semua" on public.clans for select using (true);
-- insert/update/hapus lewat RPC security definer saja, jadi tanpa policy tulis untuk klien

alter table public.profiles add column if not exists clan_id uuid references public.clans(id) on delete set null;
create index if not exists profiles_clan_idx on public.profiles(clan_id);

-- role: leader = clans.leader_id, wakil = clans.vice_id, sisanya anggota
alter table public.clans add column if not exists vice_id uuid references public.profiles(id) on delete set null;

-- permintaan gabung: member baru harus di-acc ketua/wakil dulu
create table if not exists public.clan_requests(
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clan_id, user_id));
alter table public.clan_requests enable row level security;
-- baca saja untuk pemohon & pengurus clan; insert/hapus lewat RPC security definer
drop policy if exists "request terbaca pemohon & pengurus" on public.clan_requests;
create policy "request terbaca pemohon & pengurus" on public.clan_requests for select
  using (user_id = auth.uid()
      or clan_id in (select id from clans where leader_id = auth.uid() or vice_id = auth.uid()));
create index if not exists clan_requests_clan_idx on public.clan_requests(clan_id);
create index if not exists clan_requests_user_idx on public.clan_requests(user_id);

-- buat clan: pemain jadi ketua sekaligus anggota pertama
create or replace function public.create_clan(clan_name text, clan_tag text) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); t text; nm text; cid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  nm := trim(clan_name);
  t := upper(regexp_replace(trim(coalesce(clan_tag,'')), '[^A-Za-z0-9]', '', 'g'));
  if char_length(nm) < 3 then raise exception 'Nama clan minimal 3 karakter'; end if;
  if t !~ '^[A-Z0-9]{2,5}$' then raise exception 'Tag 2-5 karakter (huruf/angka)'; end if;
  if exists(select 1 from profiles where id = uid and clan_id is not null) then raise exception 'Kamu sudah punya clan'; end if;
  if exists(select 1 from clans where tag = t) then raise exception 'Tag sudah dipakai clan lain'; end if;
  insert into clans(name, tag, leader_id) values (nm, t, uid) returning id into cid;
  update profiles set clan_id = cid where id = uid;
  delete from clan_requests where user_id = uid;
  return cid;
end $$;

-- batas anggota per clan
create or replace function public.clan_penuh(cid uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from profiles where clan_id = cid) >= 10 then
    raise exception 'Clan penuh (maks 10 anggota)';
  end if;
end $$;

-- ajukan permintaan gabung via tag (belum langsung masuk, nunggu acc)
create or replace function public.request_join(clan_tag text) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); t text; cid uuid; rid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  t := upper(regexp_replace(trim(coalesce(clan_tag,'')), '[^A-Za-z0-9]', '', 'g'));
  select id into cid from clans where tag = t;
  if cid is null then raise exception 'Clan tidak ditemukan'; end if;
  if exists(select 1 from profiles where id = uid and clan_id is not null) then raise exception 'Kamu sudah punya clan'; end if;
  if exists(select 1 from clan_requests where user_id = uid) then raise exception 'Kamu sudah punya permintaan menunggu acc'; end if;
  perform public.clan_penuh(cid);
  insert into clan_requests(clan_id, user_id) values (cid, uid) returning id into rid;
  return rid;
end $$;

-- ketua/wakil menerima permintaan: pemohon resmi jadi anggota
create or replace function public.approve_join(req_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid; tid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  select clan_id, user_id into cid, tid from clan_requests where id = req_id;
  if cid is null then raise exception 'Permintaan tidak ditemukan'; end if;
  if not exists(select 1 from clans where id = cid and (leader_id = uid or vice_id = uid)) then
    raise exception 'Hanya ketua/wakil yang bisa menerima permintaan';
  end if;
  perform public.clan_penuh(cid);
  if exists(select 1 from profiles where id = tid and clan_id is not null) then raise exception 'Pemain sudah punya clan lain'; end if;
  update profiles set clan_id = cid where id = tid;
  delete from clan_requests where user_id = tid;
end $$;

-- ketua/wakil menolak permintaan
create or replace function public.reject_join(req_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  select clan_id into cid from clan_requests where id = req_id;
  if cid is null then raise exception 'Permintaan tidak ditemukan'; end if;
  if not exists(select 1 from clans where id = cid and (leader_id = uid or vice_id = uid)) then
    raise exception 'Hanya ketua/wakil yang bisa menolak permintaan';
  end if;
  delete from clan_requests where id = req_id;
end $$;

-- pemohon membatalkan permintaannya sendiri
create or replace function public.cancel_join(req_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  if not exists(select 1 from clan_requests where id = req_id and user_id = uid) then
    raise exception 'Permintaan tidak ditemukan';
  end if;
  delete from clan_requests where id = req_id;
end $$;

-- join langsung sudah tidak ada: semua jalur lewat request_join + approve_join
drop function if exists public.join_clan(text);

-- keluar clan. Kalau ketua keluar: wakil otomatis jadi ketua, kalau tidak ada
-- wakil pindah ke anggota terlama. Wakil yang keluar otomatis dicopot.
-- clan tanpa anggota tersisa ikut terhapus.
create or replace function public.leave_clan() returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid; lid uuid; vid uuid; nxt uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  select clan_id into cid from profiles where id = uid;
  if cid is null then raise exception 'Kamu tidak punya clan'; end if;
  select leader_id, vice_id into lid, vid from clans where id = cid;
  if uid = lid then
    if vid is not null and exists(select 1 from profiles where id = vid and clan_id = cid and id <> uid) then
      nxt := vid;
    else
      select id into nxt from profiles where clan_id = cid and id <> uid order by created_at, id limit 1;
    end if;
    if nxt is null then delete from clans where id = cid;
    else update clans set leader_id = nxt, vice_id = case when vice_id = nxt then null else vice_id end where id = cid; end if;
  else
    update clans set vice_id = null where id = cid and vice_id = uid;
  end if;
  update profiles set clan_id = null where id = uid;
end $$;

-- ketua menetapkan/mencabut wakil (target = uuid anggota; target null = cabut)
create or replace function public.set_vice(target uuid default null) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  select id into cid from clans where leader_id = uid;
  if cid is null then raise exception 'Hanya ketua clan yang bisa menetapkan wakil'; end if;
  if target is null then
    update clans set vice_id = null where id = cid;
    return;
  end if;
  if target = uid then raise exception 'Ketua tidak perlu jadi wakil'; end if;
  if not exists(select 1 from profiles where id = target and clan_id = cid) then raise exception 'Target bukan anggota clan kamu'; end if;
  update clans set vice_id = target where id = cid;
end $$;

-- ketua/wakil menambah anggota langsung berdasarkan nickname (maks 10)
create or replace function public.add_member(target_nick text) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid; tid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  select id into cid from clans where leader_id = uid or vice_id = uid;
  if cid is null then raise exception 'Hanya ketua/wakil yang bisa menambah anggota'; end if;
  perform public.clan_penuh(cid);
  select id into tid from profiles where lower(nickname) = lower(trim(coalesce(target_nick,''))) limit 1;
  if tid is null then raise exception 'Pemain tidak ditemukan'; end if;
  if exists(select 1 from profiles where id = tid and clan_id = cid) then raise exception 'Sudah anggota clan kamu'; end if;
  if exists(select 1 from profiles where id = tid and clan_id is not null) then raise exception 'Pemain sudah punya clan lain'; end if;
  update profiles set clan_id = cid where id = tid;
  delete from clan_requests where user_id = tid;
  return tid;
end $$;

-- ketua/wakil mengeluarkan anggota
create or replace function public.kick_member(target uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cid uuid;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  select clan_id into cid from profiles where id = uid;
  if cid is null then raise exception 'Kamu tidak punya clan'; end if;
  if not exists(select 1 from clans where id = cid and (leader_id = uid or vice_id = uid)) then
    raise exception 'Hanya ketua/wakil yang bisa mengeluarkan anggota';
  end if;
  if target = uid then raise exception 'Tidak bisa mengeluarkan diri sendiri'; end if;
  if exists(select 1 from clans where id = cid and leader_id = target) then raise exception 'Tidak bisa mengeluarkan ketua'; end if;
  if not exists(select 1 from profiles where id = target and clan_id = cid) then raise exception 'Bukan anggota clan-mu'; end if;
  update profiles set clan_id = null where id = target;
  update clans set vice_id = null where id = cid and vice_id = target;
end $$;

-- clan_penuh hanya dipanggil internal fungsi lain, jadi tidak di-grant ke klien
revoke all on function public.clan_penuh(uuid) from public, anon, authenticated;
revoke all on function public.create_clan(text, text), public.request_join(text), public.approve_join(uuid), public.reject_join(uuid), public.cancel_join(uuid), public.leave_clan(), public.set_vice(uuid), public.add_member(text), public.kick_member(uuid) from public, anon;
grant execute on function public.create_clan(text, text), public.request_join(text), public.approve_join(uuid), public.reject_join(uuid), public.cancel_join(uuid), public.leave_clan(), public.set_vice(uuid), public.add_member(text), public.kick_member(uuid) to authenticated;
