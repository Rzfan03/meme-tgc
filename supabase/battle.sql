create table public.battles(
  id uuid primary key default gen_random_uuid(),
  p1 uuid not null references auth.users, p2 uuid references auth.users,
  p1_cards jsonb not null, p2_cards jsonb,
  p1_active int not null default 0, p2_active int not null default 0,
  turn uuid, status text not null default 'waiting', winner uuid,
  log jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.battles enable row level security;
create policy "peserta baca battle" on public.battles for select using (auth.uid() in (p1, p2));
alter publication supabase_realtime add table public.battles;

create or replace function public.find_match(card_ids uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); snap jsonb; b battles; bid uuid;
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  select id into bid from battles where p1=uid and status='waiting' limit 1;
  if bid is not null then return bid; end if;
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'element',element,'rarity',rarity,'hp',hp,'max',hp,'atk',atk,'def',def,'spd',spd,'skill',skill,'skill_desc',skill_desc,'hue',hue,'image_url',image_url))
    into snap from cards where id = any(card_ids) and user_id = uid;
  if jsonb_array_length(coalesce(snap,'[]'::jsonb)) <> 3 then raise exception 'Pilih tepat 3 kartu milikmu'; end if;
  select * into b from battles where status='waiting' and p1<>uid order by created_at limit 1 for update skip locked;
  if found then
    update battles set p2=uid, p2_cards=snap, status='active', turn=p1, log=log||to_jsonb('Battle dimulai.'::text), updated_at=now() where id=b.id;
    return b.id;
  end if;
  insert into battles(p1,p1_cards) values(uid,snap) returning id into bid;
  return bid;
end $$;

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
revoke all on function public.find_match, public.battle_action from public;
grant execute on function public.find_match, public.battle_action to authenticated;
