'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RiLoginBoxLine, RiUserAddLine } from 'react-icons/ri'
import { supabase } from '@/lib/supabase'

export default function Masuk() {
  const router = useRouter()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState(''), [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [sukses, setSukses] = useState('')
  useEffect(() => { if (new URLSearchParams(location.search).get('daftar')) setMode('up') }, [])
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(''); setSukses('')
    const clean = email.trim().toLowerCase()
    const r = mode === 'up'
      ? await supabase.auth.signUp({ email: clean, password: pass, options: { data: { full_name: clean.split('@')[0] } } })
      : await supabase.auth.signInWithPassword({ email: clean, password: pass })
    setBusy(false)
    if (r.error) return setMsg(r.error.message)
    if (mode === 'up' && !r.data.session) return setSukses('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.')
    router.replace('/')
  }
  return (
    <div className="w page" style={{ maxWidth: 460 }}>
      <div className="pagehead"><h2>{mode === 'in' ? 'Masuk' : 'Daftar'}</h2><p className="sub">Akun dipakai untuk menyimpan kartumu.</p></div>
      <form onSubmit={go} className="panel" style={{ display: 'grid', gap: '.8rem' }}>
        <input className="bar-in" type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="bar-in" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Password (min. 6)" aria-label="Password" value={pass} onChange={e => setPass(e.target.value)} />
        <button className="btn" disabled={busy}>{mode === 'in' ? <RiLoginBoxLine size={18} /> : <RiUserAddLine size={18} />}{busy ? 'Tunggu…' : mode === 'in' ? 'Masuk' : 'Buat akun'}</button>
        {msg && <p className="err">{msg}</p>}
        {sukses && <p className="ok">{sukses}<br /><button type="button" className="linkish" onClick={() => { setMode('in'); setSukses('') }}>Sudah konfirmasi? Masuk</button></p>}
      </form>
      <p className="sub" style={{ textAlign: 'center' }}>
        {mode === 'in' ? 'Belum punya akun?' : 'Sudah punya?'}{' '}
        <button className="linkish" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>{mode === 'in' ? 'Daftar' : 'Masuk'}</button>
      </p>
      <p className="sub" style={{ textAlign: 'center' }}><Link href="/">← Kembali ke beranda</Link></p>
    </div>
  )
}
