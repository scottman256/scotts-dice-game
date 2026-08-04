import React, { useEffect, useState } from 'react'
import ConfirmActionModal from './ConfirmActionModal'
import SystemScoreModal from './SystemScoreModal'

function formatCompletedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function ScoreboardScreen({
  mode,
  loadScores,
  isAdmin = false,
  deleteScore,
  resetGameData,
  addSystemScore,
  onGameDataReset = () => {},
  onBack,
}) {
  const [scores, setScores] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const [selectedScore, setSelectedScore] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [modalError, setModalError] = useState('')
  const isPersonal = mode === 'personal'
  const adminView = isAdmin && !isPersonal

  useEffect(() => {
    let active = true
    setStatus('loading')
    setErrorMessage('')

    loadScores(mode)
      .then((entries) => {
        if (!active) return
        setScores(entries)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setStatus('error')
        setErrorMessage('We could not load scores right now. Please try again.')
      })

    return () => {
      active = false
    }
  }, [loadScores, mode, refreshCount])

  function refreshScores() {
    setRefreshCount((count) => count + 1)
  }

  async function handleDeleteScore() {
    setActionBusy(true)
    setAdminError('')
    try {
      await deleteScore(selectedScore.scoreId)
      setSelectedScore(null)
      refreshScores()
    } catch (error) {
      setSelectedScore(null)
      setAdminError(error?.message || 'That score could not be deleted.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleResetGameData() {
    setActionBusy(true)
    setAdminError('')
    try {
      await resetGameData()
      setResetOpen(false)
      onGameDataReset()
      refreshScores()
    } catch (error) {
      setResetOpen(false)
      setAdminError(error?.message || 'Game data could not be reset.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleAddSystemScore(entry) {
    setActionBusy(true)
    setModalError('')
    try {
      await addSystemScore(entry)
      setAddOpen(false)
      refreshScores()
    } catch (error) {
      setModalError(error?.message || 'The system score could not be added.')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <main className="scores-page" aria-labelledby="scores-title">
      <div className="scores-heading">
        <div>
          <p className="eyebrow">High scores</p>
          <h1 id="scores-title">{isPersonal ? 'My Top 10 Scores' : 'Top 10 Overall'}</h1>
          <p>{isPersonal ? 'Your ten best completed games.' : 'The best completed games from every player.'}</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </div>

      {adminView && (
        <div className="admin-score-toolbar" aria-label="Leaderboard administration">
          <div>
            <strong>Admin leaderboard controls</strong>
            <span>Add fictional challengers, remove individual entries, or restore the original scoreboard.</span>
          </div>
          <div>
            <button type="button" className="admin-primary-button" onClick={() => setAddOpen(true)}>Add system score</button>
            <button type="button" className="admin-danger-button" onClick={() => setResetOpen(true)}>Restore defaults</button>
          </div>
        </div>
      )}
      {adminError && <p className="admin-inline-error" role="alert">{adminError}</p>}

      <section className="scores-card" aria-live="polite">
        {status === 'loading' && <p className="scores-state" role="status">Loading scores…</p>}
        {status === 'error' && <p className="scores-state scores-error" role="alert">{errorMessage}</p>}
        {status === 'ready' && scores.length === 0 && (
          <p className="scores-state">No completed games yet. Finish a game to claim the first spot.</p>
        )}
        {status === 'ready' && scores.length > 0 && (
          <table>
            <caption className="visually-hidden">
              {isPersonal ? 'Personal top ten high scores' : 'Overall top ten high scores'}
            </caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Completed</th>{adminView && <th scope="col">Admin</th>}</tr></thead>
            <tbody>
              {scores.map((entry) => (
                <tr key={entry.scoreId}>
                  <td><span className="score-rank">#{entry.rank}</span></td>
                  <td>{entry.playerName}</td>
                  <td><strong>{entry.score}</strong></td>
                  <td>{formatCompletedAt(entry.completedAt)}</td>
                  {adminView && <td><button type="button" className="admin-delete-link" onClick={() => setSelectedScore(entry)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedScore && (
        <ConfirmActionModal
          title={`Delete ${selectedScore.playerName}'s score?`}
          description={`Remove the ${selectedScore.score}-point game. The player's statistics and achievements will be rebuilt from their remaining games.`}
          confirmLabel="Delete score"
          busyLabel="Deleting…"
          isBusy={actionBusy}
          onCancel={() => setSelectedScore(null)}
          onConfirm={handleDeleteScore}
        />
      )}
      {resetOpen && (
        <ConfirmActionModal
          title="Restore the original leaderboard?"
          description="This deletes all player game history, achievements, saved games, and custom system scores. User accounts remain."
          confirmLabel="Restore defaults"
          busyLabel="Restoring…"
          isBusy={actionBusy}
          onCancel={() => setResetOpen(false)}
          onConfirm={handleResetGameData}
        />
      )}
      {addOpen && (
        <SystemScoreModal
          isBusy={actionBusy}
          errorMessage={modalError}
          onCancel={() => setAddOpen(false)}
          onSave={handleAddSystemScore}
        />
      )}
    </main>
  )
}
