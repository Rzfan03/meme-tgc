'use client'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Bar progress halus di atas layar saat berpindah halaman.
function Loader() {
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

// useSearchParams harus dalam Suspense agar halaman statis (404, dll) tetap bisa di-prerender.
export function PageLoader() {
  return <Suspense><Loader /></Suspense>
}