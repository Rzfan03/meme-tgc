-- Leaderboard global + tantang via room. Jalankan SETELAH rooms.sql & afk.sql.
create or replace function public.leaderboard(lim int default 50) returns table(id uuid, nickname text, avatar text, rating int, wins int, losses int)
language sql security definer set search_path=public as $$
  select p.id, p.nickname, p.avatar, p.rating, p.wins, p.losses
  from profiles p
  order by p.rating desc, p.wins desc
  limit greatest(1, least(lim, 200)) $$;

-- Tantang pemain: buat room waiting bernama tantangan, kirim notifikasi ke target.
create or replace function public.challenge(opponent uuid, card_ids uuid[], room_name text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); bid uuid; oname text;
begin
  perform public.cek_ban();
  if uid is null then raise exception 'Masuk dulu'; end if;
  if opponent is null or opponent = uid then raise exception 'Pilih lawan lain'; end if;
  select nickname into oname from profiles where id=opponent;
  if oname is null then raise exception 'Pemain tidak ditemukan'; end if;
  delete from battles where p1=uid and status='waiting';
  insert into battles(p1,p1_cards,name)
    values(uid, snap_cards(uid,card_ids), coalesce(nullif(trim(room_name),''), 'Tantangan dari '||(select nickname from profiles where id=uid)))
    returning id into bid;
  insert into notifications(user_id, title, body)
    values(opponent, 'Tantangan', 'Kamu ditantang oleh '||(select nickname from profiles where id=uid)||'! Buka room untuk bergabung.');
  return bid;
end $$;

revoke all on function public.leaderboard, public.challenge from public, anon;
grant execute on function public.leaderboard, public.challenge to authenticated;