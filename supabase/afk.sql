-- Bersihkan battle yang menggantung (AFK): hapus active battle yang
-- tidak ada aktivitas > 5 menit. Jalankan SETELAH skill.sql & rooms.sql
-- (file ini recreate find_match, join_room, battle_action, list_rooms,
-- jadi harus memuat semua logika tepa dari versi sebelumnya).

create or replace function public.afk_cleanup() returns void
language plpgsql security definer set search_path=public as $$
declare n int;
begin
  -- pakai CTE: deleting...returning into (tanpa CTE) error kalau menghapus >1 baris
  with del as (delete from battles where status='active' and updated_at < now()-interval '5 minutes' returning id)
  select count(*) into n from del;
  if n > 0 then raise notice 'afk_cleanup: % battle dihapus', n; end if;
end $$;
revoke all on function public.afk_cleanup from public, anon;
grant execute on function public.afk_cleanup to authenticated;

-- find_match (versi rooms.sql) + cleanup di awal
create or replace function public.find_match(card_ids uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); snap jsonb; b battles; bid uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
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

-- join_room (versi rooms.sql) + cleanup di awal
create or replace function public.join_room(room_id uuid, card_ids uuid[], room_password text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); b battles;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  perform public.afk_cleanup();
  select * into b from battles where id=room_id and status='waiting' and name is not null and created_at > now()-interval '30 minutes' for update;
  if not found then raise exception 'Room sudah tidak tersedia'; end if;
  if b.p1 = uid then raise exception 'Ini room buatanmu sendiri'; end if;
  if b.password_hash is not null and b.password_hash <> extensions.crypt(coalesce(room_password,''), b.password_hash) then raise exception 'Password salah'; end if;
  update battles set p2=uid, p2_cards=snap_cards(uid,card_ids), status='active', turn=p1, log=log||to_jsonb('Battle dimulai.'::text), updated_at=now() where id=room_id;
  return room_id;
end $$;

-- battle_action (versi skill.sql) + cleanup di awal
create or replace function public.battle_action(bid uuid, act text, idx int default 0) returns void
language plpgsql security definer set search_path=public as $$
declare b battles; uid uuid := auth.uid(); me boolean; mc jsonb; fc jsonb; mi int; fi int; a jsonb; d jsonb;
  mult numeric; dmg int; msg text; alive int; over boolean := false; sk boolean;
begin
  perform public.afk_cleanup();
  select * into b from battles where id=bid for update;
  if not found or b.status<>'active' then raise exception 'Battle tidak aktif'; end if;
  if b.turn is distinct from uid then raise exception 'Bukan giliranmu'; end if;
  me := (uid=b.p1);
  mc := case when me then b.p1_cards else b.p2_cards end; fc := case when me then b.p2_cards else b.p1_cards end;
  mi := case when me then b.p1_active else b.p2_active end; fi := case when me then b.p2_active else b.p1_active end;
  if act='swap' then
    if idx<0 or idx>2 or idx=mi or (mc->idx->>'hp')::int<=0 then raise exception 'Ganti kartu tidak valid'; end if;
    mi := idx; msg := 'Ganti ke '||(mc->idx->>'name');
  else
    a := mc->mi; d := fc->fi;
    if act='skill' then
      sk := coalesce((a->>'sk')::boolean, false);
      if not sk then raise exception 'Skill sudah dipakai kartu ini'; end if;
      dmg := greatest(8, round((a->>'atk')::int*2.2 - (d->>'def')::int/2.0 + random()*4)::int);
      a := jsonb_set(a,'{sk}',to_jsonb(false)); mc := jsonb_set(mc, array[mi::text], a);
      msg := (a->>'name')||' pakai '||(a->>'skill')||' — '||dmg||' damage';
    else
      if act<>'attack' then raise exception 'Aksi tidak dikenal'; end if;
      mult := case
        when (case a->>'element' when 'Holy Card' then 'Mogger' when 'Mogger' then 'Chaoz' when 'Chaoz' then 'Sampah' when 'Sampah' then 'Tai ayam' else 'Holy Card' end) = d->>'element' then 1.5
        when (case d->>'element' when 'Holy Card' then 'Mogger' when 'Mogger' then 'Chaoz' when 'Chaoz' then 'Sampah' when 'Sampah' then 'Tai ayam' else 'Holy Card' end) = a->>'element' then 0.7
        else 1 end;
      dmg := greatest(4, round((a->>'atk')::int*mult - (d->>'def')::int/2.0 + random()*4)::int);
      msg := (a->>'name')||' menyerang '||dmg||' damage'||case when mult>1 then ' (efektif)' when mult<1 then ' (kurang efektif)' else '' end;
    end if;
    d := jsonb_set(d,'{hp}',to_jsonb(greatest(0,(d->>'hp')::int-dmg)));
    fc := jsonb_set(fc,array[fi::text],d);
    if (d->>'hp')::int<=0 then
      msg := msg||'. '||(d->>'name')||' tumbang';
      select count(*) into alive from jsonb_array_elements(fc) e where (e->>'hp')::int>0;
      if alive=0 then over := true; msg := msg||'. '||'Pemenang ditentukan!';
      else select (t.i-1)::int into fi from jsonb_array_elements(fc) with ordinality t(e,i) where (t.e->>'hp')::int>0 order by t.i limit 1; end if;
    end if;
  end if;
  update battles set
    p1_cards=case when me then mc else fc end, p2_cards=case when me then fc else mc end,
    p1_active=case when me then mi else fi end, p2_active=case when me then fi else mi end,
    turn=case when over then turn when me then p2 else p1 end,
    status=case when over then 'done' else 'active' end, winner=case when over then uid end,
    log=log||to_jsonb(msg), updated_at=now() where id=bid;
end $$;

-- list_rooms (versi rooms.sql) + cleanup di awal (room basi juga hilang dari daftar)
create or replace function public.list_rooms() returns table(id uuid, name text, host_name text, has_password boolean, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  perform public.afk_cleanup();
  return query
    select b.id, b.name, coalesce(u.raw_user_meta_data->>'full_name','Pemain'), b.password_hash is not null, b.created_at
    from battles b join auth.users u on u.id=b.p1
    where b.status='waiting' and b.name is not null and b.created_at > now()-interval '30 minutes'
    order by b.created_at desc limit 50;
end $$;

revoke all on function public.find_match, public.join_room, public.battle_action, public.list_rooms from public, anon;
grant execute on function public.find_match, public.join_room, public.battle_action, public.list_rooms to authenticated;