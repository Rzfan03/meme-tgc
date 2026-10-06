-- Tambah kolom avatar (data:image) ke profiles. Aman dijalankan berkali-kali.
-- Jalankan di Supabase Dashboard > SQL Editor.

alter table public.profiles add column if not exists avatar text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'avatar_is_data_image') then
    alter table public.profiles add constraint avatar_is_data_image check (avatar is null or avatar like 'data:image/%');
  end if;
end $$;

-- pemain boleh mengubah nickname dan avatar, tapi bukan wins/losses/rating
revoke update on public.profiles from authenticated, anon;
grant update (nickname, avatar) on public.profiles to authenticated;
