import React, { useEffect, useState } from 'react'

function formatCompletedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function ScoreboardScreen({ mode, loadScores, onBack }) {
  const [scores, setScores] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const isPersonal = mode === 'personal'

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
  }, [loadScores, mode])

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
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Completed</th></tr></thead>
            <tbody>
              {scores.map((entry) => (
                <tr key={entry.scoreId}>
                  <td><span className="score-rank">#{entry.rank}</span></td>
                  <td>{entry.playerName}</td>
                  <td><strong>{entry.score}</strong></td>
                  <td>{formatCompletedAt(entry.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
