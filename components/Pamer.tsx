'use client'
import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { Card } from '@/components/Card'
import { useCards, useProfile } from '@/lib/hooks'
import type { CardData } from '@/lib/game'

const MAX = 6

export function Pamer() {
  const { cards } = useCards()
  const { saveFeatured } = useProfile()
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [drag, setDrag] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => { setOpen(false); setMsg('') }
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < MAX ? [...s, id] : s)
  const into = (from: string, at: string) => setSel(s => {
    if (!s.includes(from) && s.length >= MAX) return s
    const i = s.indexOf(from)
    if (i >= 0) s = s.filter(x => x !== from)
    const pos = s.indexOf(at)
    if (from && pos >= 0) return [...s.slice(0, pos), from, ...s.slice(pos)]
    return [...s, from]
  })
  const byId = (id: string) => cards.find(c => c.id === id)

  const save = async () => {
    setBusy(true); setMsg('')
    const { error } = await saveFeatured(sel)
    setBusy(false)
    if (error) setMsg(`Gagal: ${error}. Jalankan supabase/pamer_kartu.sql di SQL Editor dulu.`)
    else close()
  }

  return (
    <>
      <button className="btn" onClick={() => { setSel([]); setOpen(true) }}><Star size={18} />Pamer kartu</button>

      {open && (
        <div className="pamer">
          <div className="pamer-back" onClick={close} aria-hidden="true" />
          <aside className="pamer-side" role="dialog" aria-modal="true" aria-label="Pilih kartu pameran">
            <div className="pamer-head">
              <h3>Pamer kartu</h3>
              <p className="sub">Tarik kartu ke pameran atau ketuk untuk memilih (maks {MAX}).</p>
              <button className="x" onClick={close} aria-label="Tutup pameran"><X size={20} /></button>
            </div>

            <div className="pamer-strip" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (drag && !sel.includes(drag)) setSel(s => [...s, drag].slice(0, MAX)); setDrag(null) }}>
              {sel.length
                ? sel.map(id => { const c = byId(id); if (!c) return null; return (
                  <div key={id} className="pamer-slot" draggable onDragStart={() => setDrag(id)} onDragEnd={() => setDrag(null)} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (drag && drag !== id) into(drag, id); setDrag(null) }}>
                    <Card c={c} tilt={false} w={110} />
                    <button className="rm" aria-label={`Hapus ${c.name} dari pameran`} onClick={() => toggle(id)}><X size={12} /></button>
                  </div>) })
                : <p className="sub" style={{ margin: 'auto' }}>Belum ada kartu. Tarik atau ketuk kartu di bawah.</p>}
            </div>

            <div className="pamer-list">
              {cards.length
                ? cards.map(c => (
                  <div key={c.id} className={`pamer-card${sel.includes(c.id) ? ' on' : ''}`} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)} onClick={() => toggle(c.id)} title={c.name}>
                    <Card c={c} tilt={false} w={95} />
                    <i>{c.name}</i>
                  </div>))
                : <p className="sub">Kamu belum punya kartu.</p>}
            </div>

            <div className="pamer-foot">
              {msg && <p className="err">{msg}</p>}
              <button className="btn ln" onClick={close}>Tutup</button>
              <button className="btn bl" disabled={busy} onClick={save}>{busy ? 'Menyimpan...' : 'Simpan pameran'}</button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}