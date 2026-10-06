import Swal from 'sweetalert2'

export async function toastSuccess(title: string, text = '') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Oke',
    customClass: { popup: 'swal-pop', confirmButton: 'swal-confirm' },
    buttonsStyling: false,
    background: 'var(--sf)',
    color: 'var(--ink)',
    iconColor: 'var(--mn)',
  })
}