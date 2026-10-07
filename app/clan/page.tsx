'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RiAddCircleLine, RiGroupLine, RiLoader4Line, RiLoginBoxLine, RiLogoutBoxLine, RiShieldLine, RiUserStarLine } from 'react-icons/ri'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks'

type Clan = { id: string; name: string; tag: string; leader_id: string; vice_id: string | null }
type Member = { id: string; nickname: string; wins: number; rating: number; avatar: string | null }

export default function ClanPage() {
  const { user, ready } = useUser()
  const [clan, setClan] = useState<Clan | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState(false)
  const [nama, setNama] = useState(''), [tag, setTag] = useState(''), [gabung, setGabung] = useState(''), [addNick, setAddNick] = useState('')

  const say = (good: string) => { setErr(''); setOk(good); setTimeout(() => setOk(''), 4000) }

  const load = useCallback(async () => {
    if (!user) { setClan(null); setMembers([]); setLoading(false); return }
    const { data: me } = await supabase.from('profiles').select('clan_id').eq('id', user.id).maybeSingle()
    const cid = (me as { clan_id?: string | null } | null)?.clan_id ?? null
    if (!cid) { setClan(null); setMembers([]); setLoading(false); return }
    const [{ data: c }, { data: ms }] = await Promise.all([
      supabase.from('clans').select('id,name,tag,leader_id,vice_id').eq('id', cid).maybeSingle(),
      supabase.from('profiles').select('id,nickname,wins,rating,avatar').eq('clan_id', cid).order('created_at', { ascending: true }),
    ])
    setClan((c as Clan | null) ?? null)
    setMembers((ms ?? []) as Member[])
    setLoading(false)
  }, [user])
  useEffect(() => { if (ready) void load() }, [ready, load])

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, good: string) => {
    setBusy(true); setErr(''); setOk('')
    const { error } = await fn()
    setBusy(false)
    if (error) { setErr(error.message); return false }
    say(good); await load(); return true
  }
  const buat = () => run(() => supabase.rpc('create_clan', { clan_name: nama.trim(), clan_tag: tag }), 'Clan dibuat!')
  const join = () => run(() => supabase.rpc('join_clan', { clan_tag: gabung }), 'Berhasil bergabung!')
  const tambah = async () => {
    if (await run(() => supabase.rpc('add_member', { target_nick: addNick.trim() }), 'Anggota ditambahkan!')) setAddNick('')
  }
  const setVice = (target: string | null) =>
    run(() => supabase.rpc('set_vice', { target }), target ? 'Wakil ditetapkan.' : 'Wakil dicabut.')
  const keluar = () => {
    if (!window.confirm('Keluar dari clan?')) return
    void run(() => supabase.rpc('leave_clan'), 'Kamu keluar dari clan.')
  }

  /* ── Belum masuk ── */
  if (ready && !user) return (
    <div className="w page">
      <div className="pagehead">
        <h2>Clan</h2>
        <p className="sub">Masuk untuk membuat atau bergabung dengan clan.</p>
        <div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div>
      </div>
    </div>
  )

  /* ── Memuat ── */
  if (!ready || loading) return (
    <div className="w page" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: '.8rem', justifyItems: 'center' }}>
        <RiLoader4Line size={36} className="spin" style={{ color: 'var(--ac)' }} />
        <p style={{ color: 'var(--mut)', margin: 0 }}>Memuat clan…</p>
      </div>
    </div>
  )

  const msgs = <>{err && <p className="err">{err}</p>}{ok && <p className="ok">{ok}</p>}</>

  /* ── Punya clan ── */
  if (clan) {
    const isLeader = user!.id === clan.leader_id
    const isWakil = user!.id === clan.vice_id
    return (
      <div className="w page">
        <div className="pagehead">
          <h2>Clan</h2>
          <p className="sub">Tag kamu tampil di depan nama saat battle — misalnya "{clan.tag} Namamu".</p>
        </div>

        <section className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', flexWrap: 'wrap' }}>
            <span style={{
              background: 'var(--ac)', color: 'var(--on-ac)', borderRadius: 12,
              font: "800 1.05rem 'Bricolage Grotesque', sans-serif",
              letterSpacing: '.06em', padding: '.45rem .75rem', flex: 'none',
            }}>{clan.tag}</span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0 }}><RiGroupLine size={20} />{clan.name}</h3>
              <small className="sub" style={{ margin: 0 }}>{members.length}/10 anggota{isLeader && ' · Kamu ketua'}{isWakil && ' · Kamu wakil'}</small>
            </div>
          </div>

          <div className="list" style={{ marginTop: '1.2rem' }}>
            {members.map(m => (
              <div className="row" key={m.id}>
                <span className="av">{m.avatar ? <img src={m.avatar} alt="" /> : <RiGroupLine size={18} />}</span>
                <b style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.nickname}
                  {m.id === user!.id && <small className="sub" style={{ marginLeft: '.4rem', fontWeight: 400 }}>(kamu)</small>}
                </b>
                {m.id === clan.leader_id && <RiUserStarLine size={18} title="Ketua" style={{ color: 'var(--ac)', flex: 'none' }} />}
                {m.id === clan.vice_id && <RiShieldLine size={16} title="Wakil" style={{ color: 'var(--mut)', flex: 'none' }} />}
                {isLeader && m.id !== user!.id && (
                  <button
                    className="btn sm ln"
                    disabled={busy}
                    onClick={() => void setVice(clan.vice_id === m.id ? null : m.id)}
                  >
                    {clan.vice_id === m.id ? 'Cabut wakil' : 'Jadikan wakil'}
                  </button>
                )}
                <small className="sub" style={{ marginLeft: 'auto' }}>{m.wins} menang · {m.rating} rating</small>
              </div>
            ))}
          </div>

          {(isLeader || isWakil) && (
            <div className="bar" style={{ margin: '1.2rem 0 0' }}>
              <input value={addNick} maxLength={24} placeholder="Nickname pemain untuk ditambahkan" aria-label="Nickname pemain" onChange={e => setAddNick(e.target.value)} />
              <button className="btn sm" disabled={busy || !addNick.trim()} onClick={() => void tambah()}>Tambah</button>
            </div>
          )}

          <div className="bar" style={{ margin: '1.2rem 0 0' }}>
            <button className="btn rd" disabled={busy} onClick={keluar}><RiLogoutBoxLine size={18} />Keluar clan</button>
          </div>
        </section>
        {msgs}
      </div>
    )
  }

  /* ── Belum punya clan: buat / gabung ── */
  return (
    <div className="w page">
      <div className="pagehead">
        <h2>Clan</h2>
        <p className="sub">Buat clan dengan tag unik, atau gabung pakai tag. Tag tampil di depan namamu saat battle — misalnya "BTR Rzfan03".</p>
      </div>

      <section className="panel">
        <h3><RiAddCircleLine size={20} />Buat clan</h3>
        <div className="bar" style={{ marginBottom: 0 }}>
          <input value={nama} maxLength={32} placeholder="Nama clan (min. 3)" aria-label="Nama clan" onChange={e => setNama(e.target.value)} />
          <input value={tag} maxLength={5} placeholder="Tag (2-5)" aria-label="Tag clan" style={{ maxWidth: 130, textTransform: 'uppercase' }} onChange={e => setTag(e.target.value.toUpperCase())} />
          <button className="btn" disabled={busy || nama.trim().length < 3 || !tag} onClick={buat}>Buat</button>
        </div>
      </section>

      <section className="panel">
        <h3><RiLoginBoxLine size={20} />Gabung clan</h3>
        <div className="bar" style={{ marginBottom: 0 }}>
          <input value={gabung} maxLength={5} placeholder="Tag clan" aria-label="Tag clan" style={{ textTransform: 'uppercase' }} onChange={e => setGabung(e.target.value.toUpperCase())} />
          <button className="btn" disabled={busy || !gabung} onClick={join}>Gabung</button>
        </div>
      </section>
      {msgs}
    </div>
  )
}
