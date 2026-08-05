import React, { useEffect, useRef, useState } from 'react'
import AdminModalPortal from './AdminModalPortal'

export default function SystemScoreModal({ isBusy, errorMessage, onCancel, onSave }) {
  const [playerName, setPlayerName] = useState('')
  const [score, setScore] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    onSave({ playerName: playerName.trim(), score: Number(score) })
  }

  const scoreNumber = Number(score)
  const valid = playerName.trim() && score !== '' && scoreNumber >= 0 && scoreNumber <= 2000

  return (
    <AdminModalPortal>
      <div className="admin-modal-backdrop">
        <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="system-score-title">
          <p className="eyebrow">Leaderboard entry</p>
          <h1 id="system-score-title">Add system score</h1>
          <p>Create a fictional leaderboard challenger. This account cannot sign in.</p>
          {errorMessage && <p className="admin-inline-error" role="alert">{errorMessage}</p>}
          <form className="admin-modal-form" onSubmit={handleSubmit}>
            <label>
              Player name
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength="100" disabled={isBusy} ref={nameRef} />
            </label>
            <label>
              Score
              <input type="number" min="0" max="2000" value={score} onChange={(event) => setScore(event.target.value)} disabled={isBusy} />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-modal-cancel" onClick={onCancel} disabled={isBusy}>Cancel</button>
              <button type="submit" className="admin-primary-button" disabled={isBusy || !valid}>
                {isBusy ? 'Adding…' : 'Add score'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminModalPortal>
  )
}
