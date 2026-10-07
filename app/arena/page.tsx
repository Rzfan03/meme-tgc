'use client'
import { useState } from 'react'
import Link from 'next/link'
import { RiSwordLine, RiRefreshLine, RiSparkling2Line } from 'react-icons/ri'
import { Card } from '@/components/Card'
import { PageSkeleton } from '@/components/Skeleton'
import { useCards } from '@/lib/hooks'
import { BOTS, hit, type CardData } from '@/lib/game'
import { sfx } from '@/lib/sound'
import { toastSuccess } from '@/lib/alert'
type F = CardData & { max: number }
type S = { me: F[]; foe: F[]; mi: number; fi: number; log: string[]; busy: boolean; over: boolean; pop: { id: string; d: number } | null }
const pick = (a: CardData[]): F[] => [...a].sort(() => Math.random() - 0.5).slice(0, 3).map(c => ({ ...c, max: c.hp }))
function foeTurn(b: S): S {
  const me = b.me[b.mi], fo = b.foe[b.fi], [d] = hit(fo, me)
  sfx('use-poison', 0.6)
  b.pop = { id: 'fm', d }; b.log.push(`${fo.name} membalas ${d} damage`)
  if (me.hp <= 0) { b.log.push(me.name + ' tumbang'); if (b.me.every(c => c.hp <= 0)) { b.over = true; sfx('error') } else b.mi = b.me.findIndex(c => c.hp > 0) }
  b.busy = false; return b
}
export default function Arena() {
  const { cards, loading } = useCards()
  const [b, setB] = useState<S | null>(null)
  const start = () => setB({ me: pick(cards), foe: pick(BOTS), mi: 0, fi: 0, log: ['Battle dimulai.'], busy: false, over: false, pop: null })
  const later = () => setTimeout(() => setB(s => s && foeTurn(structuredClone(s))), 900)
  const attack = () => {
    if (!b) return
    sfx('attack')
    const n = structuredClone(b), me = n.me[n.mi], fo = n.foe[n.fi], [d, m] = hit(me, fo)
    n.busy = true; n.pop = { id: 'ff', d }; n.log.push(`${me.name} menyerang ${d} damage${m > 1 ? ' (efektif!)' : m < 1 ? ' (kurang efektif)' : ''}`)
    if (fo.hp <= 0) { n.log.push(fo.name + ' tumbang'); if (n.foe.every(c => c.hp <= 0)) { n.over = true; sfx('win-match'); void toastSuccess('Kamu menang!', 'Kartumu menghabisi semua lawan.') } else n.fi = n.foe.findIndex(c => c.hp > 0); n.busy = false; return setB(n) }
    setB(n); later()
  }
  const swap = (i: number) => {
    if (!b || b.busy || b.over || i === b.mi || b.me[i].hp <= 0) return
    const n = structuredClone(b); n.mi = i; n.busy = true; n.log.push('Kamu mengganti ke ' + n.me[i].name); setB(n); later()
  }
  if (loading) return <PageSkeleton />
  if (!loading && !cards.length) return <div className="w page"><div className="pagehead"><h2>Arena</h2><p className="sub">Kamu butuh minimal satu kartu untuk bertarung.</p><div className="actions"><Link href="/create" className="btn"><RiSparkling2Line size={18} />Buat kartu</Link></div></div></div>
  if (!b) return <div className="w page"><div className="pagehead"><h2>Arena</h2><p className="sub">Tiga kartu acak dari koleksimu melawan bot. Elemen unggul memberi damage 1,5 kali.</p><div className="actions"><button className="btn bl" disabled={loading} onClick={start}><RiSwordLine size={18} />Mulai battle</button></div></div></div>
  const win = b.foe.every(c => c.hp <= 0)
  const fg = (c: F, id: string) => <div className={`fg ${b.pop?.id === id ? 'hit' : ''}`} key={id + b.log.length}>{b.pop?.id === id && <span className="dmg">-{b.pop.d}</span>}<Card c={c} tilt={false} /><div className="hp"><div style={{ width: (c.hp / c.max) * 100 + '%' }} /></div></div>
  const mini = (c: F, i: number, mine: boolean) => <div key={c.id + i} className={`mini ${(mine ? b.mi : b.fi) === i ? 'act' : ''} ${c.hp <= 0 ? 'dead' : ''}`} style={{ '--h': c.hue, cursor: mine ? 'pointer' : 'default' } as React.CSSProperties} onClick={() => mine && swap(i)}>{c.image_url ? <img src={c.image_url} alt="" /> : c.emoji}<small>{c.hp}</small></div>
  return (
    <div className="w page"><div className="pagehead"><h2>Arena</h2></div>
      <div className="tray">{b.foe.map((c, i) => mini(c, i, false))}</div>
      <div className="field">{fg(b.foe[b.fi], 'ff')}<div className="vs d">VS</div>{fg(b.me[b.mi], 'fm')}</div>
      <div className="tray">{b.me.map((c, i) => mini(c, i, true))}</div>
      <p className="turn">{b.over ? (win ? 'Kamu menang!' : 'Kamu kalah. Coba lagi!') : b.busy ? 'Giliran lawan...' : 'Giliranmu. Serang atau ketuk kartu untuk ganti.'}</p>
      <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center' }}><button className="btn rd" disabled={b.busy || b.over} onClick={attack}><RiSwordLine size={18} />Serang</button><button className="btn ln" onClick={start}><RiRefreshLine size={18} />Battle baru</button></div>
      <div className="log">{b.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}</div></div>
  )
}
