import { describe, expect, it } from '@jest/globals'
import {
  ALL_CATEGORIES,
  BOTTOM_CATEGORIES,
  CATEGORY_COUNT,
  TOP_BONUS_POINTS,
  TOP_BONUS_THRESHOLD,
  TOP_CATEGORIES,
  TOP_EXTRA_BONUS_POINTS,
  TOP_EXTRA_BONUS_THRESHOLD,
  evaluateCategory,
  getTotals,
} from './gameRules'

describe('category definitions', () => {
  it('defines the expected top and bottom scorecard order with unique identifiers', () => {
    expect(TOP_CATEGORIES.map(({ id }) => id)).toEqual([
      'ones',
      'twos',
      'threes',
      'fours',
      'fives',
      'sixes',
      'any',
      'allEven',
      'allOdd',
    ])
    expect(BOTTOM_CATEGORIES.map(({ id }) => id)).toEqual([
      'twoPair',
      'threeKind',
      'fourKind',
      'fullHouse',
      'miniStraight',
      'smallStraight',
      'largeStraight',
      'fiveKind',
      'fiveKindBonus',
      'firstRollFiveKind',
    ])
    expect(ALL_CATEGORIES).toEqual([...TOP_CATEGORIES, ...BOTTOM_CATEGORIES])
    expect(new Set(ALL_CATEGORIES.map(({ id }) => id))).toHaveProperty(
      'size',
      ALL_CATEGORIES.length,
    )
    expect(CATEGORY_COUNT).toBe(19)
  })

  it('exports the configured top-section bonus rules', () => {
    expect(TOP_BONUS_THRESHOLD).toBe(100)
    expect(TOP_BONUS_POINTS).toBe(40)
    expect(TOP_EXTRA_BONUS_THRESHOLD).toBe(125)
    expect(TOP_EXTRA_BONUS_POINTS).toBe(25)
  })
})

describe('evaluateCategory', () => {
  it.each([
    { dice: [] },
    { dice: [1, 2, 3, 4] },
    { dice: [1, 2, 3, 4, null] },
    { dice: [1, 2, 3, 4, 0] },
    { dice: [1, 2, 3, 4, 7] },
    { dice: [1, 2, 3, 4, 2.5] },
    { dice: [1, 2, 3, 4, '5'] },
  ])('rejects an incomplete or invalid roll: $dice', ({ dice }) => {
    expect(evaluateCategory('any', dice)).toEqual({ qualifies: false, points: 0 })
  })

  it.each([
    ['ones', [1, 1, 2, 3, 4], 2],
    ['twos', [2, 2, 2, 1, 6], 6],
    ['threes', [3, 3, 1, 2, 6], 6],
    ['fours', [4, 4, 4, 4, 1], 16],
    ['fives', [5, 1, 2, 3, 4], 5],
    ['sixes', [6, 6, 6, 6, 6], 30],
  ])('%s scores only dice matching its face', (categoryId, dice, points) => {
    expect(evaluateCategory(categoryId, dice)).toEqual({ qualifies: true, points })
  })

  it.each(['ones', 'twos', 'threes', 'fours', 'fives'])('%s fails when no matching die exists', (categoryId) => {
    expect(evaluateCategory(categoryId, [6, 6, 6, 6, 6])).toEqual({
      qualifies: false,
      points: 0,
    })
  })

  it('scores Any as the sum of every die', () => {
    expect(evaluateCategory('any', [1, 2, 3, 4, 6])).toEqual({
      qualifies: true,
      points: 16,
    })
  })

  describe.each([
    ['allEven', [2, 4, 6, 2, 4], [2, 4, 6, 2, 3], 18, 17],
    ['allOdd', [1, 3, 5, 1, 3], [1, 3, 5, 1, 2], 13, 12],
  ])('%s', (categoryId, qualifyingDice, failingDice, qualifyingTotal, failingTotal) => {
    it('qualifies and sums the dice when every die has the required parity', () => {
      expect(evaluateCategory(categoryId, qualifyingDice)).toEqual({
        qualifies: true,
        points: qualifyingTotal,
      })
    })

    it('does not qualify when one die has the opposite parity', () => {
      expect(evaluateCategory(categoryId, failingDice)).toEqual({
        qualifies: false,
        points: failingTotal,
      })
    })
  })

  describe('matching groups', () => {
    it.each([
      [[1, 1, 2, 2, 6], true, 12],
      [[2, 2, 3, 3, 3], true, 13],
      [[1, 1, 2, 3, 4], false, 11],
      [[5, 5, 5, 5, 2], false, 22],
    ])('evaluates 2 Pair for %j', (dice, qualifies, points) => {
      expect(evaluateCategory('twoPair', dice)).toEqual({ qualifies, points })
    })

    it.each([
      [[4, 4, 4, 1, 2], true],
      [[2, 2, 3, 3, 3], true],
      [[6, 6, 6, 6, 6], true],
      [[4, 4, 1, 2, 3], false],
    ])('evaluates 3 of a Kind for %j', (dice, qualifies) => {
      expect(evaluateCategory('threeKind', dice)).toEqual({
        qualifies,
        points: dice.reduce((total, die) => total + die, 0),
      })
    })

    it.each([
      [[4, 4, 4, 4, 2], true],
      [[1, 1, 1, 1, 1], true],
      [[3, 3, 3, 2, 2], false],
    ])('evaluates 4 of a Kind for %j', (dice, qualifies) => {
      expect(evaluateCategory('fourKind', dice)).toEqual({
        qualifies,
        points: dice.reduce((total, die) => total + die, 0),
      })
    })

    it.each([
      [[2, 3, 2, 3, 3], true],
      [[6, 6, 6, 1, 1], true],
      [[4, 4, 4, 4, 2], false],
      [[1, 1, 2, 2, 3], false],
    ])('evaluates Full House for %j', (dice, qualifies) => {
      expect(evaluateCategory('fullHouse', dice)).toEqual({ qualifies, points: 30 })
    })
  })

  describe('straights', () => {
    it.each([
      ['miniStraight', [1, 2, 3, 3, 6], true, 25],
      ['miniStraight', [1, 2, 4, 5, 5], false, 25],
      ['smallStraight', [1, 2, 3, 4, 4], true, 35],
      ['smallStraight', [2, 3, 4, 5, 6], true, 35],
      ['smallStraight', [1, 2, 3, 5, 6], false, 35],
      ['largeStraight', [1, 2, 3, 4, 5], true, 50],
      ['largeStraight', [6, 5, 4, 3, 2], true, 50],
      ['largeStraight', [1, 2, 3, 4, 4], false, 50],
    ])('evaluates %s for %j', (categoryId, dice, qualifies, points) => {
      expect(evaluateCategory(categoryId, dice)).toEqual({ qualifies, points })
    })
  })

  describe('5 of a Kind categories', () => {
    it('scores a standard 5 of a Kind', () => {
      expect(evaluateCategory('fiveKind', [5, 5, 5, 5, 5])).toEqual({
        qualifies: true,
        points: 75,
      })
      expect(evaluateCategory('fiveKind', [5, 5, 5, 5, 4])).toEqual({
        qualifies: false,
        points: 75,
      })
    })

    it('requires the original 75-point score before awarding the bonus', () => {
      const dice = [3, 3, 3, 3, 3]

      expect(evaluateCategory('fiveKindBonus', dice)).toEqual({
        qualifies: false,
        points: 150,
      })
      expect(evaluateCategory('fiveKindBonus', dice, { scores: { fiveKind: 0 } })).toEqual({
        qualifies: false,
        points: 150,
      })
      expect(evaluateCategory('fiveKindBonus', dice, { scores: { fiveKind: 75 } })).toEqual({
        qualifies: true,
        points: 150,
      })
      expect(evaluateCategory(
        'fiveKindBonus',
        [3, 3, 3, 3, 2],
        { scores: { fiveKind: 75 } },
      )).toEqual({ qualifies: false, points: 150 })
    })

    it('awards the first-roll category only on exactly roll one', () => {
      const dice = [2, 2, 2, 2, 2]

      expect(evaluateCategory('firstRollFiveKind', dice, { rollCount: 1 })).toEqual({
        qualifies: true,
        points: 250,
      })
      expect(evaluateCategory('firstRollFiveKind', dice)).toEqual({
        qualifies: false,
        points: 250,
      })
      expect(evaluateCategory('firstRollFiveKind', dice, { rollCount: 2 })).toEqual({
        qualifies: false,
        points: 250,
      })
      expect(evaluateCategory(
        'firstRollFiveKind',
        [2, 2, 2, 2, 3],
        { rollCount: 1 },
      )).toEqual({ qualifies: false, points: 250 })
    })
  })

  it('returns a non-qualifying zero result for an unknown category', () => {
    expect(evaluateCategory('not-a-category', [1, 2, 3, 4, 5])).toEqual({
      qualifies: false,
      points: 0,
    })
  })

  it('does not mutate the dice or score inputs', () => {
    const dice = Object.freeze([5, 4, 3, 2, 1])
    const scores = Object.freeze({ fiveKind: 75 })

    expect(evaluateCategory('largeStraight', dice, { scores })).toEqual({
      qualifies: true,
      points: 50,
    })
    expect(dice).toEqual([5, 4, 3, 2, 1])
    expect(scores).toEqual({ fiveKind: 75 })
  })
})

describe('getTotals', () => {
  it('returns zero totals for a fresh scorecard', () => {
    expect(getTotals({})).toEqual({
      topSubtotal: 0,
      topBonus: 0,
      topExtraBonus: 0,
      topTotal: 0,
      bottomTotal: 0,
      grandTotal: 0,
      totalBonuses: 0,
    })
  })

  it.each([
    [99, 0, 0, 99],
    [100, 40, 0, 140],
    [124, 40, 0, 164],
    [125, 40, 25, 190],
  ])(
    'applies exact bonus boundaries at a top subtotal of %s',
    (topSubtotal, topBonus, topExtraBonus, topTotal) => {
      expect(getTotals({ any: topSubtotal })).toMatchObject({
        topSubtotal,
        topBonus,
        topExtraBonus,
        topTotal,
      })
    },
  )

  it('keeps top and bottom totals separate and counts only earned bonuses', () => {
    const scores = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 20,
      fives: 25,
      sixes: 30,
      largeStraight: 50,
      fiveKind: 75,
      fiveKindBonus: 150,
      firstRollFiveKind: 250,
      unknown: 999,
    }

    expect(getTotals(scores)).toEqual({
      topSubtotal: 105,
      topBonus: 40,
      topExtraBonus: 0,
      topTotal: 145,
      bottomTotal: 525,
      grandTotal: 670,
      totalBonuses: 190,
    })
  })

  it('does not treat other fixed awards as bonuses', () => {
    expect(getTotals({
      fullHouse: 30,
      largeStraight: 50,
      firstRollFiveKind: 250,
    })).toMatchObject({
      bottomTotal: 330,
      totalBonuses: 0,
    })
  })

  it('does not mutate the score object', () => {
    const scores = Object.freeze({ any: 125, fiveKindBonus: 150 })

    expect(getTotals(scores)).toMatchObject({ grandTotal: 340, totalBonuses: 215 })
    expect(scores).toEqual({ any: 125, fiveKindBonus: 150 })
  })
})
