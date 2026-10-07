'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RiCoinLine, RiHeartLine, RiHeartFill, RiRefreshLine, RiSearchLine, RiShoppingCartLine, RiCloseLine } from 'react-icons/ri'
import { Card } from '@/components/Card'
import { CardGridSkeleton } from '@/components/Skeleton'
import { useProfile, useUser } from '@/lib/hooks'
import { supabase } from '@/lib/supabase'
import { sfx } from '@/lib/sound'
import { toastSuccess } from '@/lib/alert'
import { ELEMENTS, type CardData, type El } from '@/lib/game'

type L = {
  id: string; card_id: string; price: number; created_at: string
  seller_nickname: string; seller_avatar: string | null
  name: string; element: string; hp: number; atk: number; def: number; spd: number
  skill: string; skill_desc: string; hue: number; image_url: string | null
}

const toCard = (l: L): CardData => ({ id: l.card_id, name: l.name, element: l.element as El, hp: l.hp, atk: l.atk, def: l.def, spd: l.spd, skill: l.skill, skill_desc: l.skill_desc, hue: l.hue, image_url: l.image_url })

export default function Market() {
  const { user, ready } = useUser()
  const { profile, reload } = useProfile()
  const [listings, setListings] = useState<L[]>([])
  const [loading, setLoading] = useState(true)
  const [buy, setBuy] = useState<L | null>(null)
  const [berr, setBerr] = useState(''), [busy, setBusy] = useState(false)
  const [elems, setElems] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'baru' | 'murah' | 'mahal'>('baru')
  const [wish, setWish] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('wish') ?? '[]')) } catch { return new Set() }
  })
  const toggleWish = (id: string) => setWish(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id)
    localStorage.setItem('wish', JSON.stringify([...n]))
    return n
  })

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('market_listings')
    setListings((data ?? []) as L[]); setLoading(false)
  }, [])
  useEffect(() => { if (ready) { if (user) void load(); else setLoading(false) } }, [ready, user, load])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    let v = listings.filter(l => l.name.toLowerCase().includes(t) && (!elems.size || elems.has(l.element)))
    if (sort === 'murah') v = [...v].sort((a, b) => a.price - b.price)
    else if (sort === 'mahal') v = [...v].sort((a, b) => b.price - a.price)
    else v = [...v].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return v
  }, [listings, elems, q, sort])

  const reset = () => { setElems(new Set()); setQ(''); setSort('baru') }
  const toggle = (s: Set<string>, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n }

  if (ready && !user) return <div className="w page"><div className="pagehead"><h2>Marketplace</h2><p className="sub">Masuk untuk membeli atau menjual kartu.</p><div className="actions"><Link href="/masuk" className="btn">Masuk</Link></div></div></div>

  const pts = profile?.points ?? 0
  const beli = async () => {
    if (!buy) return
    setBusy(true); setBerr('')
    const { error } = await supabase.rpc('buy_card', { lid: buy.id })
    setBusy(false)
    if (error) { sfx('error'); return setBerr(error.message) }
    sfx('success')
    const nama = buy.name
    setBuy(null); void load(); void reload()
    void toastSuccess(`Kartu "${nama}" berhasil dibeli!`, 'Kartu sudah masuk ke koleksimu.')
  }

  return (
    <div className="w page">
      <div className="pagehead mkt-head">
        <div>
          <h2>Marketplace</h2>
          <p className="sub">Beli & jual kartu memakai poin.</p>
        </div>
        {user && <span className="mkt-bal"><RiCoinLine size={18} />{pts.toLocaleString('id-ID')} <small>poinmu</small></span>}
      </div>

      <div className="mkt">
        <div className="mkt-tools">
          <div className="mkt-search">
            <RiSearchLine size={17} aria-hidden />
            <input value={q} placeholder="Cari kartu…" aria-label="Cari kartu" onChange={e => setQ(e.target.value)} />
            {q && <button className="mkt-x" onClick={() => setQ('')} aria-label="Kosongkan pencarian"><RiCloseLine size={15} /></button>}
          </div>

          <div className="mkt-chips" role="group" aria-label="Filter elemen">
            <button className={`chip${elems.size === 0 ? ' on' : ''}`} onClick={() => setElems(new Set())} aria-pressed={elems.size === 0}>Semua</button>
            {Object.keys(ELEMENTS).map(el => (
              <button key={el} className={`chip${elems.has(el) ? ' on' : ''}`} onClick={() => setElems(s => toggle(s, el))} aria-pressed={elems.has(el)}>
                <span className="sw" style={{ background: ELEMENTS[el as El] }} />{el}
              </button>
            ))}
          </div>

          <div className="mkt-row">
            <span className="mkt-count">{loading ? 'Memuat…' : `${shown.length} kartu`}</span>
            <div className="mkt-row-btns">
              <button className="mkt-reset" onClick={reset}><RiRefreshLine size={13} />Reset</button>
              <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                <option value="baru">Terbaru</option>
                <option value="murah">Harga termurah</option>
                <option value="mahal">Harga termahal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mkt-grid">
            {loading ? <CardGridSkeleton n={6} />
              : shown.length ? shown.map(l => (
                <div key={l.id} className="p-card">
                  <div className="p-stage" style={{ '--elm': ELEMENTS[l.element as El] } as React.CSSProperties}>
                    <span className="p-badge" style={{ background: ELEMENTS[l.element as El] }}>{l.element}</span>
                    <button className={`p-heart${wish.has(l.id) ? ' on' : ''}`} onClick={() => toggleWish(l.id)} aria-pressed={wish.has(l.id)} aria-label={wish.has(l.id) ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}><RiHeartLine size={17} /></button>
                    <Link href={`/c/${l.card_id}`} className="kt-link"><Card c={toCard(l)} /></Link>
                  </div>
                  <div className="p-body">
                    <h4 title={l.name}>{l.name}</h4>
                    <p className="p-desc">{l.skill_desc || l.skill}</p>
                    <div className="p-meta">
                      <span className="p-el" style={{ '--elm': ELEMENTS[l.element as El] } as React.CSSProperties}>{l.element}</span>
                      <span className="p-seller">{l.seller_nickname}</span>
                    </div>
                    <div className="p-bar">
                      <span className="p-price"><RiCoinLine size={15} />{l.price.toLocaleString('id-ID')}<small>poin</small></span>
                      <button className="p-buy" onClick={() => { setBerr(''); setBuy(l) }}><RiShoppingCartLine size={15} />Beli</button>
                    </div>
                  </div>
                </div>
              )) : <div className="empty">Market masih sepi atau tidak ada yang cocok dengan filtermu.<br /><small style={{ fontWeight: 500 }}>Jual kartumu: buka Koleksi → klik kartu → Jual di marketplace.</small></div>}
          </div>
      </div>

      {buy && <div className="modal on" onClick={e => e.target === e.currentTarget && setBuy(null)}>
        <div className="mb buy" role="dialog" aria-modal="true" aria-label="Konfirmasi pembelian">
          <button className="x" onClick={() => setBuy(null)} aria-label="Batal"><RiCloseLine size={18} /></button>
          <h3 style={{ marginTop: 0, marginBottom: '.3rem' }}>Beli kartu ini?</h3>
          <div className="buy-card">
            <Card c={toCard(buy)} w={118} />
            <div className="buy-card-info">
              <span className="rdot" style={{ background: ELEMENTS[buy.element as El], marginBottom: '.2rem', boxShadow: `0 0 6px ${ELEMENTS[buy.element as El]}` }} />
              <b>{buy.name}</b>
              <small>{buy.seller_nickname}</small>
              <small><RiCoinLine size={11} style={{ verticalAlign: -1 }} /> {buy.price.toLocaleString('id-ID')} poin</small>
            </div>
          </div>
          <div className="buy-stats">
            <div><b>{pts.toLocaleString('id-ID')}</b><small>Poin kamu</small></div>
            <div className="buy-minus"><b>-{buy.price.toLocaleString('id-ID')}</b><small>Harga</small></div>
            <div><b>{Math.max(0, pts - buy.price).toLocaleString('id-ID')}</b><small>Sisa</small></div>
          </div>
          {berr && <p className="err" style={{ margin: '0 0 .4rem' }}>{berr}</p>}
          <div className="cd-btns buy-btns">
            <button className="btn sm" disabled={busy || pts < buy.price} onClick={beli}>{busy ? 'Memproses...' : 'Beli sekarang'}</button>
            <button className="btn ln sm" onClick={() => setBuy(null)}>Batal</button>
          </div>
        </div>
      </div>}
    </div>
  )
}