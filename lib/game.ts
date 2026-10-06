export const ELEMENTS = { 'Holy Card': '#FFD700', Chaoz: '#2D9CDB', Mogger: '#8B5CF6', Sampah: '#FF7A45', 'Tai ayam': '#9AA3AD' } as const
export type El = keyof typeof ELEMENTS
export const BEATS: Record<El, El> = { 'Holy Card': 'Mogger', Mogger: 'Chaoz', Chaoz: 'Sampah', Sampah: 'Tai ayam', 'Tai ayam': 'Holy Card' }
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Umum', rare: 'Langka', epic: 'Epik', legendary: 'Legendaris' }
export const BUDGET: Record<Rarity, number> = { common: 100, rare: 120, epic: 140, legendary: 165 }
export const DAILY_LIMIT = 10
export type CardData = { id: string; name: string; element: El; rarity: Rarity; hp: number; atk: number; def: number; spd: number; skill: string; skill_desc: string; hue: number; image_url?: string | null; emoji?: string }
export function rarityFromHash(h: string): Rarity {
  const r = parseInt(h.slice(0, 8), 16) / 0xffffffff
  return r < 0.08 ? 'legendary' : r < 0.25 ? 'epic' : r < 0.55 ? 'rare' : 'common'
}
export function hit(a: CardData, d: { hp: number; element: El; def: number }): [number, number] {
  const m = BEATS[a.element] === d.element ? 1.5 : BEATS[d.element] === a.element ? 0.7 : 1
  const x = Math.max(4, Math.round(a.atk * m - d.def / 2 + Math.random() * 4))
  d.hp = Math.max(0, d.hp - x)
  return [x, m]
}
const bot = (id: string, name: string, element: El, emoji: string, rarity: Rarity, hp: number, atk: number, def: number, spd: number, skill: string, skill_desc: string, hue: number): CardData => ({ id, name, element, emoji, rarity, hp, atk, def, spd, skill, skill_desc, hue })
export const BOTS: CardData[] = [
  bot('b1', 'Kucing Garong', 'Tai ayam', '🐱', 'epic', 60, 22, 10, 18, 'Meja Terguling', 'Menyerang dengan brutal.', 320),
  bot('b2', 'Pak Ogah', 'Sampah', '🧐', 'rare', 70, 16, 14, 10, 'Cepek Dulu', 'Bertahan dengan licik.', 40),
  bot('b3', 'Moai Sigma', 'Chaoz', '🗿', 'legendary', 80, 24, 16, 12, 'Tatapan Kosong', 'Diam tapi mematikan.', 200),
  bot('b4', 'Doge Santuy', 'Mogger', '🐶', 'common', 65, 14, 12, 14, 'Peluk Hangat', 'Santai tapi tangguh.', 30),
]
