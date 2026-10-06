-- Migrasi final elemen: label lama -> nama resmi, urut dari paling kuat:
--   Cringe -> Holy Card (hijau), Dank -> Chaoz (biru), Wholesome -> Mogger (ungu),
--   Sus -> Sampah (oranye), Chaos -> Tai ayam (abu)
-- Aman dijalankan BERULANG: setiap label lama hanya dipetakan sekali.

-- 1) Data kartu milik pemain
update public.cards
   set element = case element
     when 'Cringe'    then 'Holy Card'
     when 'Wholesome' then 'Mogger'
     when 'Dank'      then 'Chaoz'
     when 'Chad'      then 'Chaoz'
     when 'Sus'       then 'Sampah'
     when 'Chaos'     then 'Tai ayam'
     else element
   end
 where element in ('Cringe','Wholesome','Dank','Chad','Sus','Chaos');

-- 2) Rumus damage di battle_action (elemen di-hardcode di dalam fungsi)
create or replace function public.battle_action(bid uuid, act text, idx int default 0) returns void
language plpgsql security definer set search_path=public as $$
declare b battles; uid uuid := auth.uid(); me boolean; mc jsonb; fc jsonb; mi int; fi int; a jsonb; d jsonb;
  mult numeric; dmg int; msg text; alive int; over boolean := false;
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
  elsif act='attack' then
    a := mc->mi; d := fc->fi;
    mult := case
      when (case a->>'element' when 'Holy Card' then 'Mogger' when 'Mogger' then 'Chaoz' when 'Chaoz' then 'Sampah' when 'Sampah' then 'Tai ayam' else 'Holy Card' end) = d->>'element' then 1.5
      when (case d->>'element' when 'Holy Card' then 'Mogger' when 'Mogger' then 'Chaoz' when 'Chaoz' then 'Sampah' when 'Sampah' then 'Tai ayam' else 'Holy Card' end) = a->>'element' then 0.7
      else 1 end;
    dmg := greatest(4, round((a->>'atk')::int*mult - (d->>'def')::int/2.0 + random()*4)::int);
    d := jsonb_set(d,'{hp}',to_jsonb(greatest(0,(d->>'hp')::int-dmg)));
    fc := jsonb_set(fc,array[fi::text],d);
    msg := (a->>'name')||' menyerang '||dmg||' damage';
    if (d->>'hp')::int<=0 then
      msg := msg||'. '||(d->>'name')||' tumbang';
      select count(*) into alive from jsonb_array_elements(fc) e where (e->>'hp')::int>0;
      if alive=0 then over := true; msg := msg||'. '||'Pemenang ditentukan!';
      else select (t.i-1)::int into fi from jsonb_array_elements(fc) with ordinality t(e,i) where (t.e->>'hp')::int>0 order by t.i limit 1; end if;
    end if;
  else raise exception 'Aksi tidak dikenal'; end if;
  update battles set
    p1_cards=case when me then mc else fc end, p2_cards=case when me then fc else mc end,
    p1_active=case when me then mi else fi end, p2_active=case when me then fi else mi end,
    turn=case when over then turn when me then p2 else p1 end,
    status=case when over then 'done' else 'active' end, winner=case when over then uid end,
    log=log||to_jsonb(msg), updated_at=now() where id=bid;
end $$;

revoke all on function public.battle_action from public;
grant execute on function public.battle_action to authenticated;

-- 3) Catatan: battle yang masih berjalan saat migration disalin memakai nama lama
--    di jsonb p1_cards/p2_cards. Fungsi memakai else 'Holy Card', jadi kartu lama
--    sementara dianggap Holy Card sampai battle itu selesai (hitungan menit).