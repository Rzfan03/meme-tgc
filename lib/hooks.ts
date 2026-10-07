'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { CardData } from './game'

export type Profile = { nickname: string; wins: number; losses: number; rating: number; avatar: string | null; points: number; is_admin: boolean }

// Session Supabase dibaca sekali lalu di-broadcast ke semua komponen yang pakai useUser.
let current: Session | null = null
let readyNow = false
const subs = new Set<() => void>()
const snap = (): { session: Session | null; ready: boolean } => ({ session: current, ready: readyNow })
supabase.auth.getSession().then(({ data }) => { current = data.session; readyNow = true; subs.forEach(f => f()) })
supabase.auth.onAuthStateChange((_e, s) => { current = s; readyNow = true; subs.forEach(f => f()) })

export function useUser() {
  // State awal SELALU dianggap belum siap, supaya render server (SSR) === render pertama client.
  // Efek di bawah hanya jalan di client (setelah hydration), jadi tidak menimbulkan mismatch.
  const [st, setSt] = useState<{ session: Session | null; ready: boolean }>({ session: null, ready: false })
  useEffect(() => {
    const f = () => setSt(snap())
    subs.add(f); f()
    return () => { subs.delete(f) }
  }, [])
  return { user: st.session?.user ?? null, ready: st.ready, session: st.session }
}

export function useSignOut() {
  return useCallback(() => { void supabase.auth.signOut() }, [])
}

// Profil pemain: nickname, stats, avatar. Baris dibuat trigger auth.users saat daftar.
export function useProfile() {
  const { user } = useUser()
  const [p, setP] = useState<Profile | null>(null)
  const reload = useCallback(async () => {
    if (!user) { setP(null); return }
    const { data } = await supabase.from('profiles').select('nickname,wins,losses,rating,avatar,is_admin').eq('id', user.id).maybeSingle()
    if (!data) { setP(null); return }
    const { data: pts } = await supabase.from('profiles').select('points').eq('id', user.id).maybeSingle()
    setP({ ...(data as Profile), points: (pts as { points?: number } | null)?.points ?? 0 } satisfies Profile)
  }, [user])
  useEffect(() => { void reload() }, [reload])
  return { profile: p, reload, save: async (patch: Partial<Pick<Profile, 'nickname' | 'avatar'>>) => {
    if (!user) return { error: 'Belum masuk.' }
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (!error) await reload()
    return { error: error?.message ?? '' }
  }, saveFeatured: async (featured_card_ids: string[]) => {
    if (!user) return { error: 'Belum masuk.' }
    const { error } = await supabase.from('profiles').update({ featured_card_ids }).eq('id', user.id)
    return { error: error?.message ?? '' }
  } }
}

export function useCards() {
  const { user, ready } = useUser()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!user) { setCards([]); setLoading(false); return }
    const { data, error: e } = await supabase.from('cards').select('*').order('created_at', { ascending: false })
    setCards((data ?? []) as CardData[]); setError(e?.message ?? ''); setLoading(false)
  }, [user])
  useEffect(() => { if (ready) reload() }, [ready, reload])
  return { user, ready, cards, loading, error, reload }
}

// token JWT user untuk API route server-side.
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// Notifikasi in-app (bel di header). Baris baru masuk live via Supabase realtime.
export type Notif = { id: string; title: string; body: string; read: boolean; created_at: string }
export function useNotifs() {
  const { user } = useUser()
  const [list, setList] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const load = useCallback(async () => {
    if (!user) { setList([]); setUnread(0); return }
    const { data } = await supabase.from('notifications').select('id,title,body,read,created_at').order('created_at', { ascending: false }).limit(12)
    const n = (data ?? []) as Notif[]
    setList(n); setUnread(n.filter(x => !x.read).length)
  }, [user])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!user) return
    // Nama channel unik per mount: di StrictMode dev effect jalan 2x, dan nama yang
    // sama mengembalikan channel yang sudah subscribe (bareng `.on` → runtime error).
    const ch = supabase.channel('notif-' + user.id + '-' + Math.random().toString(36).slice(2))
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load()).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [user, load])
  const markAll = useCallback(async () => {
    if (!user) return
    await supabase.rpc('notif_mark_all_read')
    setList(l => l.map(x => ({ ...x, read: true }))); setUnread(0)
  }, [user])
  return { list, unread, markAll }
}

export function displayName(u: User | null) {
  return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Pemain'
}
