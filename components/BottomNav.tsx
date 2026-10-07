'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RiHomeLine, RiBookOpenLine, RiSparkling2Line, RiSwordLine, RiMoreLine } from 'react-icons/ri'
import { bukaArena } from '@/components/ArenaModal'
import { bukaLainnya } from '@/components/MoreModal'

const TABS = [
  { href: '/', label: 'Beranda', Icon: RiHomeLine },
  { href: '/collection', label: 'Koleksi', Icon: RiBookOpenLine },
  { href: '/create', label: 'Buat', Icon: RiSparkling2Line },
  { href: '/arena', label: 'Arena', Icon: RiSwordLine },
]

export function BottomNav() {
  const path = usePathname()
  const arenaOn = path === '/arena' || path.startsWith('/rooms') || path.startsWith('/versus')
  const moreOn = ['/account', '/pemain', '/peringkat', '/notif', '/market', '/clan'].some(p => path.startsWith(p))
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      {TABS.map(({ href, label, Icon }) => {
        if (href === '/arena') return (
          <button key="arena" aria-haspopup="dialog" className={`arena-tab${arenaOn ? ' on' : ''}`} onClick={bukaArena}>
            <RiSwordLine size={22} />
            <span>{label}</span>
          </button>
        )
        const on = href === '/' ? path === '/' : path.startsWith(href)
        return (
          <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        )
      })}
      <button className={`arena-tab${moreOn ? ' on' : ''}`} onClick={bukaLainnya} aria-label="Menu lainnya">
        <RiMoreLine size={22} />
        <span>Lainnya</span>
      </button>
    </nav>
  )
}
