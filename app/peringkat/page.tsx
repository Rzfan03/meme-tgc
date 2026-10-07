'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RiLoader4Line, RiMedalLine, RiRefreshLine, RiSwordLine, RiTrophyLine, RiUserLine } from 'react-icons/ri'
import { Card } from '@/components/Card'
import { DeckBar } from '@/components/DeckBar'
import { supabase } from '@/lib/supabase'
import { useCards, useProfile, useUser } from '@/lib/hooks'

type Entry = { id: string; nickname: string; avatar: string | null; rating: number; wins: number; losses: number }
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const RANK_COLOR: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

export default function Peringkat() {
  const { user, ready } = useUser()
  const { profile } = useProfile()
  const { cards } = useCards()
  const router = useRouter()
  const [list, setList] = useState<Entry[]>([]), [err, setErr] = useState(''), [load, setLoad] = useState(false)
  const [target, setTarget] = useState<Entry | null>(null), [sel, setSel] = useState<string[]>([]), [sending, setSending] = useState(false)

  const loadList = async () => {
    setErr(''); setLoad(true)
    const { data, error } = await supabase.rpc('leaderboard', { lim: 50 })
    setList((data ?? []) as Entry[]); setErr(error?.message ?? ''); setLoad(false)
  }
  useEffect(() => { if (ready && user) void loadList() }, [ready, user])

  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s)
  const kirim = async () => {
    if (!target) return
    if (sel.length !== 3) return setErr('Pilih tepat 3 kartu dulu.')
    setSending(true); setErr('')
    const { data, error } = await supabase.rpc('challenge', { opponent: target.id, card_ids: sel })
    setSending(false)
    if (error) return setErr(error.message)
    router.push('/versus?b=' + data)
  }

  if (ready && !user) return (
    <div className="w page">
      <div className="pagehead">
        <h2>Peringkat</h2>
        <p className="sub">Masuk untuk melihat papan peringkat.</p>
        <div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div>
      </div>
    </div>
  )

  const myIdx = list.findIndex(p => p.id === user?.id)

  return (
    <div className="w page">
      <div className="pagehead">
        <h2>Peringkat</h2>
        <p className="sub">Pemain terbaik, diurutkan dari rating tertinggi.</p>
        <div className="actions">
          <button className="btn sm ln ic" onClick={loadList} disabled={load} title="Segarkan" aria-label="Segarkan">
            <RiRefreshLine size={15} className={load ? 'spin' : ''} />
            <span className="lb-label">Segarkan</span>
          </button>
        </div>
      </div>

      {/* My stats banner */}
      {ready && profile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap',
          background: 'color-mix(in srgb, var(--ac) 10%, var(--sf))',
          border: '1px solid color-mix(in srgb, var(--ac) 25%, var(--ln))',
          borderRadius: 'var(--r-card)', padding: '.75rem 1rem', marginBottom: '1.5rem',
        }}>
          <RiTrophyLine size={18} style={{ color: 'var(--ac)', flex: 'none' }} />
          <span style={{ fontWeight: 700 }}>Posisi kamu: <b style={{ color: 'var(--ac)' }}>#{myIdx >= 0 ? myIdx + 1 : '–'}</b></span>
          <span style={{ color: 'var(--mut)', fontSize: '.875rem' }}>Rating <b style={{ color: 'var(--ink)' }}>{profile.rating}</b></span>
          <span style={{ color: 'var(--mut)', fontSize: '.875rem' }}>{profile.wins}W / {profile.losses}L</span>
        </div>
      )}

      {load && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--mut)', padding: '1rem 0' }}>
          <RiLoader4Line size={18} className="spin" />Memuat peringkat...
        </div>
      )}
      {err && <p className="err">{err}</p>}

      {!load && !err && (
        list.length ? (
          <div style={{ background: 'var(--sf)', borderRadius: 'var(--r-shell)', border: '1px solid var(--ln)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
            {list.map((p, i) => {
              const isMe = p.id === user?.id
              const rank = i + 1
              return (
                <div key={p.id} className="lb-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5rem 2.5rem 1fr auto',
                  alignItems: 'center',
                  gap: '.75rem',
                  padding: '.75rem 1rem',
                  borderBottom: i < list.length - 1 ? '1px solid var(--ln)' : 'none',
                  background: isMe ? 'color-mix(in srgb, var(--ac) 6%, transparent)' : 'transparent',
                  transition: 'background .15s',
                }}>
                  {/* Rank */}
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: rank <= 3 ? '1.15rem' : '.95rem',
                    color: RANK_COLOR[rank] ?? 'var(--mut)',
                    textAlign: 'center', lineHeight: 1,
                  }}>
                    {MEDALS[rank] ?? rank}
                  </span>

                  {/* Avatar */}
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    background: 'var(--bl)', overflow: 'hidden', flex: 'none',
                    color: '#fff', border: isMe ? '2px solid var(--ac)' : '2px solid transparent',
                  }}>
                    {p.avatar
                      ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <RiUserLine size={16} />}
                  </span>

                  {/* Name + stats */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '.95rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: isMe ? 'var(--ac)' : 'var(--ink)',
                    }}>
                      {p.nickname}
                      {isMe && <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--ac)', marginLeft: '.35rem', opacity: .8 }}>kamu</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '.6rem', fontSize: '.78rem', color: 'var(--mut)', marginTop: '.1rem', flexWrap: 'wrap' }}>
                      <span><b style={{ color: 'var(--ink)' }}>{p.rating}</b> rating</span>
                      <span>{p.wins}W / {p.losses}L</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '.4rem', flex: 'none' }}>
                    <button className="btn sm bl ic" onClick={() => setTarget(p)} disabled={isMe} title={`Tantang ${p.nickname}`} aria-label={`Tantang ${p.nickname}`}>
                      <RiSwordLine size={13} />
                      <span className="lb-label">Tantang</span>
                    </button>
                    <Link href={`/p/${p.id}`} className="btn sm ln ic" title={`Profil ${p.nickname}`} aria-label={`Profil ${p.nickname}`}>
                      <RiMedalLine size={13} />
                      <span className="lb-label">Profil</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty">Belum ada data. Mainkan battle untuk masuk peringkat!</div>
        )
      )}

      {target && (
        <div className="modal on" role="dialog" aria-modal="true" aria-label={`Tantang ${target.nickname}`} onClick={e => { if (e.target === e.currentTarget) setTarget(null) }}>
          <div className="dlg">
            <div className="dlg-head">
              <h3>Tantang {target.nickname}</h3>
              <button className="x" onClick={() => setTarget(null)} aria-label="Tutup">×</button>
            </div>
            <p className="sub">Pilih 3 kartu milikmu ({sel.length}/3). Room tantangan dibuat & lawan kamu dapat notifikasi.</p>
            <DeckBar cards={cards} sel={sel} onPick={ids => setSel(ids)} />
            <div className="scroll" style={{ marginTop: '1rem' }}>
              {cards.map(c => (
                <div key={c.id} onClick={() => toggle(c.id)} className={sel.includes(c.id) ? 'picked on' : 'picked'}>
                  <Card c={c} tilt={false} w={130} />
                </div>
              ))}
            </div>
            {!cards.length && <div className="empty">Kamu belum punya kartu. <Link href="/create">Buat dulu.</Link></div>}
            {err && <p className="err" style={{ marginTop: '.5rem' }}>{err}</p>}
            <div style={{ marginTop: '1rem' }}>
              <button className="btn sm bl" disabled={sel.length !== 3 || sending} onClick={kirim}>
                {sending ? <RiLoader4Line size={16} className="spin" /> : <RiSwordLine size={16} />}
                Kirim tantangan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
