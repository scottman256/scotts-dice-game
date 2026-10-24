import React, { useEffect, useId, useRef } from 'react'
import AdminModalPortal from './AdminModalPortal'

export default function AdminDialog({ title, busy = false, onClose, children }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(document.activeElement)
  const titleId = useId()

  useEffect(() => {
    const opener = openerRef.current
    const dialog = dialogRef.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return (
    <AdminModalPortal>
      <dialog className="admin-modal admin-native-dialog" ref={dialogRef} aria-labelledby={titleId}
        aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
        <p className="eyebrow">Administration</p>
        <h1 id={titleId}>{title}</h1>
        {children}
      </dialog>
    </AdminModalPortal>
  )
}
