'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RiCameraLine, RiLoader4Line, RiSparkling2Line, RiSwordLine, RiCloseLine } from 'react-icons/ri'
import { Card } from '@/components/Card'
import { Share } from '@/components/Share'
import { CardDetail } from '@/components/CardDetail'
import { accessToken, useUser } from '@/lib/hooks'
import { sfx } from '@/lib/sound'
import { DAILY_LIMIT, type CardData } from '@/lib/game'

const MAX_NAME = 40
const CONTOH = ['Ichigo Kurosaki', 'Zenitsu Agatsuma', 'Gojo Satoru', 'Monkey D. Luffy']

async function compress(f: File): Promise<File> {
  const bmp = await createImageBitmap(f)
  const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s))
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob: Blob = await new Promise(r => c.toBlob(x => r(x!), 'image/webp', 0.82))
  return new File([blob], 'card.webp', { type: 'image/webp' })
}

export default function Create() {
  const { user } = useUser()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [card, setCard] = useState<CardData | null>(null)
  const [open, setOpen] = useState<CardData | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // object URL harus di-revoke, kalau tidak tiap render menumpuk di memori
  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const clean = name.trim()
  const canGo = clean.length >= 2 && clean.length <= MAX_NAME && !busy

  const gen = async () => {
    if (!canGo) return
    setBusy(true); setErr('')
    try {
      const token = await accessToken()
      if (!token) throw new Error('Sesi habis. Masuk ulang lalu coba lagi.')
      const fd = new FormData()
      fd.append('name', clean)
      if (photo) fd.append('image', await compress(photo))
      const r = await fetch('/api/generate', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setCard(j); setName(''); setPhoto(null); sfx('success')
    } catch (e) { setErr((e as Error).message); sfx('error') }
    setBusy(false)
  }

  if (!user) return <div className="w page"><div className="pagehead"><h2>Buat kartu baru</h2><p className="sub">Masuk dulu supaya kartumu tersimpan.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>

  return (
    <div className="w page">
      <div className="pagehead">
        <h2>Buat kartu baru</h2>
        <p className="sub">Tulis nama karaktermu, AI menghitung stats, elemen, dan jurus dari kemampuan aslinya. Foto boleh diisi atau dikosongkan. Jatah {DAILY_LIMIT} kartu per hari.</p>
      </div>

      <div className="create">
        <div className="stack">
          <div className="namerow">
            <RiSwordLine size={22} />
            <input
              id="n"
              className="namin"
              value={name}
              maxLength={MAX_NAME}
              placeholder="Nama karakter, mis. Ichigo Kurosaki"
              autoComplete="off"
              onChange={e => { setName(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && gen()}
            />
            <small>{clean.length < 2 ? `${MAX_NAME} karakter` : `${clean.length}/${MAX_NAME}`}</small>
          </div>

          <div className={`photobox ${preview ? 'has' : ''}`} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f?.type.startsWith('image/')) setPhoto(f); e.target.value = '' }} />
            {preview
              ? <><img src={preview} alt="Foto kartu" /><span className="rm" onClick={e => { e.stopPropagation(); setPhoto(null) }}><RiCloseLine size={14} /></span></>
              : <><RiCameraLine size={20} /><span>Foto kartu (opsional)</span></>}
          </div>

          <div className="chips">
            {CONTOH.map(c => (
              <button key={c} className="ex" onClick={() => { setName(c); setErr('') }}>{c}</button>
            ))}
          </div>

          <button className="btn bl full" disabled={!canGo} onClick={gen}>
            {busy ? <RiLoader4Line size={18} className="spin" /> : <RiSparkling2Line size={18} />}
            {busy ? 'AI sedang menghitung...' : photo ? 'Cetak dengan foto' : 'Cetak kartu'}
          </button>
          {err && <p className="err">{err}</p>}
        </div>

        <div className="stage">
          {card
            ? <div className="rv" style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: '.7rem' }}><Card c={card} onClick={() => setOpen(card)} /><p style={{ margin: '.5rem 0 .3rem', textAlign: 'center' }}><b>{card.name}</b> masuk koleksi sebagai <b>{card.element}</b></p><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center' }}><Link href="/collection" className="btn">Lihat koleksi</Link><button className="btn ln" onClick={() => setCard(null)}>Cetak lagi</button><Share path={`/c/${card.id}`} title={`${card.name} · MultiVerse`}>Share</Share></div></div>
            : <div className="idle"><RiSparkling2Line size={40} /><p>Ketik nama karakter,<br />kartunya akan muncul di sini.</p></div>}
        </div>
      </div>
      <CardDetail c={open} onClose={() => setOpen(null)} />
    </div>
  )
}
