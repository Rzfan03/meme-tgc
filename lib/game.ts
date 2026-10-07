export const ELEMENTS = { 'Holy Card': '#FFD700', Chaoz: '#9B6BFF', Mogger: '#2FCA6A', Sampah: '#A0703C', 'Tai ayam': '#9AA3AD', 'Ultra Card': '#FF3B3B' } as const
export type El = keyof typeof ELEMENTS
// Ultra Card beat Holy Card (ikut default else 'Holy Card' di SQL battle), tidak dikalahkan elemen lain — kartu chase 0,5-1%.
export const BEATS: Record<El, El> = { 'Holy Card': 'Mogger', Mogger: 'Chaoz', Chaoz: 'Sampah', Sampah: 'Tai ayam', 'Tai ayam': 'Holy Card', 'Ultra Card': 'Holy Card' }
export const DAILY_LIMIT = 10
export type CardData = { id: string; name: string; element: El; hp: number; atk: number; def: number; spd: number; skill: string; skill_desc: string; hue: number; image_url?: string | null; emoji?: string }

// Ambang kategori (total = hp+atk+def+spd). Knop tuning distribusi; pindah ke atas agar Holy/Card Chaoz makin jarang.
const TIER: [El, number][] = [['Holy Card', 189], ['Chaoz', 179], ['Mogger', 168], ['Sampah', 156]]
export function kategoriDariStat(hp: number, atk: number, def: number, spd: number): El {
  const total = hp + atk + def + spd
  for (const [el, min] of TIER) {
    if (total >= min) {
      if (el === 'Holy Card' && (Math.min(atk, def, spd) < 28 || hp < 59)) continue
      return el
    }
  }
  return 'Tai ayam'
}

export function hit(a: CardData, d: { hp: number; element: El; def: number }): [number, number] {
  const m = BEATS[a.element] === d.element ? 1.5 : BEATS[d.element] === a.element ? 0.7 : 1
  const x = Math.max(4, Math.round(a.atk * m - d.def / 2 + Math.random() * 4))
  d.hp = Math.max(0, d.hp - x)
  return [x, m]
}
const bot = (id: string, name: string, element: El, emoji: string, hp: number, atk: number, def: number, spd: number, skill: string, skill_desc: string, hue: number): CardData => ({ id, name, element, emoji, hp, atk, def, spd, skill, skill_desc, hue })
export const BOTS: CardData[] = [
  bot('b1', 'Kucing Garong', 'Tai ayam', '🐱', 60, 22, 10, 18, 'Meja Terguling', 'Menyerang dengan brutal.', 320),
  bot('b2', 'Pak Ogah', 'Sampah', '🧐', 70, 16, 14, 10, 'Cepek Dulu', 'Bertahan dengan licik.', 40),
  bot('b3', 'Moai Sigma', 'Chaoz', '🗿', 80, 24, 16, 12, 'Tatapan Kosong', 'Diam tapi mematikan.', 200),
  bot('b4', 'Doge Santuy', 'Mogger', '🐶', 65, 14, 12, 14, 'Peluk Hangat', 'Santai tapi tangguh.', 30),
]
