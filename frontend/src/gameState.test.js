import { describe, expect, it } from '@jest/globals'
import { ALL_CATEGORIES } from './gameRules'
import {
  CASH_OUT_CELEBRATIONS,
  DICE_COUNT,
  EXTRA_ROLL_LIMIT,
  GAME_ACTIONS,
  NORMAL_ROLL_LIMIT,
  SPECTACULAR_SCORE_THRESHOLD,
  createInitialGameState,
  gameReducer,
  getGameViewState,
  hasGameProgress,
  hasSavedScore,
} from './gameState'

function category(categoryId) {
  return ALL_CATEGORIES.find(({ id }) => id === categoryId)
}

function completedScores(value = 0) {
  return Object.fromEntries(ALL_CATEGORIES.map(({ id }) => [id, value]))
}

function reduce(overrides, action) {
  return gameReducer(createInitialGameState(overrides), action)
}

describe('game-state constants', () => {
  it('exposes the configured game limits and celebration threshold', () => {
    expect(DICE_COUNT).toBe(5)
    expect(NORMAL_ROLL_LIMIT).toBe(3)
    expect(EXTRA_ROLL_LIMIT).toBe(3)
    expect(SPECTACULAR_SCORE_THRESHOLD).toBe(500)
    expect(GAME_ACTIONS).toEqual({
      roll: 'ROLL',
      toggleHold: 'TOGGLE_HOLD',
      score: 'SCORE',
      newGame: 'NEW_GAME',
    })
  })
})

describe('createInitialGameState', () => {
  it('creates a fresh game with independent arrays and score objects', () => {
    const first = createInitialGameState()
    const second = createInitialGameState()

    expect(first).toEqual({
      dice: [null, null, null, null, null],
      heldDice: [false, false, false, false, false],
      rollCount: 0,
      scores: {},
      extraRollsUsed: 0,
      status: 'Roll all five dice to begin.',
      statusTone: 'normal',
    })
    expect(first.dice).not.toBe(second.dice)
    expect(first.heldDice).not.toBe(second.heldDice)
    expect(first.scores).not.toBe(second.scores)
  })

  it('applies overrides while defensively copying mutable values', () => {
    const dice = [1, 2, 3, 4, 5]
    const heldDice = [true, false, true, false, true]
    const scores = { ones: 1 }
    const state = createInitialGameState({
      dice,
      heldDice,
      scores,
      rollCount: 2,
      extraRollsUsed: 1,
      status: 'Custom status',
      statusTone: 'celebration',
    })

    expect(state).toEqual({
      dice,
      heldDice,
      scores,
      rollCount: 2,
      extraRollsUsed: 1,
      status: 'Custom status',
      statusTone: 'celebration',
    })
    expect(state.dice).not.toBe(dice)
    expect(state.heldDice).not.toBe(heldDice)
    expect(state.scores).not.toBe(scores)
  })
})

describe('hasSavedScore', () => {
  it('treats a saved zero as filled and ignores inherited properties', () => {
    const scores = Object.create({ ones: 5 })
    scores.twos = 0

    expect(hasSavedScore(scores, 'twos')).toBe(true)
    expect(hasSavedScore(scores, 'ones')).toBe(false)
    expect(hasSavedScore(scores, 'threes')).toBe(false)
  })
})

describe('hasGameProgress', () => {
  it('only marks games with a roll or a saved category as resumable', () => {
    expect(hasGameProgress(createInitialGameState())).toBe(false)
    expect(hasGameProgress(createInitialGameState({ rollCount: 1 }))).toBe(true)
    expect(hasGameProgress(createInitialGameState({ scores: { ones: 0 } }))).toBe(true)
  })
})

describe('getGameViewState', () => {
  it('derives a fresh turn view', () => {
    expect(getGameViewState(createInitialGameState())).toMatchObject({
      gameComplete: false,
      hasSpectacularScore: false,
      hasRolled: false,
      sum: null,
      extraRollsRemaining: 3,
      fourthRollAvailable: false,
      rollDisabled: false,
      canToggleHolds: false,
      heldCount: 0,
      rollButtonLabel: 'Roll Dice',
      totals: { grandTotal: 0 },
    })
  })

  it.each([
    [1, 0, 'Roll Again (2 left)', false, false],
    [2, 0, 'Roll Again (1 left)', false, false],
    [3, 0, 'Use 4th Roll (3 left)', true, false],
    [3, 1, 'Use 4th Roll (2 left)', true, false],
    [3, 3, 'Cash In a Score', false, true],
    [4, 1, 'Cash In a Score', false, true],
  ])(
    'derives roll controls for roll %s with %s extras used',
    (rollCount, extraRollsUsed, rollButtonLabel, fourthRollAvailable, rollDisabled) => {
      const view = getGameViewState(createInitialGameState({
        dice: [1, 2, 3, 4, 5],
        heldDice: [true, false, true, false, false],
        rollCount,
        extraRollsUsed,
      }))

      expect(view).toMatchObject({
        hasRolled: true,
        sum: 15,
        extraRollsRemaining: 3 - extraRollsUsed,
        fourthRollAvailable,
        rollDisabled,
        canToggleHolds: !rollDisabled,
        heldCount: 2,
        rollButtonLabel,
      })
    },
  )

  it('requires every category to be filled before the game is complete', () => {
    const scores = completedScores()
    delete scores.ones

    expect(getGameViewState(createInitialGameState({ scores })).gameComplete).toBe(false)
    expect(getGameViewState(createInitialGameState({
      scores: { ...scores, ones: 0 },
    }))).toMatchObject({
      gameComplete: true,
      rollDisabled: true,
      canToggleHolds: false,
      rollButtonLabel: 'Game Complete',
    })
  })

  it('uses a strict over-500 threshold for the spectacular treatment', () => {
    const exactThreshold = completedScores()
    exactThreshold.any = 435
    const aboveThreshold = { ...exactThreshold, any: 436 }

    expect(getGameViewState(createInitialGameState({ scores: exactThreshold }))).toMatchObject({
      gameComplete: true,
      hasSpectacularScore: false,
      totals: { grandTotal: 500 },
    })
    expect(getGameViewState(createInitialGameState({ scores: aboveThreshold }))).toMatchObject({
      gameComplete: true,
      hasSpectacularScore: true,
      totals: { grandTotal: 501 },
    })
  })
})

describe('gameReducer roll actions', () => {
  const dice = [1, 2, 3, 4, 5]

  it('records a normal roll while preserving holds, scores, and extra usage', () => {
    const initial = createInitialGameState({
      heldDice: [true, false, false, false, false],
      scores: { ones: 1 },
      extraRollsUsed: 1,
      statusTone: 'legendary',
    })
    const next = gameReducer(initial, { type: GAME_ACTIONS.roll, dice })

    expect(next).toEqual({
      ...initial,
      dice,
      rollCount: 1,
      status: 'Roll 1 of 3. Hold dice, roll again, or cash in a qualifying score.',
      statusTone: 'normal',
    })
    expect(next).not.toBe(initial)
    expect(next.dice).not.toBe(dice)
    expect(initial.dice).toEqual([null, null, null, null, null])
  })

  it('uses the standard guidance after roll two', () => {
    const next = reduce({ rollCount: 1 }, { type: GAME_ACTIONS.roll, dice })

    expect(next.rollCount).toBe(2)
    expect(next.status).toBe(
      'Roll 2 of 3. Hold dice, roll again, or cash in a qualifying score.',
    )
  })

  it('offers a fourth-roll chance after roll three when one remains', () => {
    const next = reduce(
      { rollCount: 2, extraRollsUsed: 2 },
      { type: GAME_ACTIONS.roll, dice },
    )

    expect(next.rollCount).toBe(3)
    expect(next.extraRollsUsed).toBe(2)
    expect(next.status).toBe(
      'Roll 3 of 3. Hold any dice you want to keep, cash in, or spend one fourth-roll chance.',
    )
  })

  it('requires cashing in after roll three when all extras are gone', () => {
    const next = reduce(
      { rollCount: 2, extraRollsUsed: 3 },
      { type: GAME_ACTIONS.roll, dice },
    )

    expect(next.rollCount).toBe(3)
    expect(next.status).toBe('Roll 3 of 3. Choose a category to cash in this turn.')
    expect(getGameViewState(next).rollDisabled).toBe(true)
  })

  it('consumes exactly one chance for the fourth roll', () => {
    const next = reduce(
      { rollCount: 3, extraRollsUsed: 1 },
      { type: GAME_ACTIONS.roll, dice },
    )

    expect(next).toMatchObject({
      rollCount: 4,
      extraRollsUsed: 2,
      status: 'Fourth roll used. Choose a category to cash in this turn.',
      statusTone: 'normal',
    })
    expect(getGameViewState(next).rollDisabled).toBe(true)
  })

  it.each([
    [{ rollCount: 3, extraRollsUsed: 3 }, 'no fourth-roll chances remain'],
    [{ rollCount: 4, extraRollsUsed: 1 }, 'the fourth roll was already used'],
    [{ scores: completedScores() }, 'the game is complete'],
  ])('returns the same state when rolling is blocked because %s', (overrides) => {
    const initial = createInitialGameState(overrides)

    expect(gameReducer(initial, { type: GAME_ACTIONS.roll, dice })).toBe(initial)
  })
})

describe('gameReducer hold actions', () => {
  it('toggles one die without changing the other holds', () => {
    const initial = createInitialGameState({
      dice: [1, 2, 3, 4, 5],
      heldDice: [false, true, false, false, false],
      rollCount: 1,
    })
    const held = gameReducer(initial, { type: GAME_ACTIONS.toggleHold, index: 0 })
    const released = gameReducer(held, { type: GAME_ACTIONS.toggleHold, index: 0 })

    expect(held.heldDice).toEqual([true, true, false, false, false])
    expect(released.heldDice).toEqual(initial.heldDice)
    expect(held.heldDice).not.toBe(initial.heldDice)
    expect(initial.heldDice).toEqual([false, true, false, false, false])
  })

  it('allows holds after roll three if a fourth roll remains', () => {
    const initial = createInitialGameState({
      dice: [1, 2, 3, 4, 5],
      rollCount: 3,
      extraRollsUsed: 2,
    })

    expect(gameReducer(initial, { type: GAME_ACTIONS.toggleHold, index: 4 }).heldDice)
      .toEqual([false, false, false, false, true])
  })

  it.each([
    [{ dice: [1, 2, 3, 4, 5], rollCount: 0 }, 0],
    [{ dice: [null, 2, 3, 4, 5], rollCount: 1 }, 0],
    [{ dice: [1, 2, 3, 4, 5], rollCount: 4 }, 0],
    [{ dice: [1, 2, 3, 4, 5], rollCount: 3, extraRollsUsed: 3 }, 0],
  ])('ignores a hold action when the die cannot be toggled', (overrides, index) => {
    const initial = createInitialGameState(overrides)

    expect(gameReducer(initial, { type: GAME_ACTIONS.toggleHold, index })).toBe(initial)
  })
})

describe('gameReducer score actions', () => {
  it('cashes in a qualifying category and starts a clean turn', () => {
    const initial = createInitialGameState({
      dice: [1, 1, 2, 3, 4],
      heldDice: [true, true, false, false, false],
      rollCount: 1,
      scores: { twos: 2 },
      extraRollsUsed: 1,
    })
    const next = gameReducer(initial, {
      type: GAME_ACTIONS.score,
      category: category('ones'),
    })

    expect(next).toEqual({
      dice: [null, null, null, null, null],
      heldDice: [false, false, false, false, false],
      rollCount: 0,
      scores: { twos: 2, ones: 2 },
      extraRollsUsed: 1,
      status: 'Ones scored 2 points. Roll to start the next turn.',
      statusTone: 'normal',
    })
    expect(initial.scores).toEqual({ twos: 2 })
    expect(initial.dice).toEqual([1, 1, 2, 3, 4])
  })

  it('uses singular grammar for a one-point cash out', () => {
    const next = reduce(
      { dice: [1, 2, 3, 4, 5], rollCount: 1 },
      { type: GAME_ACTIONS.score, category: category('ones') },
    )

    expect(next.status).toBe('Ones scored 1 point. Roll to start the next turn.')
  })

  it('records zero for an unqualified category on roll three', () => {
    const next = reduce(
      {
        dice: [2, 2, 2, 2, 2],
        heldDice: [true, true, true, true, true],
        rollCount: 3,
      },
      { type: GAME_ACTIONS.score, category: category('largeStraight') },
    )

    expect(next.scores).toEqual({ largeStraight: 0 })
    expect(next.dice).toEqual([null, null, null, null, null])
    expect(next.heldDice).toEqual([false, false, false, false, false])
    expect(next.status).toBe('Large Straight scored 0 points. Roll to start the next turn.')
    expect(next.statusTone).toBe('normal')
  })

  it('also allows a scratch after a fourth roll', () => {
    const next = reduce(
      { dice: [1, 1, 1, 2, 2], rollCount: 4, extraRollsUsed: 1 },
      { type: GAME_ACTIONS.score, category: category('largeStraight') },
    )

    expect(next.scores.largeStraight).toBe(0)
    expect(next.extraRollsUsed).toBe(1)
  })

  it.each([
    {
      categoryId: 'largeStraight',
      dice: [1, 2, 3, 4, 5],
      rollCount: 2,
      scores: {},
      points: 50,
    },
    {
      categoryId: 'fiveKind',
      dice: [6, 6, 6, 6, 6],
      rollCount: 2,
      scores: {},
      points: 75,
    },
    {
      categoryId: 'fiveKindBonus',
      dice: [4, 4, 4, 4, 4],
      rollCount: 2,
      scores: { fiveKind: 75 },
      points: 150,
    },
    {
      categoryId: 'firstRollFiveKind',
      dice: [3, 3, 3, 3, 3],
      rollCount: 1,
      scores: {},
      points: 250,
    },
  ])('adds the configured praise after scoring $categoryId', ({
    categoryId,
    dice,
    rollCount,
    scores,
    points,
  }) => {
    const next = reduce(
      { dice, rollCount, scores },
      { type: GAME_ACTIONS.score, category: category(categoryId) },
    )
    const celebration = CASH_OUT_CELEBRATIONS[categoryId]

    expect(next.scores[categoryId]).toBe(points)
    expect(next.statusTone).toBe(celebration.tone)
    expect(next.status.startsWith(celebration.message)).toBe(true)
  })

  it('passes saved scores into category evaluation for the 5 of a Kind bonus', () => {
    const dice = [5, 5, 5, 5, 5]
    const withoutOriginal = createInitialGameState({ dice, rollCount: 2 })
    const withOriginal = createInitialGameState({
      dice,
      rollCount: 2,
      scores: { fiveKind: 75 },
    })
    const action = { type: GAME_ACTIONS.score, category: category('fiveKindBonus') }

    expect(gameReducer(withoutOriginal, action)).toBe(withoutOriginal)
    expect(gameReducer(withOriginal, action).scores.fiveKindBonus).toBe(150)
  })

  it('marks the game complete when the last category is saved', () => {
    const scores = completedScores()
    delete scores.any
    const next = reduce(
      { dice: [1, 2, 3, 4, 5], rollCount: 1, scores },
      { type: GAME_ACTIONS.score, category: category('any') },
    )

    expect(Object.keys(next.scores)).toHaveLength(ALL_CATEGORIES.length)
    expect(next.scores.any).toBe(15)
    expect(next.status).toBe('Any scored 15 points. The scorecard is complete!')
    expect(getGameViewState(next).gameComplete).toBe(true)
  })

  it.each([
    [{ dice: [1, 2, 3, 4, 5], rollCount: 0 }, category('any'), 'the turn has not started'],
    [{ dice: [1, 2, 3, 4, 5], rollCount: 1 }, undefined, 'the category is missing'],
    [{ dice: [1, 1, 2, 3, 4], rollCount: 1, scores: { ones: 0 } }, category('ones'), 'the category is already saved'],
    [{ dice: [2, 2, 2, 2, 2], rollCount: 2 }, category('largeStraight'), 'the roll is unqualified before roll three'],
    [{ dice: [1, 2, 3, 4, 5], rollCount: 1, scores: completedScores() }, category('any'), 'the game is complete'],
  ])('ignores a score action when %s', (overrides, scoreCategory) => {
    const initial = createInitialGameState(overrides)

    expect(gameReducer(initial, {
      type: GAME_ACTIONS.score,
      category: scoreCategory,
    })).toBe(initial)
  })
})

describe('gameReducer reset and fallback actions', () => {
  it('starts a fully clean new game', () => {
    const initial = createInitialGameState({
      dice: [6, 6, 6, 6, 6],
      heldDice: [true, true, true, true, true],
      rollCount: 4,
      scores: completedScores(25),
      extraRollsUsed: 3,
      status: 'Finished',
      statusTone: 'legendary',
    })

    expect(gameReducer(initial, { type: GAME_ACTIONS.newGame })).toEqual({
      dice: [null, null, null, null, null],
      heldDice: [false, false, false, false, false],
      rollCount: 0,
      scores: {},
      extraRollsUsed: 0,
      status: 'New game ready. Roll all five dice to begin.',
      statusTone: 'normal',
    })
  })

  it('returns the same state for an unknown action', () => {
    const initial = createInitialGameState()

    expect(gameReducer(initial, { type: 'UNKNOWN' })).toBe(initial)
  })
})
