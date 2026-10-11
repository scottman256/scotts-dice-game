import React, { useEffect, useReducer, useRef, useState } from 'react'
import ScratchConfirmModal from './ScratchConfirmModal'
import GameSummary from './GameSummary'
import GameSummaryModal from './GameSummaryModal'
import Scorecard from './Scorecard'
import { getDiceSet } from '../assets/diceSets'
import { randomFace, rollUnheldDice } from '../diceLogic'
import {
  EXTRA_ROLL_LIMIT,
  GAME_ACTIONS,
  NORMAL_ROLL_LIMIT,
  createInitialGameState,
  gameReducer,
  getCategoryScoreAvailability,
  getGameViewState,
} from '../gameState'

function createGameId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export default function DiceRoller({
  animateRolls = true,
  confirmScratches = true,
  faceRoller = randomFace,
  highScoreStatus = null,
  gameSummary = null,
  isActive = true,
  initialGameId,
  initialState,
  onGameComplete,
  onGameStateChange,
  onNewGame,
  theme = 'classic',
} = {}) {
  const [state, dispatch] = useReducer(gameReducer, initialState, createInitialGameState)
  const [pendingScratch, setPendingScratch] = useState(null)
  const [rollingDice, setRollingDice] = useState([])
  const [dismissedSummaryId, setDismissedSummaryId] = useState(null)
  const summaryButtonRef = useRef(null)
  const rollButtonRef = useRef(null)
  const newGameButtonRef = useRef(null)
  const focusAfterScratchRef = useRef(false)
  const gameIdRef = useRef(initialGameId || createGameId())
  const hasRenderedInitialStateRef = useRef(false)
  const submittedGameRef = useRef(null)
  const diceSet = getDiceSet(theme)
  const {
    dice,
    heldDice,
    rollCount,
    scores,
    extraRollsUsed,
    status,
    statusTone,
  } = state
  const {
    gameComplete,
    totals,
    hasSpectacularScore,
    hasRolled,
    sum,
    extraRollsRemaining,
    rollDisabled,
    canToggleHolds,
    heldCount,
    rollButtonLabel,
  } = getGameViewState(state)
  const currentSummary = gameComplete && gameSummary?.gameId === gameIdRef.current ? gameSummary : null

  function handleCloseSummary() {
    setDismissedSummaryId(gameIdRef.current)
    summaryButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!animateRolls) setRollingDice([])
  }, [animateRolls])

  useEffect(() => {
    if (!pendingScratch && focusAfterScratchRef.current) {
      focusAfterScratchRef.current = false
      const nextAction = gameComplete ? newGameButtonRef.current : rollButtonRef.current
      nextAction?.focus({ preventScroll: true })
    }
  }, [pendingScratch, gameComplete])

  useEffect(() => {
    if (!hasRenderedInitialStateRef.current) {
      hasRenderedInitialStateRef.current = true
      return
    }
    onGameStateChange?.({ gameId: gameIdRef.current, state })
  }, [onGameStateChange, state])

  useEffect(() => {
    if (
      gameComplete
      && onGameComplete
      && submittedGameRef.current !== gameIdRef.current
    ) {
      submittedGameRef.current = gameIdRef.current
      onGameComplete({
        gameId: gameIdRef.current,
        score: totals.grandTotal,
        theme,
        categoryScores: scores,
      })
    }
  }, [gameComplete, onGameComplete, scores, theme, totals.grandTotal])

  function handleRoll() {
    if (rollDisabled || pendingScratch) return

    setRollingDice(animateRolls ? heldDice.map((held) => !held) : [])
    dispatch({
      type: GAME_ACTIONS.roll,
      dice: rollUnheldDice(dice, heldDice, faceRoller),
    })
  }

  function handleToggleHold(index) {
    if (pendingScratch) return
    stopDieAnimation(index)
    dispatch({ type: GAME_ACTIONS.toggleHold, index })
  }

  function stopDieAnimation(index) {
    setRollingDice((current) => current.map((rolling, dieIndex) => dieIndex === index ? false : rolling))
  }

  function handleScore(category) {
    if (pendingScratch) return
    const { canScore, canScratch } = getCategoryScoreAvailability(category, {
      dice, rollCount, scores, gameComplete,
    })
    if (!canScore) return
    if (confirmScratches && canScratch) {
      setPendingScratch(category)
      return
    }
    dispatch({ type: GAME_ACTIONS.score, category })
  }

  function handleConfirmScratch() {
    if (!pendingScratch) return
    focusAfterScratchRef.current = true
    dispatch({ type: GAME_ACTIONS.score, category: pendingScratch })
    setPendingScratch(null)
  }

  function handleNewGame() {
    if (pendingScratch) return
    gameIdRef.current = createGameId()
    submittedGameRef.current = null
    onNewGame?.({ gameId: gameIdRef.current })
    dispatch({ type: GAME_ACTIONS.newGame })
  }

  return (
    <main className="game-layout">
      <section className="roller-card" aria-labelledby="roller-title">
        <div className="roller-heading">
          <div>
            <p className="eyebrow">Five dice</p>
            <h2 id="roller-title">Your Roll</h2>
          </div>
          <div className="roll-counter" aria-label={hasRolled ? `Roll ${rollCount}` : 'Turn not started'}>
            <span>ROLL</span>
            <strong>
              {hasRolled ? `${rollCount}/${rollCount > NORMAL_ROLL_LIMIT ? rollCount : NORMAL_ROLL_LIMIT}` : '—'}
            </strong>
          </div>
        </div>

        {gameComplete && (
          <div
            className={`final-score-display${hasSpectacularScore ? ' spectacular-score-display' : ''}`}
            role="status"
            aria-label={
              hasSpectacularScore
                ? `Game complete. Spectacular score over 500. Final score ${totals.grandTotal}`
                : `Game complete. Final score ${totals.grandTotal}`
            }
          >
            {hasSpectacularScore && (
              <span className="score-fireworks" aria-hidden="true">
                <span className="firework firework-one" />
                <span className="firework firework-two" />
                <span className="firework firework-three" />
              </span>
            )}
            <span className="final-score-kicker">
              {hasSpectacularScore ? 'Game Complete — Spectacular!' : 'Game Complete'}
            </span>
            <span className="final-score-label">Final Score</span>
            <strong className="final-score-number">{totals.grandTotal}</strong>
            {highScoreStatus === 'new' && (
              <strong className="new-high-score-message">NEW HIGH SCORE</strong>
            )}
            {currentSummary && (
              <>
                <GameSummary summary={currentSummary} compact />
                <button
                  type="button"
                  className="view-game-summary-button"
                  ref={summaryButtonRef}
                  onClick={() => setDismissedSummaryId(null)}
                >
                  View game summary
                </button>
              </>
            )}
          </div>
        )}

        <div
          className="dice-row"
          data-dice-theme={diceSet.id}
          aria-live="polite"
          aria-label={hasRolled ? `Dice total ${sum}` : 'Dice have not been rolled'}
        >
          {dice.map((value, index) => (
            <button
              type="button"
              className={`die${value ? '' : ' die-empty'}${heldDice[index] ? ' die-held' : ''}`}
              key={index}
              onClick={() => handleToggleHold(index)}
              disabled={!canToggleHolds || !value}
              aria-pressed={value ? heldDice[index] : undefined}
              aria-label={
                value
                  ? `Die ${index + 1} showing ${value}. ${heldDice[index] ? 'Held; click to release.' : 'Click to hold.'}`
                  : `Die ${index + 1} has not been rolled.`
              }
              aria-describedby="hold-help"
            >
              {value ? (
                <>
                  <img
                    // Restart each unheld die's animation even when its face stays the same.
                    key={heldDice[index] ? 'held' : rollCount}
                    className={animateRolls && rollingDice[index] ? 'die-tumbling' : undefined}
                    onAnimationEnd={() => stopDieAnimation(index)}
                    src={diceSet.faces[value - 1]}
                    alt=""
                    width="64"
                    height="64"
                    draggable="false"
                  />
                  {heldDice[index] && <span className="held-badge" aria-hidden="true">Held</span>}
                </>
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </button>
          ))}
        </div>

        <p className="hold-help" id="hold-help">
          {!hasRolled
            ? 'Roll the dice, then click any die you want to hold.'
            : canToggleHolds
              ? `${heldCount} ${heldCount === 1 ? 'die' : 'dice'} held. Click a die to hold or release it before the next roll.`
              : 'No rolls remain. Cash in a score to clear the dice and start a new turn.'}
        </p>

        <div className="controls">
          <button type="button" className="roll-button" ref={rollButtonRef} onClick={handleRoll} disabled={rollDisabled}>
            {rollButtonLabel}
          </button>
          <div className="sum">Sum <strong>{sum ?? '—'}</strong></div>
          {gameComplete && (
            <button type="button" className="new-game-button top-new-game-button" ref={newGameButtonRef} onClick={handleNewGame}>
              New Game
            </button>
          )}
        </div>

        <p
          className={`turn-status${statusTone === 'normal' ? '' : ` status-${statusTone}`}`}
          role="status"
        >
          {status}
        </p>

        <fieldset className="extra-rolls">
          <legend>Fourth-roll chances</legend>
          <div className="chance-list">
            {Array.from({ length: EXTRA_ROLL_LIMIT }, (_, index) => {
              const used = index < extraRollsUsed
              return (
                <label className={`extra-chance${used ? ' chance-used' : ''}`} key={index}>
                  <input type="checkbox" checked={used} disabled readOnly />
                  <span>
                    Chance {index + 1}
                    <small>{used ? 'Used' : 'Available'}</small>
                  </span>
                </label>
              )
            })}
          </div>
          <p>{extraRollsRemaining} of 3 remaining for this game</p>
        </fieldset>
      </section>

      <Scorecard
        dice={dice}
        rollCount={rollCount}
        scores={scores}
        gameComplete={gameComplete}
        onScore={handleScore}
        onNewGame={handleNewGame}
      />
      {isActive && currentSummary && dismissedSummaryId !== gameIdRef.current && (
        <GameSummaryModal summary={currentSummary} score={totals.grandTotal} onClose={handleCloseSummary} />
      )}
      {pendingScratch && (
        <ScratchConfirmModal
          categoryLabel={pendingScratch.label}
          onCancel={() => setPendingScratch(null)}
          onConfirm={handleConfirmScratch}
        />
      )}
    </main>
  )
}
