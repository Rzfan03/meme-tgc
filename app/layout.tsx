import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { ArenaModal } from '@/components/ArenaModal'
import { MoreModal } from '@/components/MoreModal'
import { Analytics } from '@/components/Analytics'
export const metadata: Metadata = { title: 'Meme TGC', description: 'Ubah fotomu jadi kartu petarung.' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" /></head>
      <body><Analytics /><ArenaModal /><MoreModal /><Header /><main>{children}</main><BottomNav /></body>
    </html>
  )
}
