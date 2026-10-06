'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNotifs } from '@/lib/hooks'

const waktu = (iso: string) => {
  const d = new Date(iso), m = Math.floor((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return m + ' mnt lalu'
  const j = Math.floor(m / 60)
  if (j < 24) return j + ' jam lalu'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function NotifBell() {
  const { list, unread, markAll } = useNotifs()
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', key) }
  }, [open])

  return (
    <div className="nbell" ref={box}>
      <button className="nbell-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`} onClick={() => setOpen(!open)}>
        <Bell size={18} />
        {unread > 0 && <span className="nbadge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && <div className="menu ndrop" role="menu" aria-label="Notifikasi">
        <p className="who nm-title">Notifikasi</p>
        {list.length ? <>
          {list.map(n => (
            <div key={n.id} className={`notif-item${n.read ? '' : ' nou'}`}>
              <b>{n.title}</b>
              <span>{n.body}</span>
              <small>{waktu(n.created_at)}</small>
            </div>
          ))}
          {unread > 0 && <button className="nmark" onClick={markAll}><Check size={16} />Tandai semua dibaca</button>}
        </> : <p className="nempty">Belum ada notifikasi.</p>}
      </div>}
    </div>
  )
}