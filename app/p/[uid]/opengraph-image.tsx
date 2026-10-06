import { ImageResponse } from 'next/og'
import { gambarPng, pemilikPublic } from '@/lib/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Profil MultiVerse'

const potong = (t?: string, n = 90) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : (t ?? ''))

const STAT = (v: number, label: string, color: string) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 18, padding: '14px 0 16px', width: 128, border: '2px solid rgba(255,255,255,0.16)' }}>
    <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>{v}</div>
    <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.75, marginTop: 6, letterSpacing: 1 }}>{label}</div>
  </div>
)

export default async function Og({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params
  const p = await pemilikPublic(uid)
  if (!p) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0E2E', color: '#8E9BFF', fontSize: 64, fontWeight: 800 }}>MultiVerse</div>,
      size,
    )
  }

  const awal = (p.nickname.trim().slice(0, 1) || 'M').toUpperCase()

  const ava = await gambarPng(p.avatar)

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B0E2E 0%,#151A4D 100%)', color: '#F2F3FF', padding: 60, fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', top: -160, right: -120, width: 620, height: 620, borderRadius: 999, background: '#8B5CF6', opacity: 0.22 }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 700, paddingRight: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#FFD21F' }}>Multi</div>
          <div style={{ marginLeft: 14, fontSize: 20, fontWeight: 700, letterSpacing: 3, opacity: 0.6 }}>VERSE</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '10px 22px', fontSize: 24, fontWeight: 700, border: '2px solid #8B5CF6' }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: '#8B5CF6', marginRight: 12 }} />
            Profil Pemain
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#FFD21F' }}>{potong(p.nickname, 26)}</div>
          <div style={{ fontSize: 26, opacity: 0.82, marginTop: 14 }}>{p.wins} menang · {p.losses} kalah · rating {p.rating}</div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {STAT(p.wins, 'MENANG', '#8ff0a4')}
          {STAT(p.losses, 'KALAH', '#ff8b7a')}
          {STAT(p.rating, 'RATING', '#8fd0ff')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400, height: 400, borderRadius: 28, overflow: 'hidden', border: '6px solid #8B5CF6', background: '#0B0E2E', flexShrink: 0 }}>
        {ava
          ? <img src={ava} alt={p.nickname} width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ fontSize: 180, fontWeight: 800, color: '#8E9BFF' }}>{awal}</div>}
      </div>
    </div>,
    size,
  )
}