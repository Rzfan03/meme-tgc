'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Plus, RefreshCw, Swords } from 'lucide-react'
import { Card } from '@/components/Card'
import { PageSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase'
import { useCards } from '@/lib/hooks'
type R = { id: string; name: string; host_name: string; has_password: boolean; created_at: string }
export default function Rooms() {
  const router = useRouter(), { user, ready, cards, loading } = useCards()
  const [rooms, setRooms] = useState<R[]>([]), [sel, setSel] = useState<string[]>([]), [name, setName] = useState(''), [pw, setPw] = useState(''), [ask, setAsk] = useState<string | null>(null), [jp, setJp] = useState(''), [err, setErr] = useState('')
  const chRef = useRef<RealtimeChannel | null>(null), [online, setOnline] = useState(1)
  const load = useCallback(async () => { const { data } = await supabase.rpc('list_rooms'); setRooms((data ?? []) as R[]) }, [])
  useEffect(() => {
    if (!user) return
    load()
    const ch = supabase.channel('lobby', { config: { presence: { key: user.id } } })
    ch.on('broadcast', { event: 'rooms' }, load).on('presence', { event: 'sync' }, () => setOnline(Object.keys(ch.presenceState()).length)).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ at: Date.now() }) })
    chRef.current = ch
    const t = setInterval(load, 30000)
    return () => { clearInterval(t); supabase.removeChannel(ch) }
  }, [user, load])
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s)
  const go = async (r: { data: string | null; error: { message: string } | null }) => { if (r.error) return setErr(r.error.message); await chRef.current?.send({ type: 'broadcast', event: 'rooms', payload: {} }); router.push('/versus?b=' + r.data) }
  const create = async () => { setErr(''); if (sel.length !== 3) return setErr('Pilih 3 kartu dulu.'); go(await supabase.rpc('create_room', { card_ids: sel, room_name: name, room_password: pw || null })) }
  const join = async (r: R) => {
    setErr(''); if (sel.length !== 3) return setErr('Pilih 3 kartu dulu.')
    if (r.has_password && ask !== r.id) return setAsk(r.id)
    go(await supabase.rpc('join_room', { room_id: r.id, card_ids: sel, room_password: jp || null }))
  }
  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Room</h2><p className="sub">Masuk untuk membuat atau bergabung ke room.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>
  if (loading) return <PageSkeleton />
  return (
    <div className="w page"><div className="pagehead"><h2>Room</h2><p className="sub">Pilih 3 kartu ({sel.length}/3), lalu buat room sendiri atau gabung ke room pemain lain. {online} pemain online di lobby.</p></div>
      <div className="scroll">{cards.map(c => <div key={c.id} onClick={() => toggle(c.id)} style={{ borderRadius: 14, outline: sel.includes(c.id) ? '4px solid var(--yl)' : 'none', outlineOffset: 3 }}><Card c={c} tilt={false} w={130} /></div>)}</div>
      {!cards.length && <p className="sub">Kamu belum punya kartu. Buat dulu di menu Buat Kartu.</p>}
      <div className="step" style={{ margin: '1rem 0' }}><h3>Buat room</h3>
        <div className="bar" style={{ marginTop: '.8rem' }}><input placeholder="Nama room" aria-label="Nama room" maxLength={40} value={name} onChange={e => setName(e.target.value)} /><input type="password" placeholder="Password (opsional)" aria-label="Password room" maxLength={50} value={pw} onChange={e => setPw(e.target.value)} />
          <button className="btn rd" disabled={!name.trim()} onClick={create}><Plus size={18} />Buat room</button></div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><h3>Daftar room ({rooms.length})</h3><button className="btn ln" onClick={load}><RefreshCw size={16} />Segarkan</button></div>
      {err && <p className="err">{err}</p>}
      <div style={{ display: 'grid', gap: '.8rem', marginTop: '1rem' }}>
        {rooms.length ? rooms.map(r => (
          <div className="step" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}><h3>{r.has_password && <Lock size={16} />} {r.name}</h3><p>Host: {r.host_name}{user?.user_metadata?.full_name === r.host_name ? ' (kamu)' : ''}</p></div>
            {ask === r.id && <input className="bar" style={{ border: '2px solid var(--ln)', borderRadius: 999, padding: '.5rem 1rem', background: 'var(--sf)', color: 'var(--ink)' }} type="password" placeholder="Password room" aria-label="Password room" value={jp} onChange={e => setJp(e.target.value)} />}
            <button className="btn" onClick={() => join(r)}><Swords size={18} />Gabung</button></div>
        )) : <p className="sub">Belum ada room yang menunggu. Buat yang pertama!</p>}</div></div>
  )
}
