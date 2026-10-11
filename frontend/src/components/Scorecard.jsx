import React, { useId } from 'react'
import {
  BOTTOM_CATEGORIES,
  CATEGORY_COUNT,
  TOP_CATEGORIES,
  TOP_BONUS_POINTS,
  TOP_BONUS_THRESHOLD,
  TOP_EXTRA_BONUS_POINTS,
  TOP_EXTRA_BONUS_THRESHOLD,
  getTotals,
} from '../gameRules'
import { getCategoryScoreAvailability, hasSavedScore } from '../gameState'

function ScoreRow({ category, dice, rollCount, scores, gameComplete, onScore }) {
  const {
    saved,
    result,
    scratchBlockedByBonus,
    canScratch,
    canScore,
    preview,
  } = getCategoryScoreAvailability(category, {
    dice,
    rollCount,
    scores,
    gameComplete,
  })

  let scoreActionLabel = `Roll a qualifying combination for ${category.label}`
  if (result.qualifies) {
    scoreActionLabel = `Score ${result.points} points in ${category.label}`
  } else if (canScratch) {
    scoreActionLabel = `Record zero points in ${category.label}`
  } else if (scratchBlockedByBonus) {
    scoreActionLabel = 'Scratch the 5 of a Kind Bonus first'
  }

  return (
    <tr className={[
      result.qualifies && !saved ? 'qualifying-row' : '',
      scratchBlockedByBonus ? 'scratch-blocked-row' : '',
    ].filter(Boolean).join(' ') || undefined}>
      <td>
        <span className="category-name">{category.label}</span>
        <small>
          {scratchBlockedByBonus
            ? 'Scratch the 5 of a Kind Bonus first'
            : category.description}
        </small>
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

function ScoreSection({
  id,
  helpId,
  index,
  eyebrow,
  title,
  filledCount,
  categories,
  children,
  ...scoreRowProps
}) {
  const titleId = useId()

  return (
    <section className={`score-section-panel ${id}-section-panel`} aria-labelledby={titleId}>
      <div className="score-section-heading">
        <div className="score-section-title">
          <span className="score-section-index" aria-hidden="true">{index}</span>
          <div>
            <small>{eyebrow}</small>
            <h3 id={titleId}>{title}</h3>
          </div>
        </div>
        <span className="section-progress">{filledCount}/{categories.length} filled</span>
      </div>

      <table aria-label={`${title} scoring categories`} aria-describedby={helpId}>
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
          {categories.map((category) => (
            <ScoreRow
              key={category.id}
              category={category}
              {...scoreRowProps}
            />
          ))}
          {children}
        </tbody>
      </table>
    </section>
  )
}

export default function Scorecard({ dice = [], rollCount = 0, scores, gameComplete, onScore, onNewGame, readOnly = false }) {
  const titleId = useId()
  const helpId = useId()
  const summaryTitleId = useId()
  const totals = getTotals(scores)
  const scoredCount = Object.keys(scores).length
  const topFilledCount = TOP_CATEGORIES.filter(({ id }) => hasSavedScore(scores, id)).length
  const bottomFilledCount = BOTTOM_CATEGORIES.filter(({ id }) => hasSavedScore(scores, id)).length

  return (
    <section className="scorecard" aria-labelledby={titleId}>
      <div className="scorecard-heading">
        <div>
          <p className="eyebrow">Game score</p>
          <h2 id={titleId}>Scorecard</h2>
        </div>
        <span className="score-progress">{scoredCount}/{CATEGORY_COUNT} filled</span>
      </div>

      <p className="score-help" id={helpId}>
        {readOnly
          ? 'Completed game. All scores are final and cannot be changed.'
          : 'Gold dollar buttons can be scored now. After roll three, gray dollar buttons may be used to record a zero.'}
      </p>

      <div
        className="scorecard-body"
        role="group"
        aria-label="Dice game scoring categories and saved scores"
      >
        <div className="score-sections-grid">
          <ScoreSection
            id="top"
            helpId={helpId}
            index="01"
            eyebrow="Number combinations"
            title="Top Section"
            filledCount={topFilledCount}
            categories={TOP_CATEGORIES}
            dice={dice}
            rollCount={rollCount}
            scores={scores}
            gameComplete={gameComplete || readOnly}
            onScore={onScore}
          >
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
          </ScoreSection>

          <ScoreSection
            id="bottom"
            helpId={helpId}
            index="02"
            eyebrow="Dice combinations"
            title="Bottom Section"
            filledCount={bottomFilledCount}
            categories={BOTTOM_CATEGORIES}
            dice={dice}
            rollCount={rollCount}
            scores={scores}
            gameComplete={gameComplete || readOnly}
            onScore={onScore}
          />
        </div>

        <section className="score-summary-panel" aria-labelledby={summaryTitleId}>
          <div className="score-summary-heading">
            <div>
              <span aria-hidden="true">Σ</span>
              <div>
                <small>Score overview</small>
                <h3 id={summaryTitleId}>Game Totals</h3>
              </div>
            </div>
            <span>{readOnly ? 'Final totals' : 'Updates as categories are filled'}</span>
          </div>
          <table className="score-summary-table" aria-label="Score totals">
            <colgroup>
              <col />
              <col className="score-column" />
            </colgroup>
            <tbody>
              <TotalRow label="Total of Top Section" value={totals.topTotal} />
              <TotalRow label="Total of Bottom Section" value={totals.bottomTotal} />
              <TotalRow label="Grand Total" value={totals.grandTotal} className="grand-total-row" />
              <TotalRow label="Total Bonuses Earned" value={totals.totalBonuses} className="bonuses-total-row" />
            </tbody>
          </table>
        </section>
      </div>

      {gameComplete && (
        <div className="game-complete" role="status">
          <div>
            <strong>Scorecard complete</strong>
            <span>Final score: {totals.grandTotal}</span>
          </div>
          {!readOnly && <button type="button" className="new-game-button" onClick={onNewGame}>New Game</button>}
        </div>
      )}
    </section>
  )
}

