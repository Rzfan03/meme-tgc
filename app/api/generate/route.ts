import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { ELEMENTS, BUDGET, DAILY_LIMIT, rarityFromHash, type El } from '@/lib/game'
export const runtime = 'nodejs'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BUCKET = process.env.SUPABASE_BUCKET ?? 'kartuku-cards'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Cloudflare Groq balas 1010 kalau request tanpa User-Agent browser-like
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const err = (m: string, s: number) => NextResponse.json({ error: m }, { status: s })
const PROMPT = `Kamu desainer stat kartu game. Dari NAMA karakter yang diberikan, buat kartu sesuai kemampuan aslinya.
Balas HANYA JSON: {"safe":boolean,"element":"${Object.keys(ELEMENTS).join('|')}","skill":string (maks 3 kata),"skill_desc":string (maks 12 kata, bahasa Indonesia),"weights":{"hp":1-10,"atk":1-10,"def":1-10,"spd":1-10}}.
Aturan:
- Kalau karakter dikenal, pakai kemampuan kanoniknya. Contoh: "Ichigo Kurosaki" (Bleach) = pedang Zangetsu, Bankai, regenerasi cepat, atk dan spd tinggi.
- Kalau nama tidak dikenal atau bukan tokoh, buat stat yang masuk akal sesuai nama itu.
- weights: hp ketahanan, atk serangan, def pertahanan, spd kecepatan. Jangan semuanya 10, beri variasi.
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

  // nama menentukan rarity/warna; foto (kalau ada) menentukan hash unik
  const hash = createHash('sha256').update((f ? Buffer.from(await f.arrayBuffer()) : name.toLowerCase())).digest('hex')
  const day = new Date(); day.setUTCHours(0, 0, 0, 0)
  const { count } = await sb.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', day.toISOString())
  if ((count ?? 0) >= DAILY_LIMIT) return err('Jatah hari ini habis. Coba lagi besok.', 429)
  const { data: dup } = await sb.from('cards').select('id').eq('user_id', userId).ilike('name', name).maybeSingle()
  if (dup) return err('Kartu dengan nama ini sudah kamu punya.', 409)

  // Coba Groq dulu; kalau limit/error, alihkan ke OpenRouter (model :free)
  const proms = (name: string, url: string, key: string | undefined, model: string) => ({
    name, url, key, model,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'User-Agent': UA, ...(name === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Meme TGC' } : {}) } as Record<string, string>,
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

  const els = Object.keys(ELEMENTS) as El[]
  const rarity = rarityFromHash(hash)
  const w = ['hp', 'atk', 'def', 'spd'].map(k => Math.min(10, Math.max(1, Number(a.weights?.[k]) || 5)))
  const sum = w.reduce((x, y) => x + y)
  const v = w.map(x => Math.round((x / sum) * BUDGET[rarity]))
  const hp = v[0] + 30
  const atk = v[1], def = v[2], spd = v[3]
  // Karakter kuat (HP & semua stat gede) otomatis jadi Holy Card
  const element: El = hp >= 55 && atk >= 10 && def >= 10 && spd >= 10 ? 'Holy Card' : els.includes(a.element) ? a.element : els[parseInt(hash.slice(8, 10), 16) % els.length]

  let image_url = ''
  if (f) {
    const buf = Buffer.from(await f.arrayBuffer())
    const key = `${userId}/${hash}.webp`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buf, { contentType: f.type, upsert: true })
    if (upErr) { console.error('upload:', upErr); return err('Gagal menyimpan foto.', 500) }
    image_url = sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
  }

  const { data, error } = await sb.from('cards').insert({
    user_id: userId, image_hash: hash, image_url, name, element, rarity,
    hp, atk, def, spd,
    skill: String(a.skill || 'Serangan Biasa').slice(0, 40),
    skill_desc: String(a.skill_desc || '').slice(0, 100),
    hue: parseInt(hash.slice(10, 13), 16) % 360,
  }).select().single()
  if (error) { console.error('insert kartu:', error); return err('Gagal menyimpan kartu.', 500) }
  return NextResponse.json(data)
}
