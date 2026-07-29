export const TOP_CATEGORIES = [
  { id: 'ones', label: 'Ones', description: 'Sum of all ones' },
  { id: 'twos', label: 'Twos', description: 'Sum of all twos' },
  { id: 'threes', label: 'Threes', description: 'Sum of all threes' },
  { id: 'fours', label: 'Fours', description: 'Sum of all fours' },
  { id: 'fives', label: 'Fives', description: 'Sum of all fives' },
  { id: 'sixes', label: 'Sixes', description: 'Sum of all sixes' },
  { id: 'any', label: 'Any', description: 'Sum of all dice' },
  { id: 'allEven', label: 'All Even', description: 'All dice even — sum of all dice' },
  { id: 'allOdd', label: 'All Odd', description: 'All dice odd — sum of all dice' },
]

export const BOTTOM_CATEGORIES = [
  { id: 'twoPair', label: '2 Pair', description: 'Two different pairs — sum of all dice' },
  { id: 'threeKind', label: '3 of a Kind', description: 'Sum of all dice' },
  { id: 'fourKind', label: '4 of a Kind', description: 'Sum of all dice' },
  { id: 'fullHouse', label: 'Full House', description: 'Score 30 points' },
  { id: 'miniStraight', label: 'Mini Straight', description: 'Sequence of 3 — score 25 points' },
  { id: 'smallStraight', label: 'Small Straight', description: 'Sequence of 4 — score 35 points' },
  { id: 'largeStraight', label: 'Large Straight', description: 'Sequence of 5 — score 50 points' },
  { id: 'fiveKind', label: '5 of a Kind', description: 'Score 75 points' },
  {
    id: 'fiveKindBonus',
    label: '5 of a Kind Bonus',
    description: 'Another 5 of a kind after scoring the first — score 150 points',
  },
  {
    id: 'firstRollFiveKind',
    label: '5 of a Kind on First Roll',
    description: 'Must be rolled on roll 1 — score 250 points',
  },
]

export const ALL_CATEGORIES = [...TOP_CATEGORIES, ...BOTTOM_CATEGORIES]
export const CATEGORY_COUNT = ALL_CATEGORIES.length
export const TOP_BONUS_THRESHOLD = 100
export const TOP_BONUS_POINTS = 40
export const TOP_EXTRA_BONUS_THRESHOLD = 125
export const TOP_EXTRA_BONUS_POINTS = 25

const NUMBER_CATEGORY_VALUES = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
}

function isCompleteRoll(dice) {
  return dice.length === 5 && dice.every((die) => Number.isInteger(die) && die >= 1 && die <= 6)
}

function getCounts(dice) {
  return dice.reduce((counts, die) => {
    counts[die] = (counts[die] || 0) + 1
    return counts
  }, {})
}

function sumDice(dice) {
  return dice.reduce((total, die) => total + die, 0)
}

function hasRun(dice, requiredLength) {
  const uniqueDice = [...new Set(dice)].sort((a, b) => a - b)
  let longestRun = uniqueDice.length ? 1 : 0
  let currentRun = longestRun

  for (let index = 1; index < uniqueDice.length; index += 1) {
    if (uniqueDice[index] === uniqueDice[index - 1] + 1) {
      currentRun += 1
      longestRun = Math.max(longestRun, currentRun)
    } else {
      currentRun = 1
    }
  }

  return longestRun >= requiredLength
}

export function evaluateCategory(categoryId, dice, { rollCount = 0, scores = {} } = {}) {
  if (!isCompleteRoll(dice)) {
    return { qualifies: false, points: 0 }
  }

  const counts = Object.values(getCounts(dice))
  const total = sumDice(dice)
  const numberValue = NUMBER_CATEGORY_VALUES[categoryId]
  const isFiveKind = counts.includes(5)

  if (numberValue) {
    const matchingDice = dice.filter((die) => die === numberValue)
    return {
      qualifies: matchingDice.length > 0,
      points: matchingDice.length * numberValue,
    }
  }

  switch (categoryId) {
    case 'any':
      return { qualifies: true, points: total }
    case 'allEven':
      return { qualifies: dice.every((die) => die % 2 === 0), points: total }
    case 'allOdd':
      return { qualifies: dice.every((die) => die % 2 !== 0), points: total }
    case 'twoPair':
      return { qualifies: counts.filter((count) => count >= 2).length >= 2, points: total }
    case 'threeKind':
      return { qualifies: counts.some((count) => count >= 3), points: total }
    case 'fourKind':
      return { qualifies: counts.some((count) => count >= 4), points: total }
    case 'fullHouse':
      return { qualifies: [...counts].sort((a, b) => a - b).join(',') === '2,3', points: 30 }
    case 'miniStraight':
      return { qualifies: hasRun(dice, 3), points: 25 }
    case 'smallStraight':
      return { qualifies: hasRun(dice, 4), points: 35 }
    case 'largeStraight':
      return { qualifies: hasRun(dice, 5), points: 50 }
    case 'fiveKind':
      return { qualifies: isFiveKind, points: 75 }
    case 'fiveKindBonus':
      return { qualifies: isFiveKind && scores.fiveKind === 75, points: 150 }
    case 'firstRollFiveKind':
      return { qualifies: isFiveKind && rollCount === 1, points: 250 }
    default:
      return { qualifies: false, points: 0 }
  }
}

function addScores(scores, categories) {
  return categories.reduce((total, category) => total + (scores[category.id] ?? 0), 0)
}

export function getTotals(scores) {
  const topSubtotal = addScores(scores, TOP_CATEGORIES)
  const topBonus = topSubtotal >= TOP_BONUS_THRESHOLD ? TOP_BONUS_POINTS : 0
  const topExtraBonus = topSubtotal >= TOP_EXTRA_BONUS_THRESHOLD ? TOP_EXTRA_BONUS_POINTS : 0
  const topTotal = topSubtotal + topBonus + topExtraBonus
  const bottomTotal = addScores(scores, BOTTOM_CATEGORIES)

  return {
    topSubtotal,
    topBonus,
    topExtraBonus,
    topTotal,
    bottomTotal,
    grandTotal: topTotal + bottomTotal,
    totalBonuses: topBonus + topExtraBonus + (scores.fiveKindBonus ?? 0),
  }
}
