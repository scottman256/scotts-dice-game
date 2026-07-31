import React, { useEffect, useRef } from 'react'
import { CATEGORY_COUNT } from '../gameRules'

export default function ResumeGameModal({ savedGame, isStartingNew, onContinue, onStartNew }) {
  const continueButtonRef = useRef(null)
  const scoredCount = Object.keys(savedGame.scores).length

  useEffect(() => {
    continueButtonRef.current?.focus()
  }, [])

  return (
    <div className="resume-game-backdrop">
      <section
        className="resume-game-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-game-title"
        aria-describedby="resume-game-description"
      >
        <span className="resume-game-die" aria-hidden="true">⚄</span>
        <p className="eyebrow">Saved game found</p>
        <h1 id="resume-game-title">Welcome back!</h1>
        <p id="resume-game-description">
          Continue your last game or clear its progress and begin a new one.
        </p>
        <dl className="resume-game-summary">
          <div>
            <dt>Scorecard</dt>
            <dd>{scoredCount}/{CATEGORY_COUNT} filled</dd>
          </div>
          <div>
            <dt>Current turn</dt>
            <dd>{savedGame.rollCount ? `Roll ${savedGame.rollCount}` : 'Ready to roll'}</dd>
          </div>
        </dl>
        <div className="resume-game-actions">
          <button
            type="button"
            className="resume-game-continue"
            onClick={onContinue}
            disabled={isStartingNew}
            ref={continueButtonRef}
          >
            Continue Last Game
          </button>
          <button
            type="button"
            className="resume-game-new"
            onClick={onStartNew}
            disabled={isStartingNew}
          >
            {isStartingNew ? 'Starting New Game…' : 'Start New Game'}
          </button>
        </div>
      </section>
    </div>
  )
}
