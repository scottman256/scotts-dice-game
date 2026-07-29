import { CATEGORY_COUNT, evaluateCategory, getTotals } from './gameRules'

export const DICE_COUNT = 5
export const NORMAL_ROLL_LIMIT = 3
export const EXTRA_ROLL_LIMIT = 3
export const SPECTACULAR_SCORE_THRESHOLD = 500

export const GAME_ACTIONS = Object.freeze({
  roll: 'ROLL',
  toggleHold: 'TOGGLE_HOLD',
  score: 'SCORE',
  newGame: 'NEW_GAME',
})

export const CASH_OUT_CELEBRATIONS = Object.freeze({
  largeStraight: {
    tone: 'celebration',
    message: 'Fantastic! You landed a Large Straight!',
  },
  fiveKind: {
    tone: 'celebration',
    message: 'Amazing! Five of a Kind — what an outstanding roll!',
  },
  fiveKindBonus: {
    tone: 'celebration',
    message: 'Incredible! Another Five of a Kind earns the huge bonus!',
  },
  firstRollFiveKind: {
    tone: 'legendary',
    message: 'UNBELIEVABLE! FIVE OF A KIND ON THE FIRST ROLL! Absolutely legendary!',
  },
})

function createEmptyDice() {
  return Array(DICE_COUNT).fill(null)
}

function createEmptyHolds() {
  return Array(DICE_COUNT).fill(false)
}

export function createInitialGameState(overrides = {}) {
  return {
    dice: [...(overrides.dice ?? createEmptyDice())],
    heldDice: [...(overrides.heldDice ?? createEmptyHolds())],
    rollCount: overrides.rollCount ?? 0,
    scores: { ...(overrides.scores ?? {}) },
    extraRollsUsed: overrides.extraRollsUsed ?? 0,
    status: overrides.status ?? 'Roll all five dice to begin.',
    statusTone: overrides.statusTone ?? 'normal',
  }
}

export function hasSavedScore(scores, categoryId) {
  return Object.prototype.hasOwnProperty.call(scores, categoryId)
}

export function getGameViewState(state) {
  const gameComplete = Object.keys(state.scores).length === CATEGORY_COUNT
  const totals = getTotals(state.scores)
  const hasSpectacularScore = gameComplete
    && totals.grandTotal > SPECTACULAR_SCORE_THRESHOLD
  const hasRolled = state.rollCount > 0
  const sum = hasRolled
    ? state.dice.reduce((total, value) => total + value, 0)
    : null
  const extraRollsRemaining = EXTRA_ROLL_LIMIT - state.extraRollsUsed
  const fourthRollAvailable = state.rollCount === NORMAL_ROLL_LIMIT
    && extraRollsRemaining > 0
  const rollDisabled = gameComplete
    || state.rollCount > NORMAL_ROLL_LIMIT
    || (state.rollCount === NORMAL_ROLL_LIMIT && extraRollsRemaining === 0)
  const canToggleHolds = hasRolled && !rollDisabled

  let rollButtonLabel = 'Roll Dice'
  if (state.rollCount === 1) rollButtonLabel = 'Roll Again (2 left)'
  if (state.rollCount === 2) rollButtonLabel = 'Roll Again (1 left)'
  if (fourthRollAvailable) rollButtonLabel = `Use 4th Roll (${extraRollsRemaining} left)`
  if (rollDisabled && !gameComplete) rollButtonLabel = 'Cash In a Score'
  if (gameComplete) rollButtonLabel = 'Game Complete'

  return {
    gameComplete,
    totals,
    hasSpectacularScore,
    hasRolled,
    sum,
    extraRollsRemaining,
    fourthRollAvailable,
    rollDisabled,
    canToggleHolds,
    heldCount: state.heldDice.filter(Boolean).length,
    rollButtonLabel,
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case GAME_ACTIONS.roll: {
      const { rollDisabled, extraRollsRemaining } = getGameViewState(state)
      if (rollDisabled) return state

      const usesExtraRoll = state.rollCount === NORMAL_ROLL_LIMIT
      const nextRollCount = state.rollCount + 1
      let status

      if (usesExtraRoll) {
        status = 'Fourth roll used. Choose a category to cash in this turn.'
      } else if (nextRollCount === NORMAL_ROLL_LIMIT) {
        status = extraRollsRemaining > 0
          ? 'Roll 3 of 3. Hold any dice you want to keep, cash in, or spend one fourth-roll chance.'
          : 'Roll 3 of 3. Choose a category to cash in this turn.'
      } else {
        status = `Roll ${nextRollCount} of 3. Hold dice, roll again, or cash in a qualifying score.`
      }

      return {
        ...state,
        dice: [...action.dice],
        rollCount: nextRollCount,
        extraRollsUsed: state.extraRollsUsed + (usesExtraRoll ? 1 : 0),
        status,
        statusTone: 'normal',
      }
    }

    case GAME_ACTIONS.toggleHold: {
      const { canToggleHolds } = getGameViewState(state)
      if (!canToggleHolds || !state.dice[action.index]) return state

      return {
        ...state,
        heldDice: state.heldDice.map((isHeld, index) => (
          index === action.index ? !isHeld : isHeld
        )),
      }
    }

    case GAME_ACTIONS.score: {
      const category = action.category
      const { gameComplete } = getGameViewState(state)
      if (
        gameComplete
        || state.rollCount === 0
        || !category
        || hasSavedScore(state.scores, category.id)
      ) {
        return state
      }

      const result = evaluateCategory(category.id, state.dice, {
        rollCount: state.rollCount,
        scores: state.scores,
      })
      const canScratch = state.rollCount >= NORMAL_ROLL_LIMIT && !result.qualifies
      if (!result.qualifies && !canScratch) return state

      const points = result.qualifies ? result.points : 0
      const nextScores = { ...state.scores, [category.id]: points }
      const isComplete = Object.keys(nextScores).length === CATEGORY_COUNT
      const celebration = result.qualifies ? CASH_OUT_CELEBRATIONS[category.id] : null
      const cashOutSummary = `${category.label} scored ${points} point${points === 1 ? '' : 's'}.`
      const nextStep = isComplete
        ? ' The scorecard is complete!'
        : ' Roll to start the next turn.'

      return {
        ...state,
        dice: createEmptyDice(),
        heldDice: createEmptyHolds(),
        rollCount: 0,
        scores: nextScores,
        status: `${celebration ? `${celebration.message} ` : ''}${cashOutSummary}${nextStep}`,
        statusTone: celebration?.tone ?? 'normal',
      }
    }

    case GAME_ACTIONS.newGame:
      return createInitialGameState({
        status: 'New game ready. Roll all five dice to begin.',
      })

    default:
      return state
  }
}
