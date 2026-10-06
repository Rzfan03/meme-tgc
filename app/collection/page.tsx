'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Sparkles } from 'lucide-react'
import { Card } from '@/components/Card'
import { CardDetail } from '@/components/CardDetail'
import { CardGridSkeleton } from '@/components/Skeleton'
import { useCards } from '@/lib/hooks'
import { ELEMENTS, type CardData } from '@/lib/game'
export default function Collection() {
  const { user, ready, cards, loading, error, reload } = useCards()
  const [q, setQ] = useState(''), [el, setEl] = useState('Semua'), [open, setOpen] = useState<CardData | null>(null)
  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Koleksi</h2><p className="sub">Masuk untuk melihat kartumu.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>
  const list = cards.filter(c => (el === 'Semua' || c.element === el) && c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="w page"><div className="pagehead"><h2>Koleksi ({cards.length})</h2><p className="sub">Semua kartu yang kamu punya.</p></div>
      <div className="bar"><span style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 13 }} /><input style={{ paddingLeft: 34 }} placeholder="Cari nama kartu" aria-label="Cari nama kartu" value={q} onChange={e => setQ(e.target.value)} /></span>
        {['Semua', ...Object.keys(ELEMENTS)].map(k => <button key={k} className={`chip ${k === el ? 'on' : ''}`} onClick={() => setEl(k)}>{k}</button>)}</div>
      <div className="grid">{loading ? <CardGridSkeleton n={6} />
        : error ? <div className="empty err">Kartu gagal dimuat: {error}<br /><small style={{ fontWeight: 500 }}>Cek sesi login kamu, lalu Coba lagi.</small><br /><button className="btn ln" onClick={reload} style={{ marginTop: '1rem' }}>Coba lagi</button></div>
        : list.length ? list.map(c => <Card key={c.id} c={c} onClick={() => setOpen(c)} />) : <div className="empty">Belum ada kartu di sini.<br /><Link href="/create" className="btn" style={{ marginTop: '1rem' }}><Sparkles size={18} />Buat kartu</Link></div>}</div>
      <CardDetail c={open} onClose={() => setOpen(null)} />
    </div>
  )
}
