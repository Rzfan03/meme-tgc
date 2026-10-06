'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Layers, MoreHorizontal, Sparkles, Swords } from 'lucide-react'
import { bukaArena } from '@/components/ArenaModal'
import { bukaLainnya } from '@/components/MoreModal'
import type { ComponentType } from 'react'

const TABS: { href: string; label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { href: '/', label: 'Beranda', Icon: Home },
  { href: '/collection', label: 'Koleksi', Icon: Layers },
  { href: '/create', label: 'Buat', Icon: Sparkles },
  { href: '/arena', label: 'Arena', Icon: Swords },
  { href: '/account', label: 'Lainnya', Icon: MoreHorizontal },
]

export function BottomNav() {
  const path = usePathname()
  const arenaOn = path === '/arena' || path.startsWith('/rooms')
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      {TABS.map(({ href, label, Icon }) => {
        if (href === '/arena') return (
          <button key="arena" aria-haspopup="dialog" className={`arena-tab${arenaOn ? ' on' : ''}`} onClick={bukaArena}>
            <Swords size={20} strokeWidth={2.4} />
            <span>Arena</span>
          </button>
        )
        if (href === '/account') return (
          <button key="account" aria-haspopup="dialog" className={`arena-tab${path.startsWith('/account') ? ' on' : ''}`} onClick={bukaLainnya}>
            <MoreHorizontal size={20} strokeWidth={2.4} />
            <span>Lainnya</span>
          </button>
        )
        const on = href === '/' ? path === '/' : path.startsWith(href)
        return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
          <Icon size={20} strokeWidth={2.4} />
          <span>{label}</span>
        </Link>
      })}
    </nav>
  )
}