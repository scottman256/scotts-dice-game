import React, { useEffect, useRef, useState } from 'react'
import Scorecard from './Scorecard'
import { GAME_THEMES, normalizeGameSettings } from '../settings/gameThemes'

export default function CompletedGameScreen({ entry, completedAtLabel, loadGame, onBack, onThemePreview }) {
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current.focus()
  }, [])

  useEffect(() => {
    let active = true
    setStatus('loading')
    loadGame(entry.scoreId)
      .then((completedGame) => {
        if (!active) return
        setGame(completedGame)
        setStatus('ready')
      })
      .catch((error) => {
        if (active) setStatus(error?.status === 404 ? 'not-found' : 'error')
      })
    return () => { active = false }
  }, [entry.scoreId, loadGame, attempt])

  useEffect(() => {
    if (game) onThemePreview(normalizeGameSettings({ theme: game.theme }).theme)
    return () => onThemePreview(null)
  }, [game, onThemePreview])

  const themeLabel = GAME_THEMES.find(({ id }) => id === game?.theme)?.label

  return (
    <main className="scores-page completed-game-page" aria-labelledby="completed-game-title" id={`completed-game-${entry.scoreId}`}>
      <div className="scores-heading">
        <div>
          <p className="eyebrow">My Top 10 · Completed game</p>
          <h1 id="completed-game-title" ref={headingRef} tabIndex={-1}>Finished Scorecard</h1>
          <p>Final score: {game?.score ?? entry.score} · {completedAtLabel}{themeLabel && ` · ${themeLabel}`}</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to My Top 10</button>
      </div>

      {status === 'loading' && <p className="scores-card scores-state" role="status">Loading scorecard…</p>}
      {status === 'not-found' && (
        <p className="scores-card scores-state" role="alert">This completed game is no longer available.</p>
      )}
      {status === 'error' && (
        <div className="scores-card completed-game-error">
          <p className="scores-state scores-error" role="alert">We could not load this scorecard. Please try again.</p>
          <button type="button" className="scores-back-button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
        </div>
      )}
      {status === 'ready' && (
        game.scorecardAvailable ? (
          <>
            <Scorecard scores={game.categoryScores} gameComplete readOnly />
            <button type="button" className="scores-back-button completed-game-back" onClick={onBack}>Back to My Top 10</button>
          </>
        ) : (
          <p className="scores-card scores-state">The category scores were not recorded for this older game. Its final score is still saved in My Top 10.</p>
        )
      )}
    </main>
  )
}
