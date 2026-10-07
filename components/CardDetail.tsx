'use client'
import { useEffect, useState } from 'react'
import { Store, X } from 'lucide-react'
import { Card } from '@/components/Card'
import { Share } from '@/components/Share'
import { ELEMENTS, type CardData } from '@/lib/game'
import { supabase } from '@/lib/supabase'
import { sfx } from '@/lib/sound'

const STATS = [
  ['hp', 'HP'],
  ['atk', 'ATK'],
  ['def', 'DEF'],
  ['spd', 'SPD'],
] as const

type Listing = { id: string; card_id: string; price: number } | null

export function CardDetail({ c, onClose }: { c: CardData | null; onClose: () => void }) {
  const [myListing, setMyListing] = useState<Listing>(null)
  const [price, setPrice] = useState(''), [busy, setBusy] = useState(false)
  const [lmsg, setLmsg] = useState(''), [lerr, setLerr] = useState(false)

  const ref = async (cardId: string) => {
    const { data } = await supabase.rpc('market_my_listing')
    const rows = (data ?? []) as { id: string; card_id: string; price: number }[]
    setMyListing(rows.find(r => r.card_id === cardId) ?? null)
  }
  useEffect(() => { if (c) { void ref(c.id); setPrice(''); setLmsg(''); setLerr(false) } }, [c])

  useEffect(() => {
    if (!c) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [c, onClose])

  if (!c) return null
  const glow = ELEMENTS[c.element]

  const pasang = async () => {
    if (!c) return
    setBusy(true); setLmsg('')
    const { error } = await supabase.rpc('list_card', { cid: c.id, price: Number(price) })
    setBusy(false)
    if (error) { setLerr(true); sfx('error'); return setLmsg(error.message) }
    setLerr(false); sfx('success'); setLmsg(`Kartu dipajang di marketplace seharga ${Number(price).toLocaleString('id-ID')} poin.`)
    void ref(c.id)
  }

  const batal = async () => {
    if (!c || !myListing) return
    setBusy(true); setLmsg('')
    const { error } = await supabase.rpc('unlist_card', { lid: myListing.id })
    setBusy(false)
    if (error) { setLerr(true); return setLmsg(error.message) }
    setMyListing(null); setLerr(false); setLmsg('Jual dibatalkan, kartu kembali ke koleksimu.')
  }

  return (
    <div className="modal on" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mb" role="dialog" aria-modal="true" aria-label={`Detail kartu ${c.name}`}>
        <button className="x" onClick={onClose} aria-label="Tutup detail kartu"><X size={20} /></button>

        <div className="cd-card"><Card c={c} /></div>

        <div className="cd-info">
          <span className="rar-cap">{c.element}</span>
          <h3>{c.name}</h3>
          <span className="cd-el" style={{ color: glow, borderColor: glow }}><i />{c.element}</span>

          <div className="cd-stats">
            {STATS.map(([k, label]) => (
              <div key={k}><b>{c[k]}</b><small>{label}</small></div>
            ))}
          </div>

          <div className="cd-skill" style={{ borderColor: glow }}>
            <b style={{ color: glow }}>{c.skill}</b>
            <p>{c.skill_desc}</p>
          </div>

          <div className="cd-sell">
            {myListing
              ? <div className="bar" style={{ margin: 0 }}>
                <p className="ok" style={{ margin: 0, marginRight: 'auto' }}>Dijual dengan harga {myListing.price.toLocaleString('id-ID')} poin.</p>
                <button className="btn ln" disabled={busy} onClick={batal}>Batal jual</button>
              </div>
              : <div className="bar" style={{ margin: 0 }}>
                <input inputMode="numeric" placeholder="Harga jual (min 100 poin)" aria-label="Harga jual" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ''))} />
                <button className="btn" disabled={busy || Number(price) < 100} onClick={pasang}><Store size={16} />Jual di marketplace</button>
              </div>}
            {lmsg && <p className={lerr ? 'err' : 'ok'} style={{ marginTop: '.5rem', marginBottom: 0 }}>{lmsg}</p>}
          </div>

          <div className="cd-btns">
            <Share path={`/c/${c.id}`} title={`${c.name} · MultiVerse`}>Bagikan kartu</Share>
          </div>
        </div>
      </div>
    </div>
  )
}
