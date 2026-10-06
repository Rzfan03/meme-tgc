'use client'
import { useEffect } from 'react'
import { sfx } from '@/lib/sound'

export default function SoundClicks() {
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('button, select, a.btn, .p-buy, .mkt-chk, .mkt-reset, .x')) sfx('click', 0.45)
    }
    document.addEventListener('click', on)
    return () => document.removeEventListener('click', on)
  }, [])
  return null
}