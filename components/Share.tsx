'use client'
import { useState } from 'react'

export function Share({ path, title, children }: { path: string; title: string; children?: React.ReactNode }) {
  const [ok, setOk] = useState<'idle' | 'copied'>('idle')

  const go = async () => {
    const url = location.origin + path
    if (navigator.share) {
      try { await navigator.share({ title, url }); return } catch { /* user batal */ }
    }
    await navigator.clipboard.writeText(url)
    setOk('copied')
    setTimeout(() => setOk('idle'), 1800)
  }

  return <button className="btn" onClick={go} aria-live="polite">{ok === 'copied' ? 'Link tersalin!' : (children ?? 'Bagikan')}</button>
}
