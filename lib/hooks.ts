'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { CardData } from './game'

export type Profile = { nickname: string; wins: number; losses: number; rating: number; avatar: string | null }

// Session Supabase dibaca sekali lalu di-broadcast ke semua komponen yang pakai useUser.
let current: Session | null = null
const subs = new Set<(s: Session | null) => void>()
supabase.auth.getSession().then(({ data }) => { current = data.session; subs.forEach(f => f(current)) })
supabase.auth.onAuthStateChange((_e, s) => { current = s; subs.forEach(f => f(s)) })

export function useUser() {
  const [session, setSession] = useState<Session | null>(current)
  useEffect(() => { subs.add(setSession); setSession(current); return () => { subs.delete(setSession) } }, [])
  const user = session?.user ?? null
  return { user, ready: true, session }
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
    const { data } = await supabase.from('profiles').select('nickname,wins,losses,rating,avatar').eq('id', user.id).maybeSingle()
    setP((data as Profile) ?? null)
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

export function displayName(u: User | null) {
  return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Pemain'
}
