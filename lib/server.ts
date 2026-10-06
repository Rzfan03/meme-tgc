import { createClient } from '@supabase/supabase-js'
import type { CardData } from '@/lib/game'
// RLS `cards` hanya mengizinkan owner membaca, jadi halaman pamer + og-image
// harus lewat service role di server. Id kartu = UUID acak, tidak bisa ditebak.
export const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const FIELDS = 'id,name,element,rarity,hp,atk,def,spd,skill,skill_desc,image_url,hue,user_id,created_at'
export type Pemilik = { nickname: string; avatar: string | null; wins: number; losses: number; rating: number } | null
export async function kartuPublic(id: string) {
  const { data } = await admin.from('cards').select(FIELDS).eq('id', id).maybeSingle()
  return data
}

// Profil pemilik kartu untuk halaman pamer. profiles terbaca publik (RLS select using true),
// tapi tetap lewat service role supaya satu jalur data saja di server.
export async function pemilikPublic(userId: string): Promise<Pemilik> {
  const { data } = await admin.from('profiles').select('nickname,avatar,wins,losses,rating').eq('id', userId).maybeSingle()
  return (data as Pemilik) ?? null
}

// Halaman profil publik: beberapa kartu terbaru pemain, dibaca lewat service role.
export async function koleksiPublik(userId: string, limit = 6): Promise<CardData[]> {
  const { data } = await admin.from('cards').select(FIELDS).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
  return (data as CardData[]) ?? []
}

// Kartu yang dipamerkan pemain di profilnya (urut sesuai urutan drag). Kalau kolom
// featured_card_ids belum ada / kosong, kembalikan null agar halaman fallback ke
// koleksiPublik. Aman di DB lama yang belum jalanin supabase/pamer_kartu.sql.
export async function kartuPamer(userId: string): Promise<CardData[] | null> {
  const { data, error } = await admin.from('profiles').select('featured_card_ids').eq('id', userId).maybeSingle()
  const ids = (data as { featured_card_ids?: string[] })?.featured_card_ids
  if (error || !ids?.length) return null
  const { data: cards } = await admin.from('cards').select(FIELDS).in('id', ids)
  if (!cards?.length) return null
  const byId = new Map((cards as CardData[]).map(c => [c.id, c]))
  const ordered = ids.map(id => byId.get(id)).filter(Boolean) as CardData[]
  return ordered.length ? ordered : null
}
