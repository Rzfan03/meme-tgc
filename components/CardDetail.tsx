'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Card } from '@/components/Card'
import { Share } from '@/components/Share'
import { ELEMENTS, RARITY_LABEL, type CardData } from '@/lib/game'

const STATS = [
  ['hp', 'HP'],
  ['atk', 'ATK'],
  ['def', 'DEF'],
  ['spd', 'SPD'],
] as const

export function CardDetail({ c, onClose }: { c: CardData | null; onClose: () => void }) {
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

  return (
    <div className="modal on" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mb" role="dialog" aria-modal="true" aria-label={`Detail kartu ${c.name}`}>
        <button className="x" onClick={onClose} aria-label="Tutup detail kartu"><X size={20} /></button>

        <div className="cd-card"><Card c={c} /></div>

        <div className="cd-info">
          <span className="rar-cap">{RARITY_LABEL[c.rarity]}</span>
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

          <div className="cd-btns">
            <Share path={`/c/${c.id}`} title={`${c.name} · Meme TGC`}>Bagikan kartu</Share>
          </div>
        </div>
      </div>
    </div>
  )
}
