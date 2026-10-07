-- Quest harian + streak, dihitung langsung dari data yang sudah ada (battles & cards),
-- tanpa tabel tambahan. Jalankan SETELAH battles.sql & cards.
create or replace function public.daily_stats() returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid(); w int := 0; m int := 0; sk int := 0; d date;
  days date[] := array(
    select updated_at::date from battles where (p1 = uid or p2 = uid) and status = 'done'
    union select created_at::date from cards where user_id = uid
    order by 1);
begin
  if uid is null then raise exception 'Masuk dulu'; end if;
  select count(*) into w from battles where winner = uid and status = 'done' and updated_at::date = current_date;
  select count(*) into m from cards where user_id = uid and created_at::date = current_date;
  -- streak: berurutan dari aktivitas terakhir (batas maksimal kemarin), mundur per hari.
  select max(day) into d from unnest(days) t(day) where day >= current_date - 1;
  if d is not null then
    while sk < 500 loop
      exit when not (d = any(days));
      sk := sk + 1; d := d - 1;
    end loop;
  end if;
  return jsonb_build_object('wins_today', w, 'made_today', m, 'streak', sk);
end $$;

revoke all on function public.daily_stats from public, anon;
grant execute on function public.daily_stats to authenticated;