import { ImageResponse } from 'next/og'
import { ELEMENTS, RARITY_LABEL, type CardData } from '@/lib/game'
import { gambarPng, kartuPublic } from '@/lib/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Kartu MultiVerse'

const potong = (t?: string, n = 90) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : (t ?? ''))

const stat = (v: number, label: string, color: string) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.16)', borderRadius: 18, padding: '12px 0 14px', width: 128 }}>
    <div style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1 }}>{v}</div>
    <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.75, marginTop: 4, letterSpacing: 1 }}>{label}</div>
  </div>
)

export default async function Og({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = (await kartuPublic(id)) as CardData | null
  if (!c) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0E2E', color: '#8E9BFF', fontSize: 64, fontWeight: 800 }}>MultiVerse</div>,
      size,
    )
  }

  const glow = ELEMENTS[c.element] ?? '#8B5CF6'
  const foto = await gambarPng(c.image_url)

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B0E2E 0%,#151A4D 100%)', color: '#F2F3FF', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -180, right: -140, width: 640, height: 640, borderRadius: 999, background: glow, opacity: 0.18 }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, padding: '56px 0 56px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 800, color: '#FFD21F' }}>Multi</div>
          <div style={{ marginLeft: 18, fontSize: 30, fontWeight: 700, letterSpacing: 5, opacity: 0.6 }}>VERSE</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '10px 22px', fontSize: 24, fontWeight: 700, border: `2px solid ${glow}` }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: glow, marginRight: 12 }} />
            <div style={{ fontSize: 24, fontWeight: 800 }}>{c.element + ' · ' + (RARITY_LABEL[c.rarity] ?? c.rarity)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 66, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{potong(c.name, 30)}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: glow, marginTop: 16 }}>{potong(c.skill, 30)}</div>
          <div style={{ fontSize: 26, opacity: 0.85, marginTop: 12, lineHeight: 1.35 }}>{potong(c.skill_desc, 110)}</div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {stat(c.hp, 'HP', '#8ff0a4')}
          {stat(c.atk, 'ATK', '#ff8b7a')}
          {stat(c.def, 'DEF', '#8fd0ff')}
          {stat(c.spd, 'SPD', '#c08bff')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400, height: 400, borderRadius: 28, overflow: 'hidden', border: `6px solid ${glow}`, background: glow, flexShrink: 0, marginLeft: 'auto', marginRight: 44, alignSelf: 'center' }}>
        {foto
          ? <img src={foto} alt={c.name} width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ fontSize: 180, fontWeight: 800, color: 'rgba(0,0,0,0.7)' }}>{potong(c.name, 1)}</div>}
      </div>
    </div>,
    size,
  )
}