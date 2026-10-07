'use client'
import Link from 'next/link'
import { RiBellLine, RiCheckLine } from 'react-icons/ri'
import { useNotifs } from '@/lib/hooks'

const waktu = (iso: string) => {
  const d = new Date(iso), m = Math.floor((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return m + ' mnt lalu'
  const j = Math.floor(m / 60)
  if (j < 24) return j + ' jam lalu'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function NotifPage() {
  const { list, unread, markAll } = useNotifs()

  return (
    <div className="w page">
      <div className="pagehead notif-head">
        <div>
          <h2>Notifikasi</h2>
          <p className="sub">{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca.'}</p>
        </div>
        {list.length > 0 && <button className="btn ln" onClick={markAll}><RiCheckLine size={16} />Tandai semua dibaca</button>}
      </div>

      <div className="panel notif-list">
        {list.length
          ? list.map(n => (
            <div key={n.id} className={`notif-item${n.read ? '' : ' nou'}`}>
              <b>{n.title}</b>
              <span>{n.body}</span>
              <small>{waktu(n.created_at)}</small>
            </div>
          ))
          : <div className="empty"><RiBellLine size={26} /><span>Belum ada notifikasi.</span><small>Pemberitahuan seperti hasil battle dan pembelian akan muncul di sini.</small></div>}
      </div>

      <p className="sub" style={{ textAlign: 'center' }}><Link href="/" className="mkt-reset">Kembali ke beranda</Link></p>
    </div>
  )
}