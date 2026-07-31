import React, { useEffect, useReducer, useRef } from 'react'
import { getDiceSet } from '../assets/diceSets'
import { randomFace, rollUnheldDice } from '../diceLogic'
import {
  BOTTOM_CATEGORIES,
  CATEGORY_COUNT,
  TOP_CATEGORIES,
  TOP_BONUS_POINTS,
  TOP_BONUS_THRESHOLD,
  TOP_EXTRA_BONUS_POINTS,
  TOP_EXTRA_BONUS_THRESHOLD,
  evaluateCategory,
  getTotals,
} from '../gameRules'
import {
  EXTRA_ROLL_LIMIT,
  GAME_ACTIONS,
  NORMAL_ROLL_LIMIT,
  createInitialGameState,
  gameReducer,
  getGameViewState,
  hasSavedScore,
} from '../gameState'

function ScoreRow({ category, dice, rollCount, scores, gameComplete, onScore }) {
  const saved = hasSavedScore(scores, category.id)
  const result = evaluateCategory(category.id, dice, { rollCount, scores })
  const canScratch = rollCount >= NORMAL_ROLL_LIMIT && !result.qualifies
  const canScore = !gameComplete && !saved && rollCount > 0 && (result.qualifies || canScratch)
  const preview = result.qualifies ? result.points : canScratch ? 0 : null

  let scoreActionLabel = `Roll a qualifying combination for ${category.label}`
  if (result.qualifies) {
    scoreActionLabel = `Score ${result.points} points in ${category.label}`
  } else if (canScratch) {
    scoreActionLabel = `Record zero points in ${category.label}`
  }

  return (
    <tr className={result.qualifies && !saved ? 'qualifying-row' : undefined}>
      <td>
        <span className="category-name">{category.label}</span>
        <small>{category.description}</small>
      </td>
      <td className="score-cell">
        {saved ? (
          <output className="saved-score" aria-label={`${category.label}: ${scores[category.id]} points`}>
            {scores[category.id]}
          </output>
        ) : (
          <div className="score-action">
            <button
              className={`score-coin${canScratch && !result.qualifies ? ' scratch-coin' : ''}`}
              type="button"
              onClick={() => onScore(category)}
              disabled={!canScore}
              aria-label={scoreActionLabel}
              title={scoreActionLabel}
            >
              <span aria-hidden="true">$</span>
            </button>
            <span className="score-preview" aria-hidden="true">
              {preview === null ? '—' : preview}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

function TotalRow({ label, value, className = '' }) {
  return (
    <tr className={`total-row ${className}`.trim()}>
      <th scope="row">{label}</th>
      <td className="score-cell">
        <output>{value}</output>
      </td>
    </tr>
  )
}

function createGameId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function Scorecard({ dice, rollCount, scores, gameComplete, onScore, onNewGame }) {
  const totals = getTotals(scores)
  const scoredCount = Object.keys(scores).length
  const topFilledCount = TOP_CATEGORIES.filter(({ id }) => hasSavedScore(scores, id)).length
  const bottomFilledCount = BOTTOM_CATEGORIES.filter(({ id }) => hasSavedScore(scores, id)).length

  return (
    <section className="scorecard" aria-labelledby="scorecard-title">
      <div className="scorecard-heading">
        <div>
          <p className="eyebrow">Game score</p>
          <h2 id="scorecard-title">Scorecard</h2>
        </div>
        <span className="score-progress">{scoredCount}/{CATEGORY_COUNT} filled</span>
      </div>

      <p className="score-help" id="score-help">
        Gold dollar buttons can be scored now. After roll three, gray dollar buttons may be used to record a zero.
      </p>

      <div className="score-table-wrap">
        <table aria-describedby="score-help">
          <caption className="visually-hidden">Dice game scoring categories and saved scores</caption>
          <colgroup>
            <col />
            <col className="score-column" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section-row">
              <th scope="rowgroup" colSpan="2">
                <div className="section-heading">
                  <span>Top Section</span>
                  <span className="section-progress">{topFilledCount}/{TOP_CATEGORIES.length} filled</span>
                </div>
              </th>
            </tr>
            {TOP_CATEGORIES.map((category) => (
              <ScoreRow
                key={category.id}
                category={category}
                dice={dice}
                rollCount={rollCount}
                scores={scores}
                gameComplete={gameComplete}
                onScore={onScore}
              />
            ))}
            <tr className={`bonus-row${totals.topBonus ? ' bonus-earned' : ''}`}>
              <td>
                <span className="category-name">Top Section Bonus</span>
                <small>
                  {TOP_BONUS_POINTS} points when the top subtotal reaches {TOP_BONUS_THRESHOLD}
                  {' '}({totals.topSubtotal} / {TOP_BONUS_THRESHOLD})
                </small>
              </td>
              <td className="score-cell">
                <output aria-label={`Top section bonus: ${totals.topBonus} points`}>{totals.topBonus}</output>
              </td>
            </tr>
            <tr className={`bonus-row extra-bonus-row${totals.topExtraBonus ? ' bonus-earned' : ''}`}>
              <td>
                <span className="category-name">Top Section Extra Bonus</span>
                <small>
                  Additional {TOP_EXTRA_BONUS_POINTS} points when the top subtotal reaches
                  {' '}{TOP_EXTRA_BONUS_THRESHOLD} ({totals.topSubtotal} / {TOP_EXTRA_BONUS_THRESHOLD})
                </small>
              </td>
              <td className="score-cell">
                <output aria-label={`Top section extra bonus: ${totals.topExtraBonus} points`}>
                  {totals.topExtraBonus}
                </output>
              </td>
            </tr>

            <tr className="score-spacer" aria-hidden="true"><td colSpan="2" /></tr>

            <tr className="section-row">
              <th scope="rowgroup" colSpan="2">
                <div className="section-heading">
                  <span>Bottom Section</span>
                  <span className="section-progress">{bottomFilledCount}/{BOTTOM_CATEGORIES.length} filled</span>
                </div>
              </th>
            </tr>
            {BOTTOM_CATEGORIES.map((category) => (
              <ScoreRow
                key={category.id}
                category={category}
                dice={dice}
                rollCount={rollCount}
                scores={scores}
                gameComplete={gameComplete}
                onScore={onScore}
              />
            ))}

            <tr className="score-spacer" aria-hidden="true"><td colSpan="2" /></tr>

            <tr className="section-row final-section-row">
              <th scope="rowgroup" colSpan="2">Final Section</th>
            </tr>
            <TotalRow label="Total of Top Section" value={totals.topTotal} />
            <TotalRow label="Total of Bottom Section" value={totals.bottomTotal} />
            <TotalRow label="Grand Total" value={totals.grandTotal} className="grand-total-row" />

            <tr className="score-spacer" aria-hidden="true"><td colSpan="2" /></tr>

            <TotalRow label="Total Bonuses Earned" value={totals.totalBonuses} className="bonuses-total-row" />
          </tbody>
        </table>
      </div>

      {gameComplete && (
        <div className="game-complete" role="status">
          <div>
            <strong>Scorecard complete</strong>
            <span>Final score: {totals.grandTotal}</span>
          </div>
          <button type="button" className="new-game-button" onClick={onNewGame}>New Game</button>
        </div>
      )}
    </section>
  )
}

export default function DiceRoller({
  faceRoller = randomFace,
  highScoreStatus = null,
  initialGameId,
  initialState,
  onGameComplete,
  onGameStateChange,
  onNewGame,
  theme = 'classic',
} = {}) {
  const [state, dispatch] = useReducer(gameReducer, initialState, createInitialGameState)
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
      onGameComplete({ gameId: gameIdRef.current, score: totals.grandTotal })
    }
  }, [gameComplete, onGameComplete, totals.grandTotal])

  function handleRoll() {
    if (rollDisabled) return

    dispatch({
      type: GAME_ACTIONS.roll,
      dice: rollUnheldDice(dice, heldDice, faceRoller),
    })
  }

  function handleToggleHold(index) {
    dispatch({ type: GAME_ACTIONS.toggleHold, index })
  }

  function handleScore(category) {
    dispatch({ type: GAME_ACTIONS.score, category })
  }

  function handleNewGame() {
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
                  <img src={diceSet.faces[value - 1]} alt="" width="64" height="64" draggable="false" />
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
          <button type="button" className="roll-button" onClick={handleRoll} disabled={rollDisabled}>
            {rollButtonLabel}
          </button>
          <div className="sum">Sum <strong>{sum ?? '—'}</strong></div>
          {gameComplete && (
            <button type="button" className="new-game-button top-new-game-button" onClick={handleNewGame}>
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
    </main>
  )
}
