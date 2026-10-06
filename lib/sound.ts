const pool = new Map<string, HTMLAudioElement>()

export function sfx(name: string, v = 0.8) {
  try {
    if (typeof window === 'undefined') return
    let a = pool.get(name)
    if (!a) { a = new Audio(`/sounds/${name}.mp3`); a.volume = v; pool.set(name, a) }
    a.currentTime = 0
    void a.play().catch(() => {})
  } catch { /* audio diblokir browser, abaikan */ }
}