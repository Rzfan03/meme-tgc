'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  RiHomeLine, RiBookOpenLine, RiSparkling2Line, RiGroupLine,
  RiTrophyLine, RiSwordLine, RiStoreLine,
  RiLoginBoxLine, RiLogoutBoxLine, RiSettings3Line, RiUserLine, RiShieldLine, RiSearchLine, RiShieldStarLine,
} from 'react-icons/ri'
import { displayName, useProfile, useSignOut, useUser } from '@/lib/hooks'
import { bukaArena } from '@/components/ArenaModal'
import { NotifBell } from '@/components/NotifBell'

const NAV = [
  { href: '/', label: 'Beranda', Icon: RiHomeLine },
  { href: '/collection', label: 'Koleksi', Icon: RiBookOpenLine },
  { href: '/create', label: 'Buat Kartu', Icon: RiSparkling2Line },
  { href: '/versus', label: 'Versus', Icon: RiGroupLine },
  { href: '/peringkat', label: 'Peringkat', Icon: RiTrophyLine },
  { href: '/market', label: 'Marketplace', Icon: RiStoreLine },
]

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
        {NAV.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={path === href ? 'on' : ''}>
            <Icon size={16} />{label}
          </Link>
        ))}
        <div className="darena">
          <button aria-haspopup="dialog" className={path === '/arena' ? 'on' : ''} onClick={bukaArena}>
            <RiSwordLine size={16} />Arena
          </button>
        </div>
      </nav>
      {!user
        ? <Link href="/masuk" className="btn"><RiLoginBoxLine size={18} />Masuk</Link>
        : <>
          <NotifBell />
          <div className="acct" ref={box}>
            <button className="av" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={displayName(user)}>
              {avatar ? <img src={avatar} alt="" /> : <RiUserLine size={18} />}
            </button>
            {open && (
              <div className="menu" role="menu">
                <p className="who">{profile?.nickname ?? displayName(user)}<small>{user.email}</small></p>
                <Link href="/pemain" role="menuitem" onClick={() => setOpen(false)}><RiSearchLine size={16} />Cari Pemain</Link>
                <Link href="/clan" role="menuitem" onClick={() => setOpen(false)}><RiShieldStarLine size={16} />Clan</Link>
                {profile?.is_admin && <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}><RiShieldLine size={16} />Admin</Link>}
                <Link href="/account" role="menuitem" onClick={() => setOpen(false)}><RiUserLine size={16} />Profil</Link>
                <Link href="/account#pengaturan" role="menuitem" onClick={() => setOpen(false)}><RiSettings3Line size={16} />Pengaturan</Link>
                <button role="menuitem" onClick={signOut}><RiLogoutBoxLine size={16} />Keluar</button>
              </div>
            )}
          </div>
        </>}
    </header>
  )
}
