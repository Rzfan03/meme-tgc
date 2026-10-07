'use client'
import { useEffect, useState } from 'react'
import { RiCalendarCheckLine, RiFireLine, RiMedalLine, RiSparkling2Line, RiCheckLine } from 'react-icons/ri'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks'

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

  const w = Math.min(s.wins_today, WIN)
  const m = Math.min(s.made_today, MAKE)
  const wDone = w >= WIN
  const mDone = m >= MAKE
  const allDone = wDone && mDone

  return (
    <div style={{
      background: 'var(--sf)', border: '1px solid var(--ln)',
      borderRadius: 'var(--r-shell)', padding: '1rem 1.1rem',
      boxShadow: 'var(--sh)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.9rem' }}>
        <RiCalendarCheckLine size={18} style={{ color: 'var(--ac)', flex: 'none' }} />
        <b style={{ fontSize: '.95rem', flex: 1 }}>Quest hari ini</b>
        {/* Streak badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.3rem',
          background: s.streak > 0 ? 'color-mix(in srgb, #FF8C42 12%, var(--bg))' : 'var(--bg)',
          border: `1px solid ${s.streak > 0 ? '#FF8C42' : 'var(--ln)'}`,
          borderRadius: 999, padding: '.2rem .65rem',
          fontSize: '.78rem', fontWeight: 700,
          color: s.streak > 0 ? '#FF8C42' : 'var(--mut)',
        }}>
          <RiFireLine size={13} />
          {s.streak} hari
        </span>
        {allDone && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '.25rem',
            background: 'color-mix(in srgb, var(--mn) 12%, var(--bg))',
            border: '1px solid color-mix(in srgb, var(--mn) 35%, var(--ln))',
            borderRadius: 999, padding: '.2rem .65rem',
            fontSize: '.78rem', fontWeight: 700, color: 'var(--mn)',
          }}>
            <RiCheckLine size={13} />Selesai!
          </span>
        )}
      </div>

      {/* Quest items */}
      <div style={{ display: 'grid', gap: '.6rem' }}>
        {/* Win battles */}
        <div style={{ display: 'grid', gap: '.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
            <RiMedalLine size={15} style={{ color: wDone ? 'var(--mn)' : 'var(--mut)', flex: 'none' }} />
            <span style={{ flex: 1, color: wDone ? 'var(--ink)' : 'var(--ink)', textDecoration: wDone ? 'none' : 'none' }}>
              Menang {WIN} battle
            </span>
            <b style={{ color: wDone ? 'var(--mn)' : 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>
              {w}/{WIN}
            </b>
          </div>
          <div style={{
            height: 6, borderRadius: 999,
            background: 'var(--ln)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${(w / WIN) * 100}%`,
              background: wDone ? 'var(--mn)' : 'var(--ac)',
              transition: 'width .4s ease',
            }} />
          </div>
        </div>

        {/* Make cards */}
        <div style={{ display: 'grid', gap: '.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
            <RiSparkling2Line size={15} style={{ color: mDone ? 'var(--mn)' : 'var(--mut)', flex: 'none' }} />
            <span style={{ flex: 1 }}>Cetak {MAKE} kartu</span>
            <b style={{ color: mDone ? 'var(--mn)' : 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>
              {m}/{MAKE}
            </b>
          </div>
          <div style={{
            height: 6, borderRadius: 999,
            background: 'var(--ln)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${(m / MAKE) * 100}%`,
              background: mDone ? 'var(--mn)' : 'var(--ac)',
              transition: 'width .4s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
