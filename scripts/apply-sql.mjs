// Terapkan file .sql ke database Supabase via Management API (tanpa paste ke SQL Editor).
// Butuh SUPABASE_ACCESS_TOKEN (Personal Access Token) di .env.local:
//   Supabase dashboard → kiri bawah avatar → Account → Access Tokens → Generate new token.
// Pakai: node scripts/apply-sql.mjs supabase/marketplace.sql
import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.split('\n').find(l => l.startsWith(k + '='))?.split('=').slice(1).join('=').trim() ?? null
const token = get('SUPABASE_ACCESS_TOKEN')
const url = get('NEXT_PUBLIC_SUPABASE_URL')
if (!token || !url) { console.error('Tambah SUPABASE_ACCESS_TOKEN dan NEXT_PUBLIC_SUPABASE_URL di .env.local'); process.exit(1) }
const ref = new URL(url).hostname.split('.')[0]
const file = process.argv[2]
if (!file) { console.error('Kasih path file .sql'); process.exit(1) }
const query = readFileSync(file, 'utf8')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})
const body = await res.json()
if (!res.ok) { console.error('GAGAL', res.status); console.error(JSON.stringify(body, null, 2)); process.exit(1) }
const err = body?.[0]?.error
console.log(err ? `ADA ERROR:\n${err}` : `OK — ${file} (${query.split(';').filter(x => x.trim()).length} statement)`)