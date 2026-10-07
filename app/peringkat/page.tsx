'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown, Loader2, Medal, Swords, User } from 'lucide-react'
import { Card } from '@/components/Card'
import { DeckBar } from '@/components/DeckBar'
import { supabase } from '@/lib/supabase'
import { useCards, useProfile, useUser } from '@/lib/hooks'

type Entry = { id: string; nickname: string; avatar: string | null; rating: number; wins: number; losses: number }
const PICK: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

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
  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Peringkat</h2><p className="sub">Masuk untuk melihat papan peringkat.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>
  return (
    <div className="w page"><div className="pagehead"><h2>Peringkat</h2><p className="sub">Pemain terbaik, diurutkan dari rating tertinggi.</p><div className="actions"><button className="btn ln" onClick={loadList} disabled={load}><Loader2 size={16} />Segarkan</button></div></div>
      {ready && profile && <p className="sub" style={{ marginBottom: '1rem' }}>Rating kamu: <b>{profile.rating}</b> ({profile.wins}W/{profile.losses}L)</p>}
      {load && <p><Loader2 size={18} className="spin" /> Memuat peringkat...</p>}
      {err && <p className="err">{err}</p>}
      {!load && !err && (list.length ? list.map((p, i) => (
        <div className="step" key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <b style={{ fontSize: '1.2rem', width: 44, textAlign: 'center', color: PICK[i + 1] ?? 'var(--mut)' }}>{i < 3 ? i + 1 : i + 1}</b>
          <span className="av" style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bl)', overflow: 'hidden', flex: 'none' }}>{p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={18} />}</span>
          <div style={{ flex: 1, minWidth: 120 }}><b>{p.nickname}{p.id === user?.id && ' (kamu)'}</b><p>Rating <b>{p.rating}</b> · {p.wins}W/{p.losses}L</p></div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn" onClick={() => setTarget(p)} disabled={p.id === user?.id}><Swords size={16} />Tantang</button>
            <Link href={`/p/${p.id}`} className="btn ln"><Medal size={16} />Profil</Link>
          </div>
        </div>
      )) : <div className="empty">Belum ada data. Mainkan battle untuk masuk peringkat!</div>)}
      {target && (
        <div className="modal on" role="dialog" aria-modal="true" aria-label={`Tantang ${target.nickname}`} onClick={e => { if (e.target === e.currentTarget) setTarget(null) }}>
          <div className="dlg">
            <div className="dlg-head"><h3>Tantang {target.nickname}</h3><button className="x" onClick={() => setTarget(null)} aria-label="Tutup">×</button></div>
            <p className="sub">Pilih 3 kartu milikmu ({sel.length}/3). Room tantangan dibuat & lawan kamu dapat notifikasi.</p>
            <DeckBar cards={cards} sel={sel} onPick={ids => setSel(ids)} />
            <div className="scroll" style={{ marginTop: '1rem' }}>{cards.map(c => <div key={c.id} onClick={() => toggle(c.id)} style={{ borderRadius: 14, outline: sel.includes(c.id) ? '4px solid var(--yl)' : 'none', outlineOffset: 3 }}><Card c={c} tilt={false} w={130} /></div>)}</div>
            {!cards.length && <div className="empty">Kamu belum punya kartu. <Link href="/create">Buat dulu.</Link></div>}
            <div style={{ marginTop: '1rem' }}><button className="btn rd" disabled={sel.length !== 3 || sending} onClick={kirim}>{sending ? <Loader2 size={16} className="spin" /> : <Swords size={16} />}Kirim tantangan</button></div>
          </div>
        </div>
      )}
    </div>
  )
}