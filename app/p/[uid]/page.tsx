import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { Share } from '@/components/Share'
import { kartuPamer, koleksiPublik, pemilikPublic } from '@/lib/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const { uid } = await params
  const p = await pemilikPublic(uid)
  if (!p) return { title: 'Profil tidak ditemukan · MultiVerse' }

  const judul = `Profil ${p.nickname} · MultiVerse`
  const desc = `${p.nickname}: ${p.wins} menang · ${p.losses} kalah · rating ${p.rating}`
  return {
    title: judul,
    description: desc,
    openGraph: { title: judul, description: desc, type: 'profile' },
    twitter: { card: 'summary', title: judul, description: desc },
  }
}

export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params
  const p = await pemilikPublic(uid)
  if (!p) notFound()

  const pamer = await kartuPamer(uid)
  const kartu = pamer ?? (await koleksiPublik(uid))
  const awal = p.nickname.trim().slice(0, 1).toUpperCase()

  return (
    <div className="w page">
      <div className="pagehead">
        <span className="ow-av profil-av">{p.avatar ? <img src={p.avatar} alt="" /> : awal}</span>
        <h2>{p.nickname}</h2>
        <p className="sub">{p.wins} menang · {p.losses} kalah · rating {p.rating}</p>
        <div className="actions">
          <Share path={`/p/${uid}`} title={`Profil ${p.nickname} · MultiVerse`}>Bagikan profil</Share>
          <Link href="/create" className="btn ln">Buat kartumu</Link>
        </div>
      </div>

      <p className="rar-cap profil-label">{pamer ? 'Kartu pameran' : 'Koleksi publik'}</p>
      <div className="grid">
        {kartu.length
          ? kartu.map(c => (
            <Link key={c.id} href={`/c/${c.id}`} className="kt-link"><Card c={c} /></Link>
          ))
          : <div className="empty">Belum ada kartu untuk ditampilkan.</div>}
      </div>
    </div>
  )
}