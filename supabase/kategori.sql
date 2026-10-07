-- Sistem kategori: element = kategori dari total stat (Holy Card .. Tai ayam).
-- Jalankan SEKALI untuk mengklasifikasikan ulang semua kartu lama.

-- Fungsi klasifikasi (mirror lib/game.ts kategoriDariStat)
create or replace function public.kategori_stat(hp int, atk int, def int, spd int)
returns text language sql immutable as $$
  select case
    when hp + atk + def + spd >= 189 and least(atk, def, spd) >= 28 and hp >= 59 then 'Holy Card'
    when hp + atk + def + spd >= 179 then 'Chaoz'
    when hp + atk + def + spd >= 168 then 'Mogger'
    when hp + atk + def + spd >= 156 then 'Sampah'
    else 'Tai ayam'
  end
$$;
grant execute on function public.kategori_stat(int, int, int, int) to authenticated;

-- Klasifikasi ulang semua kartu lama dari stat; rarity ikut seragam dengan element.
update public.cards
set element = public.kategori_stat(hp, atk, def, spd),
    rarity  = public.kategori_stat(hp, atk, def, spd);