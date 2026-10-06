'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Bar progress halus di atas layar saat berpindah halaman.
export function PageLoader() {
  const path = usePathname()
  const sp = useSearchParams()
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(true)
    const t = setTimeout(() => setOn(false), 450)
    return () => clearTimeout(t)
  }, [path, sp])
  return <div className={`pgbar${on ? ' on' : ''}`} aria-hidden />
}