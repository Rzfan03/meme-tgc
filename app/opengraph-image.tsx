import { ImageResponse } from 'next/og'
import { BOTS, ELEMENTS } from '@/lib/game'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'MultiVerse — Ubah fotomu jadi kartu petarung'

function mini(bg: string, name: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 210, height: 300, borderRadius: 22, border: `4px solid ${bg}`, background: 'rgba(10,14,38,0.85)', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}>
      <div style={{ width: 130, height: 130, borderRadius: 999, background: bg, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 62, fontWeight: 800, color: '#0B0E2E' }}>{name[0]}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#F2F3FF', marginTop: 22, textAlign: 'center', lineHeight: 1 } as const}>{name}</div>
    </div>
  )
}

export default function Og() {
  const glow = ELEMENTS['Holy Card']
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B0E2E 0%,#151A4D 100%)', color: '#F2F3FF', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -180, right: -140, width: 640, height: 640, borderRadius: 999, background: glow, opacity: 0.18 }} />
      <div style={{ position: 'absolute', bottom: -200, left: -140, width: 560, height: 560, borderRadius: 999, background: '#2D9CDB', opacity: 0.12 }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640, padding: '56px 0 56px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 800, color: '#FFD21F' }}>Multi</div>
          <div style={{ marginLeft: 18, fontSize: 30, fontWeight: 700, letterSpacing: 5, opacity: 0.6 }}>VERSE</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 86, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Foto apa saja bisa jadi kartu jagoan.</div>
          <div style={{ fontSize: 30, opacity: 0.85, marginTop: 26, lineHeight: 1.35 }}>Upload meme atau foto, AI memberi nama, element, &amp; jurus — langsung adu di arena.</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 34 }}>
            {(Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[]).filter(e => e !== 'Ultra Card').map(e => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: `2px solid ${ELEMENTS[e]}`, borderRadius: 999, padding: '10px 20px', fontSize: 20, fontWeight: 700 }}>
                <div style={{ width: 14, height: 14, borderRadius: 999, background: ELEMENTS[e], marginRight: 10 }} />
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, width: 560 }}>
        {mini(ELEMENTS[BOTS[3].element], BOTS[3].name)}
        {mini(ELEMENTS[BOTS[2].element], BOTS[2].name)}
        {mini(ELEMENTS[BOTS[1].element], BOTS[1].name)}
      </div>
    </div>,
    size,
  )
}