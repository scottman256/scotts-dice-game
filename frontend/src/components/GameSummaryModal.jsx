import React, { useEffect, useId, useRef } from 'react'
import GameSummary from './GameSummary'

export default function GameSummaryModal({ summary, score, onClose }) {
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    headingRef.current.focus()
    return () => dialog.close()
  }, [])

  function handleClose() {
    dialogRef.current.close()
    onClose()
  }

  return (
    <dialog
      className="game-summary-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
    >
      <div className="game-summary-modal-body">
        <p className="eyebrow">Your results</p>
        <h2 id={titleId} ref={headingRef} tabIndex="-1">Game Complete</h2>
        <p className="game-summary-score"><span>Final score</span><strong>{score}</strong></p>
        {summary.newHighScore && <p className="game-summary-high-score">NEW HIGH SCORE</p>}
        <GameSummary summary={summary} />
      </div>
      <div className="game-summary-actions">
        <button type="button" onClick={handleClose}>Back to scorecard</button>
      </div>
    </dialog>
  )
}
