'use client'
import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { ELEMENTS, RARITY_LABEL, type CardData } from '@/lib/game'

const RARITIES = {
  common: { frame: 'linear-gradient(145deg,#9aa3ad,#59616b 50%,#aab2bb)', foil: 0 },
  rare: { frame: 'linear-gradient(145deg,#8fd0ff,#2f6fb5 50%,#9fd8ff)', foil: .35 },
  epic: { frame: 'linear-gradient(145deg,#e0a6ff,#7a3fb8 50%,#f0c4ff)', foil: .55 },
  legendary: { frame: 'linear-gradient(145deg,#fff0a8,#c8901c 45%,#fff3b8 70%,#b5760f)', foil: .8 },
} as const

const STATS = [
  { k: 'atk', label: 'ATK', v: '#ff8b7a' },
  { k: 'def', label: 'DEF', v: '#8fd0ff' },
  { k: 'spd', label: 'SPD', v: '#8ff0a4' },
] as const

// Glow saat hover: Holy Card rainbow, Chaoz/Mogger sesuai warna elemen, sisanya tidak.
const GLOW: Record<string, 'rainbow' | 'color' | 'none'> = { 'Holy Card': 'rainbow', Chaoz: 'color', Mogger: 'color', Sampah: 'none', 'Tai ayam': 'none' }

export function Card({ c, tilt = true, w, onClick }: { c: CardData; tilt?: boolean; w?: number; onClick?: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const rar = RARITIES[c.rarity] ?? RARITIES.common
  const glow = ELEMENTS[c.element] ?? '#8B5CF6'
  const holy = GLOW[c.element] === 'rainbow'

  const move = (e: PointerEvent) => {
    if (!tilt) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', (0.5 - y) * 14 + 'deg')
    el.style.setProperty('--ry', (x - 0.5) * 14 + 'deg')
    el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%')
    el.style.setProperty('--hover', '1')
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--hover', '0')
  }
  const key = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }

  const vars = {
    '--c1': 'color-mix(in srgb, ' + glow + ' 26%, #070A1E)',
    '--c2': glow,
    '--glow': glow,
    '--frame': rar.frame,
    '--foil': holy ? 1 : rar.foil,
  } as CSSProperties

  const v = c as unknown as Record<string, number>

  return (
    <div className="tcg-wrap" style={{ width: w }}>
      <article
        ref={ref}
        className="tcg-card"
        data-glow={GLOW[c.element] ?? 'color'}
        style={vars}
        tabIndex={0}
        aria-label={`${c.name}, ${RARITY_LABEL[c.rarity]}, element ${c.element}, HP ${c.hp}, ATK ${c.atk}, DEF ${c.def}, SPD ${c.spd}`}
        onPointerMove={move}
        onPointerLeave={leave}
        onBlur={leave}
        onKeyDown={key}
        onClick={onClick}
      >
        <div className="tcg-face">
          <header className="tcg-head">
            <h3 className="tcg-name" title={c.name}>{c.name}</h3>
            <div className="tcg-orb" title={`HP ${c.hp}`}><span>HP</span>{c.hp}</div>
          </header>

          <div className="tcg-art">
            {c.image_url
              ? <img src={c.image_url} alt={c.name} draggable={false} />
              : <span className="tcg-init">{c.emoji ?? c.name.trim().slice(0, 1).toUpperCase()}</span>}
          </div>

          <div className="tcg-type">
            <span className="tcg-cat"><i className="tcg-dot" />{c.element}</span>
            <span className="tcg-rar">{RARITY_LABEL[c.rarity]}</span>
          </div>

          <div className="tcg-ability">
            <div className="tcg-ab-name">{c.skill}</div>
            {c.skill_desc && <div className="tcg-ab-text">{c.skill_desc}</div>}
          </div>

          <div className="tcg-stats">
            {STATS.map(({ k, label, v: color }) => (
              <div key={k} className="tcg-stat" data-k={k} style={{ '--c': color } as CSSProperties}>
                <b>{v[k]}</b><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        {rar.foil > 0 && <div className="tcg-foil" aria-hidden />}
      </article>
    </div>
  )
}
