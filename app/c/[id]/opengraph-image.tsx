import { ImageResponse } from 'next/og'
import { ELEMENTS, RARITY_LABEL, type CardData } from '@/lib/game'
import { kartuPublic } from '@/lib/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Kartu Meme TGC'

const potong = (t?: string, n = 90) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : (t ?? ''))

const STAT = (v: number, label: string, color: string) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 18, padding: '14px 0 16px', width: 128, border: '2px solid rgba(255,255,255,0.16)' }}>
    <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>{v}</div>
    <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.75, marginTop: 6, letterSpacing: 1 }}>{label}</div>
  </div>
)

export default async function Og({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = (await kartuPublic(id)) as CardData | null
  if (!c) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0E2E', color: '#8E9BFF', fontSize: 64, fontWeight: 800 }}>Meme TGC</div>,
      size,
    )
  }

  const glow = ELEMENTS[c.element] ?? '#8B5CF6'

  // satori gagal total kalau fetch gambar gagal, jadi foto dit jadi data URI lebih dulu
  let foto: string | null = null
  if (c.image_url) {
    try {
      const r = await fetch(c.image_url, { signal: AbortSignal.timeout(4000) })
      if (r.ok) foto = `data:${r.headers.get('content-type') ?? 'image/webp'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`
    } catch { /* biarkan tanpa foto */ }
  }

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B0E2E 0%,#151A4D 100%)', color: '#F2F3FF', padding: 60, fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', top: -160, right: -120, width: 620, height: 620, borderRadius: 999, background: glow, opacity: 0.22 }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 700, paddingRight: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#FFD21F' }}>MEME</div>
          <div style={{ marginLeft: 14, fontSize: 20, fontWeight: 700, letterSpacing: 3, opacity: 0.6 }}>TGC</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '10px 22px', fontSize: 24, fontWeight: 700, border: `2px solid ${glow}` }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: glow, marginRight: 12 }} />
            {c.element} · {RARITY_LABEL[c.rarity]}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{potong(c.name, 24)}</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: glow, marginTop: 18 }}>{potong(c.skill, 30)}</div>
          <div style={{ fontSize: 25, opacity: 0.82, marginTop: 12, lineHeight: 1.35 }}>{potong(c.skill_desc, 110)}</div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {STAT(c.hp, 'HP', '#8ff0a4')}
          {STAT(c.atk, 'ATK', '#ff8b7a')}
          {STAT(c.def, 'DEF', '#8fd0ff')}
          {STAT(c.spd, 'SPD', '#c08bff')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400, height: 400, borderRadius: 28, overflow: 'hidden', border: `6px solid ${glow}`, background: glow, flexShrink: 0 }}>
        {foto
          ? <img src={foto} alt={c.name} width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ fontSize: 180, fontWeight: 800, color: 'rgba(0,0,0,0.7)' }}>{potong(c.name, 1)}</div>}
      </div>
    </div>,
    size,
  )
}
