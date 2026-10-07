'use client'
import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks'
import { toastSuccess } from '@/lib/alert'
import type { CardData } from '@/lib/game'

export type Deck = { id: string; name: string; card_ids: string[] }

type P = {
  cards: CardData[]
  sel: string[]
  onPick: (ids: string[]) => void
}

// Simpan & pakai ulang komposisi 3 kartu. Load deck = isi seleksi, Simpan = simpan seleksi saat ini.
export function DeckBar({ cards, sel, onPick }: P) {
  const { user } = useUser()
  const [decks, setDecks] = useState<Deck[]>([])
  const load = async () => {
    if (!user) { setDecks([]); return }
    const { data } = await supabase.from('decks').select('id,name,card_ids').order('created_at')
    setDecks((data ?? []) as Deck[])
  }
  useEffect(() => { void load() }, [user])
  const save = async () => {
    if (sel.length !== 3) return
    const name = window.prompt('Nama deck (mis. "Tim Utama")')
    if (!name?.trim()) return
    if (!cards.filter(c => sel.includes(c.id)).every(c => cards.some(x => x.id === c.id))) return
    const { error } = await supabase.from('decks').insert({ name: name.trim().slice(0, 32), card_ids: sel.filter(id => cards.some(c => c.id === id)) })
    if (!error) { void toastSuccess('Deck disimpan'); void load() }
  }
  const del = async (id: string) => {
    if (!window.confirm('Hapus deck ini?')) return
    await supabase.from('decks').delete().eq('id', id)
    void load()
  }
  const pick = (d: Deck) => onPick(d.card_ids.filter(id => cards.some(c => c.id === id)))
  if (!user) return null
  return (
    <div className="scroll" style={{ gap: '.6rem', alignItems: 'center', marginTop: '.8rem' }}>
      <Layers size={16} className="mut" style={{ flex: 'none' }} />
      {decks.map(d => (
        <span key={d.id} className="chip" role="button" tabIndex={0} onClick={() => pick(d)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') pick(d) }} title="Muat deck ini">
          {d.name}
          <button aria-label={`Hapus deck ${d.name}`} onClick={e => { e.stopPropagation(); del(d.id) }} style={{ border: 0, background: 'none', color: 'inherit', marginLeft: '.3rem', padding: 0, display: 'inline-flex' }}><Trash2 size={12} /></button>
        </span>
      ))}
      <button className="chip" onClick={save} disabled={sel.length !== 3} title="Simpan 3 kartu terpilih sebagai deck"><Plus size={14} />Simpan deck{sel.length === 3 ? '' : ' (3 kartu)'}</button>
    </div>
  )
}