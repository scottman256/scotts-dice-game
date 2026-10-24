import React, { useEffect, useId, useRef } from 'react'

export default function StartNewGameModal({ isBusy, errorMessage, onCancel, onConfirm }) {
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
    if (isBusy) return
    dialogRef.current.close()
    onCancel()
  }

  return (
    <dialog
      className="start-new-game-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isBusy}
      onCancel={(event) => {
        event.preventDefault()
        handleCancel()
      }}
    >
      <p className="eyebrow">Start over</p>
      <h2 id={titleId}>Start a new game?</h2>
      <p id={descriptionId}>
        Your current game’s progress will be lost. This cannot be undone.
        Unfinished games do not count toward your statistics.
      </p>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <div className="start-new-game-actions">
        <button className="start-new-game-cancel" type="button" ref={cancelButtonRef} onClick={handleCancel} disabled={isBusy}>
          Keep Playing
        </button>
        <button className="start-new-game-confirm" type="button" onClick={onConfirm} disabled={isBusy}>
          {isBusy ? 'Starting New Game…' : 'Start New Game'}
        </button>
      </div>
    </dialog>
  )
}
