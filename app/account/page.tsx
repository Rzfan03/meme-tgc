'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Library, Search, Settings, User, Camera } from 'lucide-react'
import { Card } from '@/components/Card'
import { Pamer } from '@/components/Pamer'
import { Share } from '@/components/Share'
import { CardGridSkeleton } from '@/components/Skeleton'
import { displayName, useCards, useProfile, useUser } from '@/lib/hooks'

const THEMES = [['sistem', 'Sistem'], ['terang', 'Terang'], ['gelap', 'Gelap']] as const
type Theme = (typeof THEMES)[number][0]
const THEME_KEY = 'kartuku:theme'
const MAX_EDGE = 256, MAX_BYTES = 120_000

function applyTheme(t: Theme) {
  if (t === 'sistem') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t === 'gelap' ? 'dark' : 'light'
}

// Ubah file gambar jadi data URI: perkecil ke MAX_EDGE, kompres webp, turunkan kualitas
// sampai muat di bawah MAX_BYTES. Data URI supaya tidak perlu bucket Storage.
async function toDataImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  for (const q of [0.82, 0.7, 0.6, 0.45]) {
    const uri = c.toDataURL('image/webp', q)
    if (uri.length * 0.75 <= MAX_BYTES) return uri
  }
  throw new Error('Gambar masih terlalu besareven setelah dikecilkan.')
}

export default function Account() {
  const { user } = useUser()
  const { profile, reload, save } = useProfile()
  const { cards, loading } = useCards()
  const [nick, setNick] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [theme, setTheme] = useState<Theme>('sistem'), file = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = (localStorage.getItem(THEME_KEY) as Theme) || 'sistem'; setTheme(t); applyTheme(t) }, [])
  useEffect(() => { if (profile) setNick(profile.nickname) }, [profile])
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  if (!user) return <div className="w page"><div className="pagehead"><h2>Belum masuk</h2><p className="sub"><Link href="/masuk">Masuk dulu</Link> supaya bisa ubah profil.</p></div></div>

  const pick = async (f?: File) => {
    if (!f?.type.startsWith('image/')) return say('File harus berupa gambar.')
    if (f.size > 8_000_000) return say('File terlalu besar (maks 8 MB).')
    setBusy(true)
    try { const { error } = await save({ avatar: await toDataImage(f) }); say(error ? `Gagal: ${error}` : 'Avatar disimpan!') }
    catch (e) { say((e as Error).message) }
    setBusy(false); if (file.current) file.current.value = ''
  }

  return (
    <div className="w page">
      <div className="pagehead"><h2>Akun</h2><p className="sub">{user.email}</p></div>

      <section className="panel" id="profil">
        <h3><User size={20} />Profil</h3>
        <div className="row">
          <button className="av av-lg" onClick={() => file.current?.click()} title="Ganti avatar" aria-label="Ganti avatar">
            {profile?.avatar ? <img src={profile.avatar} alt="" /> : <Camera size={22} />}
          </button>
          <div><b>{displayName(user)}</b><br /><small className="sub" style={{ margin: 0 }}>{profile?.nickname ?? 'Belum ada nama tampilan'}</small></div>
          <input ref={file} type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])} />
        </div>
        <div className="bar" style={{ margin: '1rem 0 0' }}>
          <Link href={`/p/${user.id}`} className="btn ln"><User size={18} />Halaman profil publik</Link>
          <Link href="/pemain" className="btn ln"><Search size={18} />Cari pemain</Link>
          <Pamer />
          <Share path={`/p/${user.id}`} title={`Profil ${profile?.nickname ?? displayName(user)} · MultiVerse`}>Bagikan profil</Share>
        </div>
        {profile && <>
          <div className="row" style={{ margin: '1.2rem 0' }}>
            <div className="stat"><b>{profile.wins}</b><small>Menang</small></div>
            <div className="stat"><b>{profile.losses}</b><small>Kalah</small></div>
            <div className="stat"><b>{profile.rating}</b><small>Rating</small></div>
            <div className="stat"><b>{profile.points.toLocaleString('id-ID')}</b><small>Poin</small></div>
          </div>
          <div className="bar" style={{ margin: 0 }}>
            <input value={nick} maxLength={24} onChange={e => setNick(e.target.value)} placeholder="Nama tampilan" aria-label="Nama tampilan" />
            <button className="btn" disabled={busy || !nick.trim()} onClick={async () => { setBusy(true); const { error } = await save({ nickname: nick.trim() }); setBusy(false); say(error ? `Gagal: ${error}` : 'Tersimpan!') }}>Simpan</button>
          </div>

          <h3 style={{ marginTop: '1.6rem' }}><Library size={20} />Kartu terbaru</h3>
          <div className="grid">
            {loading ? <CardGridSkeleton n={6} />
              : cards.length ? cards.slice(0, 6).map(c => <Link key={c.id} href={`/c/${c.id}`} className="kt-link"><Card c={c} /></Link>)
                : <div className="empty">Belum ada kartu.<br /><Link href="/create" className="btn" style={{ marginTop: '.8rem' }}>Buat kartu</Link></div>}
          </div>
          {cards.length > 6 && <p style={{ textAlign: 'center', margin: '1rem 0 0' }}><Link href="/collection" className="btn ln">Lihat semua ({cards.length})</Link></p>}
        </>}
        {!profile && <p className="sub" style={{ marginTop: '1.2rem', marginBottom: 0 }}>Profil tidak terbaca. Pastikan semua migrasi <code>supabase/*.sql</code> sudah dijalankan di SQL Editor Supabase.</p>}
        {msg && <p className="ok">{msg}</p>}
      </section>

      <section className="panel" id="pengaturan">
        <h3><Settings size={20} />Pengaturan</h3>
        <p className="sub" style={{ margin: 0 }}>Tampilan</p>
        <div className="seg" style={{ marginTop: '.6rem' }}>
          {THEMES.map(([val, label]) => <button key={val} className={`chip${theme === val ? ' on' : ''}`} onClick={() => { setTheme(val); applyTheme(val); localStorage.setItem(THEME_KEY, val) }}>{label}</button>)}
        </div>
      </section>
    </div>
  )
}
