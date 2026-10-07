import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { Share } from '@/components/Share'
import { ELEMENTS, type CardData } from '@/lib/game'
import { kartuPublic, pemilikPublic } from '@/lib/server'

export const dynamic = 'force-dynamic'

type Publik = CardData & { user_id: string; created_at: string }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const c = (await kartuPublic(id)) as Publik | null
  if (!c) return { title: 'Kartu tidak ditemukan · MultiVerse' }

  const desc = `${c.element} · ${c.skill}: ${c.skill_desc} (HP ${c.hp} · ATK ${c.atk} · DEF ${c.def} · SPD ${c.spd})`
  const judul = `${c.name} · MultiVerse`
  return {
    title: judul,
    description: desc,
    openGraph: { title: judul, description: desc, type: 'article' },
    twitter: { card: 'summary_large_image', title: judul, description: desc },
  }
}

const TGL = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const STATS = [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD']] as const

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = (await kartuPublic(id)) as Publik | null
  if (!c) notFound()

  const p = await pemilikPublic(c.user_id)
  const v = c as unknown as Record<string, number>
  const awal = (p?.nickname ?? 'M').trim().slice(0, 1).toUpperCase()

  return (
    <div className="w sharepage">
      <div className="shareowner">
        <span className="ow-av">{p?.avatar ? <img src={p.avatar} alt="" /> : awal}</span>
        <div>
          <span className="rar-cap">Dibagikan oleh</span>
          <b>{p?.nickname ?? 'Pemain MultiVerse'}</b>
          <small>{p ? `${p.wins} menang · ${p.losses} kalah · rating ${p.rating}` : 'Pemilik kartu ini belum mengisi profil.'}</small>
          {p && <Link href={`/p/${c.user_id}`}>Lihat profil →</Link>}
        </div>
      </div>

      <div className="sharecard">
        <Card c={c} />
        <div className="panel sharepanel">
          <div>
            <span className="rar-cap">{c.element}</span>
            <h1>{c.name}</h1>
          </div>

          <div className="sharechips">
            <span className="sharechip" style={{ '--c': ELEMENTS[c.element] } as React.CSSProperties}>{c.element}</span>
            <span className="sharemeta2">Dibuat {TGL(c.created_at)}</span>
          </div>

          <div className="sharestat">
            {STATS.map(([k, label]) => <div className="ss" key={k}><b>{v[k]}</b><small>{label}</small></div>)}
          </div>

          <div className="shareab">
            <b>{c.skill}</b>
            <p>{c.skill_desc}</p>
          </div>

          <div className="sharebtns">
            <Share path={`/c/${c.id}`} title={`${c.name} · MultiVerse`}>Bagikan kartu ini</Share>
            <Link href="/create" className="btn ln">Buat kartumu</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
