'use client'
import { useEffect, useState } from 'react'
import { RiEyeLine, RiLoader4Line, RiMagicLine, RiRefreshLine, RiSwordLine, RiTeamLine } from 'react-icons/ri'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { DeckBar } from '@/components/DeckBar'
import { supabase } from '@/lib/supabase'
import { useCards } from '@/lib/hooks'
import { sfx } from '@/lib/sound'
import { toastSuccess } from '@/lib/alert'
import type { CardData } from '@/lib/game'

type F = CardData & { max: number; sk?: boolean }
type B = { id: string; p1: string; p2: string | null; p2_cards: F[] | null; p1_cards: F[]; p1_active: number; p2_active: number; turn: string | null; status: 'waiting' | 'active' | 'done'; winner: string | null; log: string[] }

type Prof = { nickname: string; tag: string | null }

export default function Versus() {
  const { user, ready, cards, loading } = useCards()
  const [sel, setSel] = useState<string[]>([]), [bid, setBid] = useState<string | null>(null), [b, setB] = useState<B | null>(null), [err, setErr] = useState(''), [opp, setOpp] = useState(false), [names, setNames] = useState<Record<string, Prof>>({}), [finding, setFinding] = useState(false), [watch, setWatch] = useState<string[]>([])

  useEffect(() => { const q = new URLSearchParams(location.search).get('b'); if (q) setBid(q) }, [])
  useEffect(() => {
    if (!bid) return
    const load = async () => {
      const { data } = await supabase.from('battles').select('*').eq('id', bid).single()
      if (!data) return
      setB(data as B)
      const { data: profs } = await supabase.from('profiles').select('id,nickname,clans(tag)').in('id', [data.p1, data.p2].filter(Boolean))
      // embed clans bisa berupa objek (many-to-one) atau array, tergantung inferensi PostgREST
      setNames(Object.fromEntries((profs ?? []).map((x: { id: string; nickname: string; clans: { tag: string } | { tag: string }[] | null }) => {
        const c = Array.isArray(x.clans) ? x.clans[0] : x.clans
        return [x.id, { nickname: x.nickname, tag: c?.tag ?? null }]
      })))
    }
    void load()
    const ch = supabase.channel('battle-' + bid, { config: { presence: { key: user?.id ?? 'anon' } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${bid}` }, p => {
        if (p.new) setB(p.new as B)
        else setB(prev => prev ? { ...prev, status: 'done', log: [...prev.log, 'Battle dihapus, kedua pemain tidak aktif.'] } : null)
      })
      .on('presence', { event: 'sync' }, () => {
        const ks = Object.keys(ch.presenceState())
        setOpp(ks.length > 1)
        setWatch(ks)
      })
      .subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ at: Date.now() }) })
    return () => { supabase.removeChannel(ch) }
  }, [bid])

  useEffect(() => {
    if (!b || b.status !== 'done') return
    if (b.winner === user?.id) { sfx('win-match'); void toastSuccess('Kamu menang!', 'Battle dimenangkan. Kartumu jagoan.') }
    else sfx('error')
  }, [b?.status, b?.winner, user?.id])

  const find = async () => {
    setErr(''); setFinding(true)
    const { data, error } = await supabase.rpc('find_match', { card_ids: sel })
    setFinding(false)
    if (error) setErr(error.message)
    else setBid(data)
  }
  const act = async (a: string, i = 0) => {
    if (a === 'attack') sfx('attack')
    if (a === 'skill') sfx('skills')
    const { error } = await supabase.rpc('battle_action', { bid, act: a, idx: i })
    setErr(error?.message ?? '')
  }
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s)

  /* ── Not logged in ── */
  if (ready && !user) return (
    <div className="w page">
      <div className="pagehead">
        <h2>Versus</h2>
        <p className="sub">Masuk untuk melawan pemain lain secara real-time.</p>
        <div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div>
      </div>
    </div>
  )

  /* ── Loading battle ── */
  if (bid && !b) return (
    <div className="w page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: '.8rem', justifyItems: 'center' }}>
        <RiLoader4Line size={36} className="spin" style={{ color: 'var(--ac)' }} />
        <p style={{ color: 'var(--mut)', margin: 0 }}>Memuat battle...</p>
      </div>
    </div>
  )

  /* ── Waiting for opponent ── */
  if (bid && b && (b.status === 'waiting' || !b.p1_cards || !b.p2_cards)) return (
    <div className="w page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: '1.2rem', justifyItems: 'center', maxWidth: 360 }}>
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--ac) 20%, transparent)',
            animation: 'ping 1.4s ease-in-out infinite',
          }} />
          <div style={{
            position: 'relative', width: 72, height: 72, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--ac) 14%, var(--sf))',
            border: '2px solid color-mix(in srgb, var(--ac) 35%, var(--ln))',
            display: 'grid', placeItems: 'center', color: 'var(--ac)',
          }}>
            <RiTeamLine size={28} />
          </div>
        </div>
        <div>
          <h2 style={{ margin: '0 0 .3rem' }}>Mencari lawan…</h2>
          <p style={{ color: 'var(--mut)', margin: 0, fontSize: '.95rem' }}>Biarkan halaman ini terbuka. Kamu akan langsung masuk ke battle saat lawan ditemukan.</p>
        </div>
        {b.p1_cards && (
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
            {(b.p1 === user?.id ? b.p1_cards : b.p2_cards ?? []).slice(0, 3).map((c, i) => (
              <div key={i} style={{ width: 80 }}><Card c={c} tilt={false} w={80} /></div>
            ))}
          </div>
        )}
        <button className="btn ln" onClick={async () => { await supabase.rpc('cancel_room', { room_id: bid }); setBid(null); setB(null) }}>
          Batalkan pencarian
        </button>
      </div>
    </div>
  )

  /* ── Active / done battle ── */
  if (b) {
    const spectator = !(b.p1 === user!.id || b.p2 === user!.id)
    const spec = watch.filter(k => k !== b.p1 && k !== b.p2).length
    const me = b.p1 === user!.id
    const mine = me ? b.p1_cards! : b.p2_cards!
    const foe = me ? b.p2_cards! : b.p1_cards!
    const mi = me ? b.p1_active : b.p2_active
    const fi = me ? b.p2_active : b.p1_active
    const myTurn = !spectator && b.turn === user!.id && b.status === 'active'
    const aktif = mine[mi]
    const skReady = aktif.sk !== false

    const fg = (c: F) => (
      <div className="fg">
        <Card c={c} tilt={false} />
        <div className="hp"><div style={{ width: (c.hp / c.max) * 100 + '%' }} /></div>
      </div>
    )
    const mini = (c: F, i: number, active: number, mineSide: boolean) => (
      <div
        key={i}
        className={`mini ${active === i ? 'act' : ''} ${c.hp <= 0 ? 'dead' : ''}`}
        style={{ '--h': c.hue, cursor: mineSide && myTurn ? 'pointer' : 'default' } as React.CSSProperties}
        onClick={() => mineSide && myTurn && c.hp > 0 && i !== mi && act('swap', i)}
      >
        {c.image_url && <img src={c.image_url} alt="" />}
        <small>{c.hp}</small>
      </div>
    )

    // nama tampilan: tag clan berwarna aksen di depan nickname ("BTR Rzfan03")
    const pname = (id: string, fb: string) => {
      const p = names[id]
      if (!p) return fb
      return <>{p.tag && <span style={{ color: 'var(--ac)', marginRight: '.3rem' }}>{p.tag}</span>}{p.nickname}</>
    }

    return (
      <div className="w page">
        <div className="pagehead"><h2>Versus</h2></div>
        <div className="specbar">
          <span className="specpill"><RiEyeLine size={15} />{spec} menonton</span>
        </div>
        <div className="tray">
          <small className="pn">{pname(me ? b.p2! : b.p1, me ? 'Pemain 2' : 'Pemain 1')}</small>
          {foe.map((c, i) => mini(c, i, fi, false))}
        </div>
        <div className="field">{fg(foe[fi])}<div className="vs d">VS</div>{fg(mine[mi])}</div>
        <div className="tray">
          {mine.map((c, i) => mini(c, i, mi, true))}
          <small className="pn">{pname(me ? b.p1 : b.p2!, me ? 'Pemain 1' : 'Pemain 2')}</small>
        </div>
        <p className="turn">
          {b.status === 'done'
            ? (spectator ? 'Pertarungan selesai.' : b.winner === user!.id ? '🏆 Kamu menang!' : '💀 Kamu kalah. Coba lagi!')
            : spectator ? 'Menonton pertarungan...'
            : myTurn ? '⚔️ Giliranmu — serang, pakai skill, atau ketuk kartu untuk ganti.'
            : `⏳ Menunggu lawan…${b.status === 'active' ? (opp ? '' : ' (lawan offline)') : ''}`}
        </p>
        {spectator && (
          <p className="sub" style={{ textAlign: 'center' }}>
            <RiEyeLine style={{ display: 'inline', verticalAlign: 'middle', marginRight: '.3rem' }} />
            Kamu menonton sebagai spectator.
          </p>
        )}
        <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!spectator && (
            <>
              <button className="btn rd" disabled={!myTurn} onClick={() => act('attack')}>
                <RiSwordLine size={18} />Serang
              </button>
              <button
                className="btn"
                disabled={!myTurn || !skReady}
                title={aktif.skill_desc || aktif.skill}
                onClick={() => act('skill')}
                style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                <RiMagicLine size={18} />{aktif.skill}
                <small style={{ opacity: .7, marginLeft: '.25rem' }}>({skReady ? 'siap' : 'dipakai'})</small>
              </button>
            </>
          )}
          {b.status === 'done' && !spectator && (
            <button className="btn ln" onClick={() => { setBid(null); setB(null); setSel([]) }}>
              <RiRefreshLine size={18} />Main lagi
            </button>
          )}
          {spectator && (
            <button className="btn ln" onClick={() => { setBid(null); setB(null); setSel([]) }}>
              <RiRefreshLine size={18} />Tutup
            </button>
          )}
        </div>
        {err && <p className="err">{err}</p>}
        <div className="log">{b.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}</div>
      </div>
    )
  }

  /* ── Card selection / matchmaking lobby ── */
  const selCards = cards.filter(c => sel.includes(c.id))

  return (
    <div className="w page">
      <div className="pagehead">
        <h2>Versus</h2>
        <p className="sub">Pilih 3 kartu andalanmu, lalu cari lawan. Pertarungan berlangsung real-time.</p>
      </div>

      {/* Deck selector */}
      <div style={{ marginBottom: '.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>
          Pilih kartu <span style={{ color: 'var(--mut)', fontWeight: 600 }}>({sel.length}/3)</span>
        </h3>
        {sel.length > 0 && (
          <button className="btn sm ln" onClick={() => setSel([])}>Hapus pilihan</button>
        )}
      </div>
      <DeckBar cards={cards} sel={sel} onPick={ids => setSel(ids)} />

      {/* Card grid */}
      {loading
        ? <div className="empty"><RiLoader4Line size={20} className="spin" style={{ display: 'inline' }} /> Memuat kartu…</div>
        : !cards.length
          ? <div className="empty" style={{ padding: '2rem' }}>
              Kamu belum punya kartu. <Link href="/create" className="btn sm" style={{ marginLeft: '.5rem' }}>Buat kartu</Link>
            </div>
          : <div className="grid">
              {cards.map(c => {
                const picked = sel.includes(c.id)
                const maxed = sel.length >= 3 && !picked
                return (
                  <div
                    key={c.id}
                    className={picked ? 'picked on' : 'picked'}
                    onClick={() => !maxed && toggle(c.id)}
                    style={{ opacity: maxed ? .45 : 1, cursor: maxed ? 'not-allowed' : 'pointer', transition: 'opacity .15s' }}
                  >
                    <Card c={c} tilt={false} />
                  </div>
                )
              })}
            </div>
      }

      {err && <p className="err">{err}</p>}

      {/* Sticky footer CTA */}
      <div style={{
        position: 'sticky',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
        zIndex: 20, pointerEvents: 'none',
        display: 'flex', justifyContent: 'center',
        marginTop: '1.5rem',
      }}>
        <div style={{
          pointerEvents: 'auto',
          background: 'var(--sf)', border: '1px solid var(--ln)',
          borderRadius: 999, padding: '.4rem .4rem .4rem 1.1rem',
          display: 'flex', alignItems: 'center', gap: '.8rem',
          boxShadow: '0 8px 28px rgba(0,0,0,.18)',
          transition: 'opacity .2s, transform .2s',
          opacity: sel.length > 0 ? 1 : 0,
          transform: sel.length > 0 ? 'translateY(0)' : 'translateY(12px)',
        }}>
          {/* Mini card previews */}
          <div style={{ display: 'flex', gap: '.25rem', alignItems: 'center' }}>
            {[0, 1, 2].map(i => {
              const c = selCards[i]
              return (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: c ? 'var(--ac)' : 'var(--ln)',
                  display: 'grid', placeItems: 'center',
                  overflow: 'hidden', transition: 'background .15s',
                }}>
                  {c?.image_url
                    ? <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : c ? <span style={{ fontSize: '.9rem' }}>{c.emoji ?? c.name[0]}</span>
                    : <span style={{ opacity: .4, fontSize: '.7rem', color: 'var(--mut)' }}>{i + 1}</span>}
                </div>
              )
            })}
          </div>
          <button
            className="btn bl"
            disabled={sel.length !== 3 || finding}
            onClick={find}
            style={{ borderRadius: 999 }}
          >
            {finding ? <RiLoader4Line size={18} className="spin" /> : <RiTeamLine size={18} />}
            {sel.length < 3 ? `${sel.length}/3 dipilih` : finding ? 'Mencari…' : 'Cari lawan'}
          </button>
        </div>
      </div>
    </div>
  )
}
