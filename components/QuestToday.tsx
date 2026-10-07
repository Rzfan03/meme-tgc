'use client'
import { useEffect, useState } from 'react'
import { CalendarCheck, Crown, Flame, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks'

// Quest harian: menang 2 battle & buat 1 kartu per hari + streak aktivitas.
type S = { wins_today: number; made_today: number; streak: number }
const WIN = 2, MAKE = 1

export function QuestToday() {
  const { user, ready } = useUser()
  const [s, setS] = useState<S | null>(null)
  useEffect(() => {
    if (!ready) return
    if (!user) { setS(null); return }
    const f = async () => {
      const { data } = await supabase.rpc('daily_stats')
      setS(data as S)
    }
    void f()
    const t = setInterval(f, 30000)
    return () => clearInterval(t)
  }, [ready, user])
  if (!user || !s) return null
  const w = Math.min(s.wins_today, WIN), m = Math.min(s.made_today, MAKE)
  return (
    <div className="step" style={{ marginBottom: '1.2rem', display: 'grid', gap: '.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}><b style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><CalendarCheck size={18} />Quest hari ini</b>
        <span className="chip" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Flame size={14} style={{ color: '#FF8C42' }} />Streak {s.streak} hari</span></div>
      <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.25rem' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><Crown size={15} /> Menang {WIN} battle</span><b>{w}/{WIN}</b></div>
        <div className="hp" style={{ width: '100%' }}><div style={{ width: (w / WIN) * 100 + '%' }} /></div></div>
      <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.25rem' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><Sparkles size={15} /> Cetak {MAKE} kartu</span><b>{m}/{MAKE}</b></div>
        <div className="hp" style={{ width: '100%' }}><div style={{ width: (m / MAKE) * 100 + '%' }} /></div></div>
    </div>
  )
}