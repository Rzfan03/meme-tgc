'use client'
import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, Swords, Users } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { supabase } from '@/lib/supabase'
import { useCards } from '@/lib/hooks'
import type { CardData } from '@/lib/game'
type F = CardData & { max: number }
type B = { id: string; p1: string; p2_cards: F[] | null; p1_cards: F[]; p1_active: number; p2_active: number; turn: string | null; status: 'waiting' | 'active' | 'done'; winner: string | null; log: string[] }
export default function Versus() {
  const { user, ready, cards, loading } = useCards()
  const [sel, setSel] = useState<string[]>([]), [bid, setBid] = useState<string | null>(null), [b, setB] = useState<B | null>(null), [err, setErr] = useState(''), [opp, setOpp] = useState(false)
  useEffect(() => { const q = new URLSearchParams(location.search).get('b'); if (q) setBid(q) }, [])
  useEffect(() => {
    if (!bid) return
    supabase.from('battles').select('*').eq('id', bid).single().then(({ data }) => data && setB(data as B))
    const ch = supabase.channel('battle-' + bid, { config: { presence: { key: user?.id ?? 'anon' } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${bid}` }, p => setB(p.new as B)).on('presence', { event: 'sync' }, () => setOpp(Object.keys(ch.presenceState()).length > 1)).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ at: Date.now() }) })
    return () => { supabase.removeChannel(ch) }
  }, [bid])
  const find = async () => { setErr(''); const { data, error } = await supabase.rpc('find_match', { card_ids: sel }); if (error) setErr(error.message); else setBid(data) }
  const act = async (a: string, i = 0) => { const { error } = await supabase.rpc('battle_action', { bid, act: a, idx: i }); setErr(error?.message ?? '') }
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s)
  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub">Masuk untuk melawan pemain lain.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>
  if (!bid || !b) return (
    <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub">Pilih tepat 3 kartu ({sel.length}/3), lalu cari lawan. Semua perhitungan dilakukan di server.</p></div>
      {bid ? <p><Loader2 size={18} className="spin" /> Memuat battle...</p> : <>
        <div className="grid">{loading ? <div className="empty">Memuat kartu...</div> : cards.map(c => <div key={c.id} onClick={() => toggle(c.id)} style={{ borderRadius: 18, outline: sel.includes(c.id) ? '4px solid var(--yl)' : 'none', outlineOffset: 4 }}><Card c={c} tilt={false} /></div>)}</div>
        <div style={{ marginTop: '1.5rem' }}><button className="btn rd" disabled={sel.length !== 3} onClick={find}><Users size={18} />Cari lawan</button></div></>}
      {err && <p className="err">{err}</p>}</div>)
  if (b.status === 'waiting' || !b.p1_cards || !b.p2_cards) return <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub"><Loader2 size={18} className="spin" /> Mencari lawan. Biarkan halaman ini terbuka.</p><div className="actions"><button className="btn ln" onClick={async () => { await supabase.rpc('cancel_room', { room_id: bid }); setBid(null); setB(null) }}>Batalkan</button></div></div></div>
  const me = b.p1 === user!.id, mine = me ? b.p1_cards : b.p2_cards, foe = me ? b.p2_cards : b.p1_cards, mi = me ? b.p1_active : b.p2_active, fi = me ? b.p2_active : b.p1_active, myTurn = b.turn === user!.id && b.status === 'active'
  const fg = (c: F) => <div className="fg"><Card c={c} tilt={false} /><div className="hp"><div style={{ width: (c.hp / c.max) * 100 + '%' }} /></div></div>
  const mini = (c: F, i: number, active: number, mineSide: boolean) => <div key={i} className={`mini ${active === i ? 'act' : ''} ${c.hp <= 0 ? 'dead' : ''}`} style={{ '--h': c.hue, cursor: mineSide && myTurn ? 'pointer' : 'default' } as React.CSSProperties} onClick={() => mineSide && myTurn && c.hp > 0 && i !== mi && act('swap', i)}>{c.image_url && <img src={c.image_url} alt="" />}<small>{c.hp}</small></div>
  return (
    <div className="w page"><div className="pagehead"><h2>Versus</h2></div>
      <div className="tray">{foe.map((c, i) => mini(c, i, fi, false))}</div>
      <div className="field">{fg(foe[fi])}<div className="vs d">VS</div>{fg(mine[mi])}</div>
      <div className="tray">{mine.map((c, i) => mini(c, i, mi, true))}</div>
      <p className="turn">{b.status === 'done' ? (b.winner === user!.id ? 'Kamu menang!' : 'Kamu kalah. Coba lagi!') : myTurn ? 'Giliranmu. Serang atau ketuk kartu untuk ganti.' : 'Menunggu lawan...'}{b.status === 'active' && <small> ({opp ? 'lawan online' : 'lawan offline'})</small>}</p>
      <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center' }}>
        <button className="btn rd" disabled={!myTurn} onClick={() => act('attack')}><Swords size={18} />Serang</button>
        {b.status === 'done' && <button className="btn ln" onClick={() => { setBid(null); setB(null); setSel([]) }}><RotateCcw size={18} />Main lagi</button>}</div>
      {err && <p className="err">{err}</p>}<div className="log">{b.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}</div></div>)
}
