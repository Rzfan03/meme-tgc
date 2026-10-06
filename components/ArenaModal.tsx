'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DoorOpen, Dumbbell, X } from 'lucide-react'

// Modal pilihan mode arena. Dipicu oleh event 'arena-modal' (dikirim dari
// tombol Arena di header / bottom bar) supaya hanya ada satu instance di layar.
export const bukaArena = () => window.dispatchEvent(new Event('arena-modal'))

export function ArenaModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  useEffect(() => {
    const f = () => setOpen(true)
    window.addEventListener('arena-modal', f)
    return () => window.removeEventListener('arena-modal', f)
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
    <div className="arena-modal" role="dialog" aria-modal="true" aria-label="Pilih mode arena">
      <div className="arena-back" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="arena-box">
        <h3>Arena</h3>
        <p className="sub">Mau main yang mana?</p>
        <button className="arena-opt" onClick={() => go('/arena')}><Dumbbell size={22} /><span>Training<small>Lawan bot</small></span></button>
        <button className="arena-opt" onClick={() => go('/rooms')}><DoorOpen size={22} /><span>Online<small>Lawan pemain</small></span></button>
        <button className="x" onClick={() => setOpen(false)} aria-label="Tutup"><X size={20} /></button>
      </div>
    </div>
  )
}