import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { DAILY_LIMIT, kategoriDariStat, type El } from '@/lib/game'
export const runtime = 'nodejs'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BUCKET = process.env.SUPABASE_BUCKET ?? 'kartuku-cards'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Cloudflare Groq balas 1010 kalau request tanpa User-Agent browser-like
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const err = (m: string, s: number) => NextResponse.json({ error: m }, { status: s })
const PROMPT = `Kamu desainer stat kartu game. Dari NAMA karakter yang diberikan, buat kartu sesuai kemampuan aslinya, dengan stat yang ADIL, PRESISI, dan seimbang.
Balas HANYA JSON: {"safe":boolean,"skill":string (maks 3 kata),"skill_desc":string (maks 12 kata, bahasa Indonesia),"weights":{"hp":1-9,"atk":1-9,"def":1-9,"spd":1-9}}.
Aturan PENAKARAN STAT (paling penting):
- weights menentukan KUAT/LEMAHNYA kartu. Total weights menentukan kategori: Tai ayam/Sampah untuk kartu lemah, Mogger/Chaoz untuk menengah, Holy Card hanya untuk karakter sangat kuat dengan semua stat besar dan SEIMBANG.
- Masing-masing weights antara 1 dan 9. Total anything dari 16 (kartu lemah) sampai 24 (kartu sangat kuat) — SESUAIKAN total dengan seberapa kuat karakter itu seharusnya. Jangan ratakan semua 6 supaya semua jadi Holy Card.
- Bagikan poin proporsional kemampuan nyata. Keseimbangan hp/def (bertahan) melawan atk/spd (menyerang) harus masuk akal.
- Glosarium: hp = ketahanan, atk = serangan, def = pertahanan, spd = kecepatan.
- Contoh skala yang adil (total 24):
  • Tank: hp 8, def 8, atk 4, spd 4.
  • Glass cannon: atk 8, spd 8, hp 5, def 3.
  • Seimbang: hp 6, atk 6, def 6, spd 6.
- Kalau karakter dikenal, teliti kemampuan kanoniknya dan sesuaikan. Contoh: "Ichigo Kurosaki" (Bleach) = Bankai, pedang Zangetsu, regenerasi cepat → condong atk+spd, misal hp 6, atk 7, def 5, spd 6.
- Kalau nama tidak dikenal atau bukan tokoh, buat stat masuk akal sesuai nama.
- "safe" false hanya jika nama berisi konten seksual eksplisit, ujaran kebencian, atau pelecehan anak.`

export async function POST(req: NextRequest) {
  const { data: auth } = await sb.auth.getUser(req.headers.get('authorization')?.replace('Bearer ', '') ?? '')
  if (!auth?.user) return err('Silakan masuk dulu.', 401)
  const userId = auth.user.id

  const form = await req.formData()
  let name = String(form.get('name') ?? '').replace(/[\p{Cc}]/gu, '').trim()
  if (name.length < 2 || name.length > 40) return err('Nama kartu harus 2-40 karakter.', 400)
  const raw = form.get('image')
  if (raw instanceof File && raw.size > 1_500_000) return err('Foto terlalu besar. Maksimal 1,5 MB.', 413)
  const f = raw instanceof File && raw.type.startsWith('image/') && raw.size > 0 ? raw : null

  // nama menentukan hash unik; foto (kalau ada) juga
  const hash = createHash('sha256').update((f ? Buffer.from(await f.arrayBuffer()) : name.toLowerCase())).digest('hex')
  const day = new Date(); day.setUTCHours(0, 0, 0, 0)
  const { count } = await sb.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', day.toISOString())
  if ((count ?? 0) >= DAILY_LIMIT) return err('Jatah hari ini habis. Coba lagi besok.', 429)
  const { data: dup } = await sb.from('cards').select('id').eq('user_id', userId).ilike('name', name).maybeSingle()
  if (dup) return err('Kartu dengan nama ini sudah kamu punya.', 409)

  // Coba Groq dulu; kalau limit/error, alihkan ke OpenRouter (model :free)
  const proms = (name: string, url: string, key: string | undefined, model: string) => ({
    name, url, key, model,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'User-Agent': UA, ...(name === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'MultiVerse' } : {}) } as Record<string, string>,
  })
  const provs = [
    proms('groq', GROQ_URL, process.env.GROQ_API_KEY, process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'),
    proms('openrouter', OR_URL, process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL ?? 'qwen/qwen2.5-72b-instruct:free'),
  ].filter(p => p.key)
  if (!provs.length) return err('GROQ_API_KEY / OPENROUTER_API_KEY belum diisi di .env.local.', 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let a: any
  for (const p of provs) {
    const g = await fetch(p.url, {
      method: 'POST',
      headers: p.headers,
      body: JSON.stringify({ model: p.model, temperature: 0.7, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: `Nama kartu: "${name}"` }] }),
    }).catch(() => null)
    if (!g) { console.error(`${p.name} tidak terjangkau`); continue }
    if (!g.ok) { console.error(`${p.name} gagal:`, g.status); continue }
    const raw = ((await g.json()).choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '')
    try { a = JSON.parse(raw) } catch { console.error(`${p.name} JSON tidak valid`); continue }
    if (a) break
  }
  if (!a) return err('AI sedang sibuk, coba lagi nanti.', 502)
  if (a.safe === false) return err('Nama kartu ini tidak bisa dipakai.', 422)

  const w = ['hp', 'atk', 'def', 'spd'].map(k => Math.min(10, Math.max(1, Number(a.weights?.[k]) || 5)))
  // Skala tetap: stat ~ weight*7, hp diberi +30 sehingga total baik antar 1-9.
  const v = w.map(x => x * 7)
  const hp = v[0] + 30
  const atk = v[1], def = v[2], spd = v[3]
  // chance Ultra Card 0,5–1% (threshold acak di antara keduanya)
  const element: El = Math.random() < 0.005 + Math.random() * 0.005 ? 'Ultra Card' : kategoriDariStat(hp, atk, def, spd)

  let image_url = ''
  if (f) {
    const buf = Buffer.from(await f.arrayBuffer())
    const key = `${userId}/${hash}.webp`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buf, { contentType: f.type, upsert: true })
    if (upErr) { console.error('upload:', upErr); return err('Gagal menyimpan foto.', 500) }
    image_url = sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
  }

  const { data, error } = await sb.from('cards').insert({
    user_id: userId, image_hash: hash, image_url, name, element, rarity: element,
    hp, atk, def, spd,
    skill: String(a.skill || 'Serangan Biasa').slice(0, 40),
    skill_desc: String(a.skill_desc || '').slice(0, 100),
    hue: parseInt(hash.slice(10, 13), 16) % 360,
  }).select().single()
  if (error) { console.error('insert kartu:', error); return err('Gagal menyimpan kartu.', 500) }
  return NextResponse.json(data)
}
