import React, { useEffect, useRef } from 'react'

export default function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  busyLabel,
  isBusy,
  danger = true,
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()
  }, [])

  return (
    <div className="admin-modal-backdrop">
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <span className={`admin-modal-mark${danger ? ' admin-modal-mark-danger' : ''}`} aria-hidden="true">
          {danger ? '!' : '✓'}
        </span>
        <p className="eyebrow">Administrator confirmation</p>
        <h1 id="admin-confirm-title">{title}</h1>
        <p id="admin-confirm-description">{description}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-cancel" onClick={onCancel} disabled={isBusy} ref={cancelButtonRef}>
            Cancel
          </button>
          <button type="button" className={danger ? 'admin-danger-button' : 'admin-primary-button'} onClick={onConfirm} disabled={isBusy}>
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
