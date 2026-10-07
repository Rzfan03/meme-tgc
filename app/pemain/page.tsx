'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Pemain = { id: string; nickname: string; avatar: string | null; rating: number; wins: number; losses: number }

export default function Pemain() {
  const [q, setQ] = useState(''), [hasil, setHasil] = useState<Pemain[] | null>(null), [busy, setBusy] = useState(false), [pesan, setPesan] = useState('')
  const cari = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true); setPesan('')
    const { data, error } = await supabase.from('profiles')
      .select('id,nickname,avatar,rating,wins,losses')
      .ilike('nickname', `%${q.trim()}%`).order('rating', { ascending: false }).limit(20)
    setBusy(false)
    if (error) setPesan(error.message)
    else { setHasil((data as Pemain[] | null) ?? []); if (!data?.length) setPesan('Tidak ada pemain dengan nama itu.') }
  }
  return (
    <div className="w page">
      <div className="pagehead"><h2>Cari Pemain</h2><p className="sub">Temukan pemain lain lewat nama tampilan.</p></div>
      <form className="bar" style={{ maxWidth: 480 }} onSubmit={cari}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nama pemain..." aria-label="Nama pemain" />
        <button className="btn rd" disabled={busy || !q.trim()}><Search size={18} />Cari</button>
      </form>
      {pesan && <p className="sub" style={{ marginTop: '1rem' }}>{pesan}</p>}
      {hasil && hasil.length > 0 && (
        <div className="list" style={{ marginTop: '1.2rem' }}>
          {hasil.map(p => {
            const awal = (p.nickname || '?').trim().slice(0, 1).toUpperCase()
            return (
              <Link key={p.id} href={`/p/${p.id}`} className="row" style={{ textDecoration: 'none' }}>
                <span className="ow-av">{p.avatar ? <img src={p.avatar} alt="" /> : p.nickname ? awal : <User size={18} />}</span>
                <div><b>{p.nickname || 'Tanpa nama'}</b><br /><small className="sub" style={{ margin: 0 }}>{p.wins} menang · {p.losses} kalah · rating {p.rating}</small></div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}