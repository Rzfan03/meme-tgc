-- Profil pemain, statistik, dan indeks. Jalankan SETELAH rooms.sql
create table if not exists public.profiles(
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  wins int not null default 0, losses int not null default 0, rating int not null default 1000,
  avatar text,
  created_at timestamptz not null default now());
alter table public.profiles enable row level security;
-- kalau tabel sudah ada dari versi lama, tambahkan kolomnya (aman diulang)
alter table public.profiles add column if not exists avatar text;
create policy "profil terbaca semua" on public.profiles for select using (true);
create policy "ubah profil sendiri" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
-- pemain hanya boleh mengubah nickname dan avatar, bukan wins/losses/rating
revoke update on public.profiles from authenticated, anon;
grant update (nickname, avatar) on public.profiles to authenticated;
-- avatar disimpan sebagai data URI hasil canvas (webp, sisi 256px, maks ~120KB)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'avatar_is_data_image') then
    alter table public.profiles add constraint avatar_is_data_image check (avatar is null or avatar like 'data:image/%');
  end if;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, nickname)
  values(new.id, coalesce(nullif(left(new.raw_user_meta_data->>'full_name',18),''),'Pemain')||'#'||substr(new.id::text,1,4))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- isi profil untuk akun yang sudah ada
insert into public.profiles(id, nickname)
select id, coalesce(nullif(left(raw_user_meta_data->>'full_name',18),''),'Pemain')||'#'||substr(id::text,1,4) from auth.users on conflict do nothing;

-- statistik otomatis saat battle selesai
create or replace function public.apply_result() returns trigger
language plpgsql security definer set search_path=public as $$
declare loser uuid;
begin
  if new.status='done' and old.status<>'done' and new.winner is not null then
    loser := case when new.winner=new.p1 then new.p2 else new.p1 end;
    update profiles set wins=wins+1, rating=rating+15 where id=new.winner;
    update profiles set losses=losses+1, rating=greatest(0,rating-10) where id=loser;
  end if;
  return new;
end $$;
drop trigger if exists battles_result on public.battles;
create trigger battles_result after update on public.battles for each row execute function public.apply_result();

-- daftar room memakai nickname
create or replace function public.list_rooms() returns table(id uuid, name text, host_name text, has_password boolean, created_at timestamptz)
language sql security definer set search_path=public as $$
  select b.id, b.name, p.nickname, b.password_hash is not null, b.created_at
  from battles b join profiles p on p.id=b.p1
  where b.status='waiting' and b.name is not null and b.created_at > now()-interval '30 minutes'
  order by b.created_at desc limit 50 $$;
revoke all on function public.list_rooms from public, anon;
grant execute on function public.list_rooms to authenticated;

create index if not exists battles_waiting_idx on public.battles(status, created_at);
create index if not exists profiles_rating_idx on public.profiles(rating desc);
