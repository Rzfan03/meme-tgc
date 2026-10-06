-- Perbaikan list_card (parameter card_id bentrok dengan kolom marketplace.card_id).
-- Copy & jalankan SEKALI di SQL Editor Supabase.
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