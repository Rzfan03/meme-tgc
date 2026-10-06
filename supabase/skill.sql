-- Skill (jurus khusus kartu, sekali per battle) + spektator battle.
-- Jalankan SETELAH battle.sql & rooms.sql.
-- 1) snap kartu pakai flag skill (sk=true artinya siap dipakai).
-- 2) battle_action dukung aksi 'skill': damage atk*2.2 - def/2, sekali per kartu.
-- 3) Non-peserta boleh membaca battle aktif/selesai (spektator).
-- 4) list_live() untuk daftar battle yang sedang berjalan (tombol mata).

create or replace function public.snap_cards(uid uuid, ids uuid[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s jsonb;
begin
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'element',element,'rarity',rarity,'hp',hp,'max',hp,'atk',atk,'def',def,'spd',spd,'skill',skill,'skill_desc',skill_desc,'hue',hue,'image_url',image_url,'sk',true))
    into s from cards where id = any(ids) and user_id = uid;
  if jsonb_array_length(coalesce(s,'[]'::jsonb)) <> 3 then raise exception 'Pilih tepat 3 kartu milikmu'; end if;
  return s;
end $$;

create or replace function public.battle_action(bid uuid, act text, idx int default 0) returns void
language plpgsql security definer set search_path=public as $$
declare b battles; uid uuid := auth.uid(); me boolean; mc jsonb; fc jsonb; mi int; fi int; a jsonb; d jsonb;
  mult numeric; dmg int; msg text; alive int; over boolean := false; sk boolean;
begin
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

-- Spektator: siapa pun (login) boleh baca battle yang berjalan atau selesai.
drop policy if exists "penonton boleh baca" on public.battles;
create policy "penonton boleh baca" on public.battles for select using (status in ('active','done') and auth.uid() is not null);

-- Daftar battle aktif untuk ditonton (nama / peserta). Nama = nama room, fallback ke anon.
create or replace function public.list_live() returns table(id uuid, name text, p1_name text, p2_name text, created_at timestamptz)
language sql security definer set search_path=public as $$
  select b.id, coalesce(b.name,'Match Cepat'),
         coalesce(u1.raw_user_meta_data->>'full_name','Pemain 1'),
         coalesce(u2.raw_user_meta_data->>'full_name','Pemain 2'),
         b.created_at
  from battles b
  join auth.users u1 on u1.id=b.p1
  left join auth.users u2 on u2.id=b.p2
  where b.status='active'
  order by b.updated_at desc limit 20 $$;

revoke all on function public.list_live from public, anon;
grant execute on function public.list_live to authenticated;