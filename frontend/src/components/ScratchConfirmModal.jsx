import React, { useEffect, useId, useRef } from 'react'

export default function ScratchConfirmModal({ categoryLabel, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    cancelButtonRef.current.focus()
    return () => dialog.close()
  }, [])

  function handleCancel() {
    dialogRef.current.close()
    onCancel()
  }

  function handleConfirm() {
    dialogRef.current.close()
    onConfirm()
  }

  return (
    <dialog
      className="scratch-confirm-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        handleCancel()
      }}
    >
      <p className="eyebrow">Scratch category</p>
      <h2 id={titleId}>Score zero in this category?</h2>
      <p id={descriptionId}>
        <strong>{categoryLabel}</strong> will be filled with 0 points, ending this turn.
      </p>
      <div className="scratch-confirm-actions">
        <button type="button" className="scratch-confirm-cancel" ref={cancelButtonRef} onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" className="scratch-confirm-submit" onClick={handleConfirm}>
          Score zero
        </button>
      </div>
    </dialog>
  )
}
