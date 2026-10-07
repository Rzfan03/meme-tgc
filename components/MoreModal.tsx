'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RiBellLine, RiGroupLine, RiLoginBoxLine, RiSearchLine, RiSettings3Line, RiStoreLine, RiTrophyLine, RiUserLine, RiCloseLine } from 'react-icons/ri'
import { useNotifs, useUser } from '@/lib/hooks'

export const bukaLainnya = () => window.dispatchEvent(new Event('menu-lainnya'))

export function MoreModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = useUser()
  const { unread } = useNotifs()
  useEffect(() => {
    const f = () => setOpen(true)
    window.addEventListener('menu-lainnya', f)
    return () => window.removeEventListener('menu-lainnya', f)
  }, [])
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', key) }
  }, [open])
  const go = (href: string) => { setOpen(false); router.push(href) }
  if (!open) return null
  return (
    <div className="arena-modal" role="dialog" aria-modal="true" aria-label="Menu lainnya">
      <div className="arena-back" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="arena-box">
        <h3>Lainnya</h3>
        <button className="arena-opt" onClick={() => go('/pemain')}><RiSearchLine size={22} /><span>Cari Pemain<small>Temukan pemain lain via nama</small></span></button>
        <button className="arena-opt" onClick={() => go('/peringkat')}><RiTrophyLine size={22} /><span>Peringkat<small>Leaderboard rating & tantang pemain</small></span></button>
        <button className="arena-opt" onClick={() => go('/clan')}><RiGroupLine size={22} /><span>Clan<small>Buat clan & tag tampil saat battle</small></span></button>
        <button className="arena-opt" onClick={() => go('/market')}><RiStoreLine size={22} /><span>Marketplace<small>Beli & jual kartu dengan poin</small></span></button>
        <button className="arena-opt" onClick={() => go('/notif')}><RiBellLine size={22} /><span>Notifikasi<small>{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</small></span></button>
        <button className="arena-opt" onClick={() => go('/account')}><RiUserLine size={22} /><span>Profil<small>Akun, kartu & halaman publik</small></span></button>
        {user
          ? <button className="arena-opt" onClick={() => go('/account#pengaturan')}><RiSettings3Line size={22} /><span>Pengaturan<small>Tampilan & lainnya</small></span></button>
          : <button className="arena-opt" onClick={() => go('/masuk')}><RiLoginBoxLine size={22} /><span>Masuk<small>Buka sesi kamu</small></span></button>}
        <button className="x" onClick={() => setOpen(false)} aria-label="Tutup"><RiCloseLine size={20} /></button>
      </div>
    </div>
  )
}
