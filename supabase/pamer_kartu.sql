-- Kartu pameran di profil publik. Jalankan di SQL Editor, sekali.
-- Kolom urut (array) uuid: featured_card_ids = kartu yang ditampilkan saat orang melihat profil publik kamu.
alter table public.profiles add column if not exists featured_card_ids uuid[] not null default '{}'::uuid[];
-- pemain boleh menyimpan pilihan pamerannya sendiri (dibedakan dari nickname/avatar)
grant update (featured_card_ids) on public.profiles to authenticated;