'use client'
import { useCallback, useEffect, useState } from 'react'
import { Ban, Check, Edit, Link2, Loader2, Megaphone, Pencil, Search, Shield, Trash2, UserX, X } from 'lucide-react'
import { Card } from '@/components/Card'
import { useProfile, useUser } from '@/lib/hooks'
import { supabase } from '@/lib/supabase'
import { ELEMENTS, kategoriDariStat, type CardData, type El } from '@/lib/game'

type ACard = { id: string; name: string; element: string; hp: number; atk: number; def: number; spd: number; skill: string; skill_desc: string; hue: number; image_url: string | null; user_id: string; created_at: string; owner: string }
type APlayer = { id: string; nickname: string; avatar: string | null; wins: number; losses: number; rating: number; points: number; is_admin: boolean; banned: boolean }
type Stats = { total_cards: number; total_players: number; holy: number; chaoz: number; mogger: number; sampah: number; tai: number }
const ELS = Object.keys(ELEMENTS) as El[]

export default function Admin() {
  const { user, ready } = useUser()
  const { profile } = useProfile()
  const [err, setErr] = useState(''), [ok, setOk] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [q, setQ] = useState(''), [el, setEl] = useState<El | ''>(''), [cards, setCards] = useState<ACard[]>([])
  const [edit, setEdit] = useState<ACard | null>(null), [del, setDel] = useState<ACard | null>(null)
  const [xf, setXf] = useState<ACard | null>(null), [pl, setPl] = useState<APlayer[]>([]), [pq, setPq] = useState('')
  const [ppl, setPpl] = useState<APlayer[]>([]), [bq, setBq] = useState(''), [btitle, setBtitle] = useState(''), [bbody, setBbody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc('admin_stats'), supabase.rpc('admin_list_cards', { kategory: el || null, q })])
    if (a.error) setErr(a.error.message)
    else { setStats(a.data as Stats); setCards((b.data ?? []) as ACard[]) }
  }, [q, el])
  useEffect(() => { if (ready && profile?.is_admin) void load() }, [ready, profile?.is_admin, load])

  const say = (e: string | null, m = '') => { setErr(e ?? ''); setOk(e ? '' : m); if (e || m) setTimeout(() => { setErr(''); setOk('') }, 3500) }
  const toCard = (c: ACard): CardData => ({ id: c.id, name: c.name, element: c.element as El, hp: c.hp, atk: c.atk, def: c.def, spd: c.spd, skill: c.skill, skill_desc: c.skill_desc, hue: c.hue, image_url: c.image_url })
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true)
    const { error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) { say(error.message); return false }
    say(null, 'Berhasil'); await load(); return true
  }

  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Admin</h2><p className="sub">Masuk dulu.</p></div></div>
  if (ready && user && !profile) return <div className="w page"><Loader2 size={24} className="spin" /></div>
  if (ready && !profile?.is_admin) return <div className="w page"><div className="pagehead"><h2>Admin</h2><p className="sub">Halaman ini hanya untuk admin.</p></div></div>
  if (!ready) return <Loader2 size={24} className="spin" />

  return (
    <div className="w page">
      <div className="pagehead"><h2><Shield size={22} />Admin</h2><p className="sub">Kelola kartu, pemain, dan pengumuman.</p></div>

      {stats && <div className="row" style={{ gap: '.6rem' }}>
        <div className="stat"><b>{stats.total_cards}</b><small>Total kartu</small></div>
        <div className="stat"><b>{stats.total_players}</b><small>Pemain</small></div>
        {([['holy', 'Holy Card'], ['chaoz', 'Chaoz'], ['mogger', 'Mogger'], ['sampah', 'Sampah'], ['tai', 'Tai ayam']] as const).map(([k, label]) =>
          <div className="stat" key={k}><b>{stats[k]}</b><small>{label}</small></div>)}
      </div>}

      <section className="panel">
        <h3><Pencil size={20} />Cari & edit kartu</h3>
        <div className="bar" style={{ marginTop: '.8rem' }}>
          <input value={q} onChange={e => { setQ(e.target.value); }} placeholder="Nama kartu / pemain / id..." aria-label="Cari kartu" />
          <button className="btn bl" onClick={load}><Search size={18} />Cari</button>
        </div>
        <div className="seg" style={{ marginTop: '.6rem' }}>
          <button className={`chip${el === '' ? ' on' : ''}`} onClick={() => setEl('')}>Semua</button>
          {ELS.map(k => <button key={k} className={`chip${el === k ? ' on' : ''}`} onClick={() => setEl(k)}>{k}</button>)}
        </div>
        <div style={{ display: 'grid', gap: '.6rem', marginTop: '1rem' }}>
          {cards.length ? cards.map(c => (
            <div className="row" key={c.id} style={{ gap: '.7rem', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: 16, padding: '.6rem .8rem' }}>
              <Card c={toCard(c)} w={64} tilt={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{c.name}</b><br />
                <small className="sub" style={{ margin: 0 }}><span className="rdot" style={{ background: ELEMENTS[c.element as El] }} /> {c.element} · HP {c.hp}/ATK {c.atk}/DEF {c.def}/SPD {c.spd}</small>
              </div>
              <small className="sub" style={{ margin: 0 }}>{c.owner}</small>
              <button className="btn" onClick={() => setEdit(c)} disabled={busy}><Edit size={16} />Edit</button>
              <button className="btn ln" onClick={() => setXf(c)} disabled={busy}><Link2 size={16} />Pindah</button>
              <button className="btn rd" onClick={() => setDel(c)} disabled={busy}><Trash2 size={16} />Hapus</button>
            </div>
          )) : <p className="sub">Tidak ada kartu.</p>}
        </div>
      </section>

      <section className="panel">
        <h3><Megaphone size={20} />Pengumuman ke semua pemain</h3>
        <input value={btitle} onChange={e => setBtitle(e.target.value)} style={{ marginTop: '.8rem' }} placeholder="Judul" aria-label="Judul pengumuman" />
        <input value={bbody} onChange={e => setBbody(e.target.value)} placeholder="Isi pengumuman" aria-label="Isi pengumuman" />
        <button className="btn bl" disabled={busy || !btitle.trim() || !bbody.trim()} onClick={async () => { if (await rpc('admin_broadcast', { title: btitle.trim(), body: bbody.trim() })) { setBtitle(''); setBbody('') } }}><Megaphone size={16} />Kirim</button>
      </section>

      <section className="panel">
        <h3><Ban size={20} />Kelola pemain</h3>
        <div className="bar" style={{ marginTop: '.6rem' }}><input value={bq} onChange={e => setBq(e.target.value)} placeholder="Nama / id pemain..." aria-label="Cari pemain" /><button className="btn bl" onClick={async () => { setBusy(true); const { data, error } = await supabase.rpc('admin_list_players', { q: bq }); setBusy(false); if (error) say(error.message); else setPpl((data ?? []) as APlayer[]) }}>Cari</button></div>
        <div style={{ display: 'grid', gap: '.6rem', marginTop: '1rem' }}>
          {ppl.map(p => (
            <div className="row" key={p.id} style={{ gap: '.7rem', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: 16, padding: '.5rem .8rem' }}>
              <span className="ow-av" style={{ width: 34, height: 34, fontSize: '.9rem' }}>{p.avatar ? <img src={p.avatar} alt="" /> : p.nickname.slice(0, 1).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}><b>{p.nickname}{p.is_admin && <Shield size={14} style={{ display: 'inline-flex', verticalAlign: '-3px', marginLeft: '.25rem' }} />}</b><br /><small className="sub" style={{ margin: 0 }}>rating {p.rating} · {p.points.toLocaleString('id-ID')} poin · {p.wins}W/{p.losses}L</small></div>
              {p.banned && <small style={{ color: 'var(--rd)', fontWeight: 700 }}>BANNED</small>}
              {!p.is_admin && <button className="btn ln" style={p.banned ? { color: 'var(--ac)' } : { color: 'var(--rd)' }} disabled={busy} onClick={() => rpc('admin_set_ban', { pid: p.id, banned: !p.banned }).then(() => setPpl(l => l.map(x => x.id === p.id ? { ...x, banned: !p.banned } : x)))}>{p.banned ? <><Check size={16} />Unban</> : <><UserX size={16} />Ban</>}</button>}
            </div>
          ))}
        </div>
      </section>

      {err && <p className="err">{err}</p>}{ok && <p className="ok">{ok}</p>}

      {edit && <Modal title={`Edit ${edit.name}`} onClose={() => setEdit(null)}>
        <EditForm c={edit} busy={busy} onSave={async (patch) => { if (await rpc('admin_update_card', { cid: edit.id, ...patch })) setEdit(null) }} />
      </Modal>}

      {xf && <Modal title={`Pindah "${xf.name}" ke pemain lain`} onClose={() => setXf(null)}>
        <div className="bar" style={{ margin: 0 }}><input value={pq} onChange={e => setPq(e.target.value)} placeholder="Cari pemain target..." aria-label="Cari pemain tujuan" /><button className="btn bl" onClick={async () => { setBusy(true); const { data, error } = await supabase.rpc('admin_list_players', { q: pq }); setBusy(false); if (error) say(error.message); else setPl((data ?? []) as APlayer[]) }}>Cari</button></div>
        <div style={{ display: 'grid', gap: '.5rem', marginTop: '1rem' }}>
          {pl.filter(p => p.id !== xf.user_id && !p.banned).map(p => (
            <div className="row" key={p.id} style={{ gap: '.6rem', background: 'var(--bg)', border: '1px solid var(--ln)', borderRadius: 12, padding: '.4rem .7rem' }}>
              <span className="ow-av" style={{ width: 30, height: 30, fontSize: '.85rem' }}>{p.avatar ? <img src={p.avatar} alt="" /> : p.nickname.slice(0, 1).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}><b>{p.nickname}</b><br /><small className="sub" style={{ margin: 0 }}>rating {p.rating}</small></div>
              <button className="btn" disabled={busy} onClick={() => rpc('admin_transfer_card', { cid: xf.id, to_user: p.id }).then(() => setXf(null))}>Pindah</button>
            </div>
          ))}
        </div>
      </Modal>}

      {del && <Modal title="Konfirmasi hapus kartu" onClose={() => setDel(null)}>
        <p className="sub" style={{ margin: 0 }}>Hapus <b>{del.name}</b> milik <b>{del.owner}</b>? Ini tidak bisa dibatalkan.</p>
        <div className="bar" style={{ marginTop: '1rem' }}><button className="btn" onClick={() => setDel(null)}>Batal</button><button className="btn rd" disabled={busy} onClick={() => rpc('admin_delete_card', { cid: del.id }).then(() => setDel(null))}>Hapus</button></div>
      </Modal>}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal on" onClick={e => e.target === e.currentTarget && onClose()}><div className="dlg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
    <div className="dlg-head"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
    {children}
  </div></div>
}

type Patch = { new_name: string; new_element: string; new_hp: number; new_atk: number; new_def: number; new_spd: number; new_skill: string; new_skill_desc: string }
function EditForm({ c, busy, onSave }: { c: ACard; busy: boolean; onSave: (p: Patch) => void }) {
  const [f, setF] = useState({ name: c.name, el: c.element as El, hp: c.hp, atk: c.atk, def: c.def, spd: c.spd, skill: c.skill, desc: c.skill_desc })
  const set = (k: string, v: string | number) => setF(s => ({ ...s, [k]: v }))
  // kategori mengikuti stat secara otomatis, admin bisa override element
  const autoEl = kategoriDariStat(f.hp, f.atk, f.def, f.spd)
  const num = (n: number) => Math.min(200, Math.max(1, Math.round(Number(n) || 1)))
  return <div className="seg" style={{ display: 'grid', gap: '.7rem' }}>
    <div><label className="sub">Nama</label><input value={f.name} onChange={e => set('name', e.target.value)} aria-label="Nama kartu" /></div>
    <div><label className="sub">Kategori (otomatis: {autoEl})</label>
      <div className="seg">{ELS.map(k => <button key={k} className={`chip${f.el === k ? ' on' : ''}`} onClick={() => set('el', k)}>{k}</button>)}</div></div>
    <div className="row"></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '.6rem' }}>
      {(['hp', 'atk', 'def', 'spd'] as const).map(k => <div key={k}><label className="sub">{k.toUpperCase()}</label><input type="number" inputMode="numeric" value={f[k] || ''} onChange={e => set(k, e.target.value)} aria-label={k} /></div>)}
    </div>
    <div><label className="sub">Skill</label><input value={f.skill} maxLength={40} onChange={e => set('skill', e.target.value)} aria-label="Skill" /></div>
    <div><label className="sub">Deskripsi skill</label><input value={f.desc} maxLength={100} onChange={e => set('desc', e.target.value)} aria-label="Deskripsi skill" /></div>
    <button className="btn bl" disabled={busy || f.name.trim().length < 2} onClick={() => onSave({ new_name: f.name.trim(), new_element: f.el, new_hp: num(f.hp), new_atk: num(f.atk), new_def: num(f.def), new_spd: num(f.spd), new_skill: f.skill.trim(), new_skill_desc: f.desc.trim() })}><Check size={16} />Simpan</button>
  </div>
}