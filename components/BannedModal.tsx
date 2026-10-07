'use client'
import { RiForbidLine, RiLogoutBoxLine } from 'react-icons/ri'
import { useProfile, useSignOut } from '@/lib/hooks'

// Modal global: tampil saat akun dibekukan admin. Login tetap jalan (Supabase Auth
// tidak bisa di-block), tapi semua aksi inti (battle/market) sudah dicegat oleh
// cek_ban() di RPC. Modal ini cuma info + cara keluar.
export function BannedModal() {
  const { profile } = useProfile()
  const signOut = useSignOut()
  if (!profile?.banned) return null
  return (
    <div className="modal on" role="alertdialog" aria-modal="true" aria-label="Akun dibekukan">
      <div className="dlg" style={{ textAlign: 'center', maxWidth: 380 }}>
        <span style={{ fontSize: '2.4rem', display: 'inline-block' }}><RiForbidLine size={44} /></span>
        <h3 style={{ margin: '.5rem 0 .3rem' }}>Akun kamu dibekukan</h3>
        <p className="sub" style={{ margin: 0 }}>Akun ini dibekukan oleh admin, sehingga tidak bisa bertarung atau bertransaksi. Hubungi admin jika ini sebuah kesalahan.</p>
        <button className="btn rd" style={{ marginTop: '1.2rem' }} onClick={signOut}><RiLogoutBoxLine size={18} />Keluar</button>
      </div>
    </div>
  )
}