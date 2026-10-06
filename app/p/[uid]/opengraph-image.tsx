import { ImageResponse } from 'next/og'
import { ELEMENTS, type CardData } from '@/lib/game'
import { kartuPamer, koleksiPublik, pemilikPublic } from '@/lib/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Profil MultiVerse'

const GLOW: Record<string, string> = { 'Holy Card': '#FFD700', Chaoz: '#2D9CDB', Mogger: '#8B5CF6', Sampah: '#FF7A45', 'Tai ayam': '#9AA3AD' }

export default async function Og({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params
  const p = await pemilikPublic(uid)
  if (!p) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0E2E', color: '#8E9BFF', fontSize: 64, fontWeight: 800 }}>MultiVerse</div>,
      size,
    )
  }

  const pamer = await kartuPamer(uid)
  const kartu = pamer ?? (await koleksiPublik(uid))
  const pameran = (kartu ?? []).slice(0, 3) as CardData[]
  const awal = p.nickname.trim().slice(0, 1).toUpperCase()

  // foto avatar + preview kartu diubah jadi data URI dulu agar satori tak gagal
  const toUri = async (url?: string | null) => {
    if (!url) return null
    try {
      const r = await fetch(url as string, { signal: AbortSignal.timeout(4000) })
      if (r.ok) return `data:${r.headers.get('content-type') ?? 'image/webp'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`
    } catch { /* tanpa gambar */ }
    return null
  }
  const ava = await toUri(p.avatar)
  const img = await Promise.all(pameran.map(c => toUri(c.image_url)))

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B0E2E 0%,#151A4D 100%)', color: '#F2F3FF', padding: 60, fontFamily: 'sans-serif', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -160, right: -120, width: 620, height: 620, borderRadius: 999, background: '#8B5CF6', opacity: 0.22 }} />

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#FFD21F' }}>Multi</div>
        <div style={{ marginLeft: 14, fontSize: 20, fontWeight: 700, letterSpacing: 3, opacity: 0.6 }}>VERSE</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '10px 22px', fontSize: 24, fontWeight: 700, border: '2px solid #8B5CF6' }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: '#8B5CF6', marginRight: 12 }} />
          Profil Karang Pemain
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <div style={{ width: 230, height: 230, borderRadius: 999, overflow: 'hidden', border: '6px solid #8B5CF6', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {ava ? <img src={ava} width={230} height={230} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontSize: 120, fontWeight: 800, color: '#8E9BFF' }}>{awal}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 44, minWidth: 0 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#FFD21F' }}>{p.nickname.slice(0, 26)}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
            {[['MENANG', p.wins, '#8ff0a4'], ['KALAH', p.losses, '#ff8b7a'], ['RATING', p.rating, '#8fd0ff']].map(([l, v, c]) => (
              <div key={l as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 18, padding: '16px 26px', border: '2px solid rgba(255,255,255,0.16)' }}>
                <div style={{ fontSize: 46, fontWeight: 800, color: c as string, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 19, fontWeight: 700, opacity: 0.75, marginTop: 6, letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 52, left: 60, right: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 24, opacity: 0.75 }}>{pameran.length ? (pamer ? 'Kartu pameran' : 'Koleksi publik') : 'Belum ada kartu'}</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {pameran.map((c, i) => (
            <div key={c.id} style={{ width: 110, height: 142, borderRadius: 16, overflow: 'hidden', border: `3px solid ${GLOW[c.element] ?? '#8B5CF6'}`, background: GLOW[c.element] ?? '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.75)', fontWeight: 800, fontSize: 20 }}>
              {img[i] ? <img src={img[i]!} width={110} height={142} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 44 }}>{c.emoji ?? c.name.slice(0, 1)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  )
}