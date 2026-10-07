'use client'
import { useEffect, useState } from 'react'
import { Eye, Loader2, RotateCcw, Swords, Users } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { DeckBar } from '@/components/DeckBar'
import { supabase } from '@/lib/supabase'
import { useCards } from '@/lib/hooks'
import { sfx } from '@/lib/sound'
import { toastSuccess } from '@/lib/alert'
import type { CardData } from '@/lib/game'
type F = CardData & { max: number; sk?: boolean }
type B = { id: string; p1: string; p2: string | null; p2_cards: F[] | null; p1_cards: F[]; p1_active: number; p2_active: number; turn: string | null; status: 'waiting' | 'active' | 'done'; winner: string | null; log: string[] }
export default function Versus() {
  const { user, ready, cards, loading } = useCards()
  const [sel, setSel] = useState<string[]>([]), [bid, setBid] = useState<string | null>(null), [b, setB] = useState<B | null>(null), [err, setErr] = useState(''), [opp, setOpp] = useState(false), [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => { const q = new URLSearchParams(location.search).get('b'); if (q) setBid(q) }, [])
  useEffect(() => {
    if (!bid) return
    const load = async () => {
      const { data } = await supabase.from('battles').select('*').eq('id', bid).single()
      if (!data) return
      setB(data as B)
      const { data: profs } = await supabase.from('profiles').select('id,nickname').in('id', [data.p1, data.p2].filter(Boolean))
      setNames(Object.fromEntries((profs ?? []).map((x: { id: string; nickname: string }) => [x.id, x.nickname])))
    }
    void load()
    const ch = supabase.channel('battle-' + bid, { config: { presence: { key: user?.id ?? 'anon' } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${bid}` }, p => { if (p.new) setB(p.new as B); else setB(prev => prev ? { ...prev, status: 'done', log: [...prev.log, 'Battle dihapus, kedua pemain tidak aktif.'] } : null) }).on('presence', { event: 'sync' }, () => setOpp(Object.keys(ch.presenceState()).length > 1)).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ at: Date.now() }) })
    return () => { supabase.removeChannel(ch) }
  }, [bid])
  useEffect(() => {
    if (!b || b.status !== 'done') return
    if (b.winner === user?.id) { sfx('win-match'); void toastSuccess('Kamu menang!', 'Battle dimenangkan. Kartumu jagoan.') }
    else sfx('error')
  }, [b?.status, b?.winner, user?.id])
  const find = async () => { setErr(''); const { data, error } = await supabase.rpc('find_match', { card_ids: sel }); if (error) setErr(error.message); else setBid(data) }
  const act = async (a: string, i = 0) => { if (a === 'attack') sfx('attack'); const { error } = await supabase.rpc('battle_action', { bid, act: a, idx: i }); setErr(error?.message ?? '') }
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s)
  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub">Masuk untuk melawan pemain lain.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>
  if (!bid || !b) return (
    <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub">Pilih tepat 3 kartu ({sel.length}/3), lalu cari lawan. Semua perhitungan dilakukan di server.</p></div>
      {bid ? <p><Loader2 size={18} className="spin" /> Memuat battle...</p> : <>
        <DeckBar cards={cards} sel={sel} onPick={ids => setSel(ids)} />
        <div className="grid">{loading ? <div className="empty">Memuat kartu...</div> : cards.map(c => <div key={c.id} onClick={() => toggle(c.id)} className={sel.includes(c.id) ? 'picked on' : 'picked'}><Card c={c} tilt={false} /></div>)}</div>
        <div style={{ marginTop: '1.5rem' }}><button className="btn bl" disabled={sel.length !== 3} onClick={find}><Users size={18} />Cari lawan</button></div></>}
      {err && <p className="err">{err}</p>}</div>)
  if (b.status === 'waiting' || !b.p1_cards || !b.p2_cards) return <div className="w page"><div className="pagehead"><h2>Versus</h2><p className="sub"><Loader2 size={18} className="spin" /> Mencari lawan. Biarkan halaman ini terbuka.</p><div className="actions"><button className="btn ln" onClick={async () => { await supabase.rpc('cancel_room', { room_id: bid }); setBid(null); setB(null) }}>Batalkan</button></div></div></div>
  const spectator = !(b.p1 === user!.id || b.p2 === user!.id)
  const me = b.p1 === user!.id, mine = me ? b.p1_cards : b.p2_cards, foe = me ? b.p2_cards : b.p1_cards, mi = me ? b.p1_active : b.p2_active, fi = me ? b.p2_active : b.p1_active, myTurn = !spectator && b.turn === user!.id && b.status === 'active'
  const fg = (c: F) => <div className="fg"><Card c={c} tilt={false} /><div className="hp"><div style={{ width: (c.hp / c.max) * 100 + '%' }} /></div></div>
  const mini = (c: F, i: number, active: number, mineSide: boolean) => <div key={i} className={`mini ${active === i ? 'act' : ''} ${c.hp <= 0 ? 'dead' : ''}`} style={{ '--h': c.hue, cursor: mineSide && myTurn ? 'pointer' : 'default' } as React.CSSProperties} onClick={() => mineSide && myTurn && c.hp > 0 && i !== mi && act('swap', i)}>{c.image_url && <img src={c.image_url} alt="" />}<small>{c.hp}</small></div>
  const aktif = mine[mi], skReady = aktif.sk !== false
  return (
    <div className="w page"><div className="pagehead"><h2>Versus</h2></div>
      <div className="tray"><small className="pn">{names[me ? b.p2! : b.p1] ?? (me ? 'Pemain 2' : 'Pemain 1')}</small>{foe.map((c, i) => mini(c, i, fi, false))}</div>
      <div className="field">{fg(foe[fi])}<div className="vs d">VS</div>{fg(mine[mi])}</div>
      <div className="tray">{mine.map((c, i) => mini(c, i, mi, true))}<small className="pn">{names[me ? b.p1 : b.p2!] ?? (me ? 'Pemain 1' : 'Pemain 2')}</small></div>
      <p className="turn">{b.status === 'done' ? (spectator ? 'Pertarungan selesai.' : b.winner === user!.id ? 'Kamu menang!' : 'Kamu kalah. Coba lagi!') : spectator ? 'Menonton pertarungan...' : myTurn ? 'Giliranmu. Serang, pakai skill, atau ketuk kartu untuk ganti.' : 'Menunggu lawan...'}{b.status === 'active' && <small> ({opp ? 'lawan online' : 'lawan offline'})</small>}</p>
      {spectator && !myTurn && <p className="sub" style={{ textAlign: 'center' }}><Eye size={14} /> Kamu menonton sebagai spectator.</p>}
      <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center' }}>
        {!spectator && <><button className="btn rd" disabled={!myTurn} onClick={() => act('attack')}><Swords size={18} />Serang</button><button className="btn" disabled={!myTurn || !skReady} title={aktif.skill_desc || aktif.skill} onClick={() => act('skill')}>{aktif.skill} <small>({skReady ? 'siap' : 'dipakai'})</small></button></>}
        {b.status === 'done' && !spectator && <button className="btn ln" onClick={() => { setBid(null); setB(null); setSel([]) }}><RotateCcw size={18} />Main lagi</button>}
        {spectator && <button className="btn ln" onClick={() => { setBid(null); setB(null); setSel([]) }}><RotateCcw size={18} />Tutup</button>}</div>
      {err && <p className="err">{err}</p>}<div className="log">{b.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}</div></div>)
}
