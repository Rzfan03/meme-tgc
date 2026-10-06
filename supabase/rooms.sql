-- Jalankan SETELAH battle.sql
create extension if not exists pgcrypto with schema extensions;
alter table public.battles add column if not exists name text, add column if not exists password_hash text;

create or replace function public.snap_cards(uid uuid, ids uuid[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s jsonb;
begin
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'element',element,'rarity',rarity,'hp',hp,'max',hp,'atk',atk,'def',def,'spd',spd,'skill',skill,'skill_desc',skill_desc,'hue',hue,'image_url',image_url))
    into s from cards where id = any(ids) and user_id = uid;
  if jsonb_array_length(coalesce(s,'[]'::jsonb)) <> 3 then raise exception 'Pilih tepat 3 kartu milikmu'; end if;
  return s;
end $$;
revoke all on function public.snap_cards from public, anon, authenticated;

-- quick match hanya untuk battle tanpa nama (bukan room)
create or replace function public.find_match(card_ids uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); snap jsonb; b battles; bid uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
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
  select * into b from battles where id=room_id and status='waiting' and name is not null and created_at > now()-interval '30 minutes' for update;
  if not found then raise exception 'Room sudah tidak tersedia'; end if;
  if b.p1 = uid then raise exception 'Ini room buatanmu sendiri'; end if;
  if b.password_hash is not null and b.password_hash <> extensions.crypt(coalesce(room_password,''), b.password_hash) then raise exception 'Password salah'; end if;
  update battles set p2=uid, p2_cards=snap_cards(uid,card_ids), status='active', turn=p1, log=log||to_jsonb('Battle dimulai.'::text), updated_at=now() where id=room_id;
  return room_id;
end $$;

create or replace function public.cancel_room(room_id uuid) returns void
language sql security definer set search_path=public as $$
  delete from battles where id=room_id and p1=auth.uid() and status='waiting' $$;

create or replace function public.list_rooms() returns table(id uuid, name text, host_name text, has_password boolean, created_at timestamptz)
language sql security definer set search_path=public as $$
  select b.id, b.name, coalesce(u.raw_user_meta_data->>'full_name','Pemain'), b.password_hash is not null, b.created_at
  from battles b join auth.users u on u.id=b.p1
  where b.status='waiting' and b.name is not null and b.created_at > now()-interval '30 minutes'
  order by b.created_at desc limit 50 $$;

revoke all on function public.find_match, public.create_room, public.join_room, public.cancel_room, public.list_rooms from public, anon;
grant execute on function public.find_match, public.create_room, public.join_room, public.cancel_room, public.list_rooms to authenticated;
