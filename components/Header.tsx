'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Home, Library, Sparkles, Swords, Store, Users, LogIn, LogOut, Settings, User } from 'lucide-react'
import { displayName, useProfile, useSignOut, useUser } from '@/lib/hooks'
import { bukaArena } from '@/components/ArenaModal'
import { NotifBell } from '@/components/NotifBell'
const NAV = [{ href: '/', label: 'Beranda', Icon: Home }, { href: '/collection', label: 'Koleksi', Icon: Library }, { href: '/create', label: 'Buat Kartu', Icon: Sparkles }, { href: '/versus', label: 'Versus', Icon: Users }, { href: '/market', label: 'Market', Icon: Store }]
export function Header() {
  const path = usePathname(), { user } = useUser(), { profile } = useProfile(), signOut = useSignOut()
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', key) }
  }, [open])
  const avatar = profile?.avatar
  return (
    <header>
      <Link href="/" className="logo d">Multi<i>Verse</i></Link>
      <nav>
        {NAV.map(({ href, label, Icon }) => <Link key={href} href={href} className={path === href ? 'on' : ''}><Icon size={18} />{label}</Link>)}
        <div className="darena">
          <button aria-haspopup="dialog" className={path === '/arena' ? 'on' : ''} onClick={bukaArena}><Swords size={18} />Arena</button>
        </div>
      </nav>
      {!user
        ? <Link href="/masuk" className="btn"><LogIn size={18} />Masuk</Link>
        : <>
          <NotifBell />
          <div className="acct" ref={box}>
          <button className="av" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={displayName(user)}>
            {avatar ? <img src={avatar} alt="" /> : <User size={18} />}
          </button>
          {open && <div className="menu" role="menu">
            <p className="who">{profile?.nickname ?? displayName(user)}<small>{user.email}</small></p>
            <Link href="/account" role="menuitem" onClick={() => setOpen(false)}><User size={16} />Profil</Link>
            <Link href="/account#pengaturan" role="menuitem" onClick={() => setOpen(false)}><Settings size={16} />Pengaturan</Link>
            <button role="menuitem" onClick={signOut}><LogOut size={16} />Keluar</button>
          </div>}
          </div>
        </>}
    </header>
  )
}
