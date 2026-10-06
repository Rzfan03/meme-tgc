import Link from 'next/link'
import { Camera, Sparkles, Swords } from 'lucide-react'
import { Card } from '@/components/Card'
import { BOTS, ELEMENTS, BEATS } from '@/lib/game'
const STEPS = [{ Icon: Camera, t: 'Upload foto', p: 'Pilih gambar, kami kompres otomatis.' }, { Icon: Sparkles, t: 'AI mencetak kartu', p: 'Nama, elemen, rarity, jurus, dan stat dibuat dari isi fotomu.' }, { Icon: Swords, t: 'Adu di arena', p: 'Susun tiga kartu terbaik dan kalahkan lawan.' }]
export default function Home() {
  return (
    <>
      <section className="hero"><div className="w">
        <div><h1>Semua bisa jadi kartu. Kartumu jadi jagoan.</h1><p>Upload meme, foto, atau apa saja. AI memberi nama, elemen, dan jurus, lalu kartumu siap diadu.</p>
          <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}><Link href="/create" className="btn"><Sparkles size={18} />Buat kartu pertamamu</Link><Link href="/arena" className="btn ln"><Swords size={18} />Langsung battle</Link></div></div>
        <div className="fan">{[BOTS[3], BOTS[1], BOTS[2]].map(c => <Card key={c.id} c={c} tilt={false} />)}</div>
      </div></section>
      <div className="w sec"><h2>Tiga langkah, langsung main</h2><p className="sub">Semua kartu berasal dari fotomu sendiri.</p>
        <div className="steps">{STEPS.map(({ Icon, t, p }) => <div className="step" key={t}><b><Icon size={20} /></b><h3>{t}</h3><p>{p}</p></div>)}</div></div>
      <div className="w sec"><h2>Lima elemen</h2><p className="sub">Setiap elemen unggul atas satu elemen lain.</p>
        <div className="els">{(Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[]).map(k => <div className="el" key={k} style={{ '--c': ELEMENTS[k] } as React.CSSProperties}><b>{k}</b><small>unggul atas {BEATS[k]}</small></div>)}</div></div>
    </>
  )
}
