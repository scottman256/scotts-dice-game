import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiceRoller from './DiceRoller'
import { ALL_CATEGORIES } from '../gameRules'

function createFaceSequence(values) {
  const remainingValues = [...values]

  return jest.fn(() => {
    const nextValue = remainingValues.shift()
    if (nextValue === undefined) {
      throw new Error('The deterministic die sequence ran out of values.')
    }
    return nextValue
  })
}

function renderGame(props = {}) {
  const user = userEvent.setup()
  return { user, ...render(<DiceRoller {...props} />) }
}

function completeScores(value = 0) {
  return Object.fromEntries(ALL_CATEGORIES.map(({ id }) => [id, value]))
}

describe('DiceRoller', () => {
  it('renders a fresh, accessible scorecard and disabled unrolled dice', () => {
    renderGame()

    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scorecard' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getAllByRole('button', { name: /has not been rolled/i })).toHaveLength(5)
    screen.getAllByRole('button', { name: /has not been rolled/i }).forEach((die) => {
      expect(die).toBeDisabled()
    })

    const scorecard = screen.getByRole('table', {
      name: 'Dice game scoring categories and saved scores',
    })
    const scoreButtons = within(scorecard).getAllByRole('button')
    expect(scoreButtons).toHaveLength(ALL_CATEGORIES.length)
    scoreButtons.forEach((button) => expect(button).toBeDisabled())

    expect(screen.getByText('0/19 filled')).toBeVisible()
    expect(screen.getByText('0/9 filled')).toBeVisible()
    expect(screen.getByText('0/10 filled')).toBeVisible()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    screen.getAllByRole('checkbox').forEach((chance) => {
      expect(chance).not.toBeChecked()
      expect(chance).toBeDisabled()
    })
    expect(screen.getByText('Roll all five dice to begin.')).toBeVisible()
    expect(screen.getByLabelText('Dice have not been rolled'))
      .toHaveAttribute('data-dice-theme', 'classic')
  })

  it.each([
    'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
    'retro-arcade', 'vegas',
    'american', 'cosmic-galaxy',
    'sixties-tie-dye', 'world-traveler',
  ])(
    'selects the %s dice artwork',
    (theme) => {
      renderGame({ theme })

      expect(screen.getByLabelText('Dice have not been rolled'))
        .toHaveAttribute('data-dice-theme', theme)
    },
  )

  it('falls back to Classic dice artwork for an invalid theme', () => {
    renderGame({ theme: 'unknown' })

    expect(screen.getByLabelText('Dice have not been rolled'))
      .toHaveAttribute('data-dice-theme', 'classic')
  })

  it('rolls deterministic dice and updates the turn controls and score previews', async () => {
    const faceRoller = createFaceSequence([1, 1, 2, 3, 4])
    const { user } = renderGame({ faceRoller })

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))

    expect(faceRoller).toHaveBeenCalledTimes(5)
    expect(screen.getByLabelText('Dice total 11')).toBeVisible()
    expect(screen.getByLabelText('Roll 1')).toHaveTextContent('1/3')
    expect(screen.getByRole('button', { name: 'Roll Again (2 left)' })).toBeEnabled()
    expect(screen.getByText(/Roll 1 of 3\. Hold dice/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Score 2 points in Ones' })).toBeEnabled()
    expect(screen.getByRole('button', {
      name: 'Roll a qualifying combination for All Even',
    })).toBeDisabled()
  })

  it('keeps held dice across rolls and clears every hold after cashing in', async () => {
    const faceRoller = createFaceSequence([1, 2, 3, 4, 6, 5])
    const { user } = renderGame({ faceRoller })

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    for (let index = 1; index <= 4; index += 1) {
      await user.click(screen.getByRole('button', {
        name: new RegExp(`Die ${index} showing ${index}\\. Click to hold`),
      }))
    }

    expect(screen.getByText('4 dice held. Click a die to hold or release it before the next roll.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))

    expect(faceRoller).toHaveBeenCalledTimes(6)
    for (let index = 1; index <= 4; index += 1) {
      expect(screen.getByRole('button', {
        name: new RegExp(`Die ${index} showing ${index}\\. Held`),
      })).toHaveAttribute('aria-pressed', 'true')
    }
    expect(screen.getByRole('button', { name: /Die 5 showing 5\. Click to hold/ }))
      .toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Dice total 15')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Score 50 points in Large Straight' }))

    expect(screen.getAllByRole('button', { name: /has not been rolled/i })).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getByLabelText('Large Straight: 50 points')).toBeVisible()
  })

  it('records a qualifying score on an early roll and updates section progress', async () => {
    const { user } = renderGame({
      faceRoller: createFaceSequence([1, 1, 2, 3, 4]),
    })

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Score 2 points in Ones' }))

    expect(screen.getByLabelText('Ones: 2 points')).toHaveTextContent('2')
    expect(screen.getByText('1/19 filled')).toBeVisible()
    expect(screen.getByText('1/9 filled')).toBeVisible()
    expect(screen.getByText('0/10 filled')).toBeVisible()
    expect(screen.getByText('Ones scored 2 points. Roll to start the next turn.')).toBeVisible()
    expect(screen.getByLabelText('Dice have not been rolled')).toBeVisible()
  })

  it('allows an unqualified category to be scratched only after the third roll', async () => {
    const { user } = renderGame({ faceRoller: jest.fn(() => 2) })

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    const unqualifiedAction = screen.getByRole('button', {
      name: 'Roll a qualifying combination for Large Straight',
    })
    expect(unqualifiedAction).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    expect(unqualifiedAction).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))

    const scratchAction = screen.getByRole('button', {
      name: 'Record zero points in Large Straight',
    })
    expect(scratchAction).toBeEnabled()
    await user.click(scratchAction)

    expect(screen.getByLabelText('Large Straight: 0 points')).toHaveTextContent('0')
    expect(screen.getByText('Large Straight scored 0 points. Roll to start the next turn.')).toBeVisible()
    expect(screen.getByText('1/10 filled')).toBeVisible()
  })

  it('spends a fourth-roll chance, locks further rolls, and preserves usage next turn', async () => {
    const faceRoller = jest.fn(() => 2)
    const { user } = renderGame({ faceRoller })

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))

    expect(screen.getByRole('button', { name: 'Use 4th Roll (3 left)' })).toBeEnabled()
    expect(screen.getByText(/Roll 3 of 3.*spend one fourth-roll chance/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Use 4th Roll (3 left)' }))

    expect(faceRoller).toHaveBeenCalledTimes(20)
    expect(screen.getByRole('button', { name: 'Cash In a Score' })).toBeDisabled()
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked()
    expect(screen.getByText('2 of 3 remaining for this game')).toBeVisible()
    expect(screen.getByText('Fourth roll used. Choose a category to cash in this turn.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Score 10 points in Any' }))
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(faceRoller).toHaveBeenCalledTimes(25)
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
  })

  it.each([
    {
      category: 'Large Straight',
      dice: [1, 2, 3, 4, 5],
      rollCount: 2,
      scores: {},
      points: 50,
      message: /Fantastic! You landed a Large Straight!.*Large Straight scored 50 points/,
      tone: 'status-celebration',
    },
    {
      category: '5 of a Kind',
      dice: [6, 6, 6, 6, 6],
      rollCount: 2,
      scores: {},
      points: 75,
      message: /Amazing! Five of a Kind.*5 of a Kind scored 75 points/,
      tone: 'status-celebration',
    },
    {
      category: '5 of a Kind Bonus',
      dice: [4, 4, 4, 4, 4],
      rollCount: 2,
      scores: { fiveKind: 75 },
      points: 150,
      message: /Incredible! Another Five of a Kind.*5 of a Kind Bonus scored 150 points/,
      tone: 'status-celebration',
    },
    {
      category: '5 of a Kind on First Roll',
      dice: [3, 3, 3, 3, 3],
      rollCount: 1,
      scores: {},
      points: 250,
      message: /UNBELIEVABLE! FIVE OF A KIND ON THE FIRST ROLL!.*scored 250 points/,
      tone: 'status-legendary',
    },
  ])('uses the special cash-out treatment for $category', async ({
    category,
    dice,
    rollCount,
    scores,
    points,
    message,
    tone,
  }) => {
    const { user } = renderGame({ initialState: { dice, rollCount, scores } })

    await user.click(screen.getByRole('button', {
      name: `Score ${points} points in ${category}`,
    }))

    const status = screen.getByText(message)
    expect(status).toHaveClass(tone)
    expect(status).toHaveAttribute('role', 'status')
  })

  it('shows section totals, both top bonuses, bonus totals, and partial progress', () => {
    const scores = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 20,
      fives: 25,
      sixes: 30,
      any: 20,
      twoPair: 10,
    }
    renderGame({ initialState: { scores } })

    expect(screen.getByText('8/19 filled')).toBeVisible()
    expect(screen.getByText('7/9 filled')).toBeVisible()
    expect(screen.getByText('1/10 filled')).toBeVisible()
    expect(screen.getByLabelText('Top section bonus: 40 points')).toHaveTextContent('40')
    expect(screen.getByLabelText('Top section extra bonus: 25 points')).toHaveTextContent('25')

    const expectedTotals = [
      ['Total of Top Section', '190'],
      ['Total of Bottom Section', '10'],
      ['Grand Total', '200'],
      ['Total Bonuses Earned', '65'],
    ]
    expectedTotals.forEach(([label, value]) => {
      const row = screen.getByText(label).closest('tr')
      expect(within(row).getByText(value)).toBeVisible()
    })
  })

  it('completes the game when the final category is cashed in', async () => {
    const scores = completeScores()
    delete scores.any
    const { user } = renderGame({
      initialState: {
        dice: [1, 2, 3, 4, 5],
        rollCount: 1,
        scores,
      },
    })

    expect(screen.getByText('18/19 filled')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))

    expect(screen.getByLabelText('Game complete. Final score 15')).toBeVisible()
    expect(screen.getByText(/Any scored 15 points\. The scorecard is complete!/)).toBeVisible()
    expect(screen.getByText('19/19 filled')).toBeVisible()
    expect(screen.getByText('Scorecard complete')).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'New Game' })).toHaveLength(2)
  })

  it('gives scores over 500 the spectacular final-score treatment and starts a clean new game', async () => {
    const scores = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 20,
      fives: 25,
      sixes: 30,
      any: 30,
      allEven: 30,
      allOdd: 25,
      twoPair: 30,
      threeKind: 30,
      fourKind: 30,
      fullHouse: 30,
      miniStraight: 25,
      smallStraight: 35,
      largeStraight: 50,
      fiveKind: 75,
      fiveKindBonus: 150,
      firstRollFiveKind: 250,
    }
    const { user, container } = renderGame({
      initialState: {
        dice: [6, 6, 6, 6, 6],
        heldDice: [true, true, true, true, true],
        rollCount: 4,
        scores,
        extraRollsUsed: 3,
      },
    })

    const finalScore = screen.getByLabelText(
      'Game complete. Spectacular score over 500. Final score 960',
    )
    expect(finalScore).toHaveClass('spectacular-score-display')
    expect(within(finalScore).getByText('Game Complete — Spectacular!')).toBeVisible()
    expect(within(finalScore).getByText('960')).toHaveClass('final-score-number')
    expect(container.querySelector('.score-fireworks')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'New Game' })[0])

    expect(screen.queryByLabelText(/Game complete/)).not.toBeInTheDocument()
    expect(screen.getByText('0/19 filled')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getAllByRole('button', { name: /has not been rolled/i })).toHaveLength(5)
    screen.getAllByRole('checkbox').forEach((chance) => expect(chance).not.toBeChecked())
    expect(screen.getByText('New game ready. Roll all five dice to begin.')).toBeVisible()
  })

  it('keeps the standard completed-game treatment at 500 points', () => {
    const scores = completeScores()
    scores.any = 435
    renderGame({ initialState: { scores } })

    const finalScore = screen.getByLabelText('Game complete. Final score 500')
    expect(finalScore).not.toHaveClass('spectacular-score-display')
    expect(within(finalScore).getByText('Game Complete')).toBeVisible()
    expect(within(finalScore).getByText('500')).toHaveClass('final-score-number')
  })

  it('reports a completed game once and announces a confirmed new high score', async () => {
    const onGameComplete = jest.fn()
    renderGame({
      initialState: { scores: completeScores(1) },
      highScoreStatus: 'new',
      onGameComplete,
    })

    expect(screen.getByText('NEW HIGH SCORE')).toBeVisible()
    await waitFor(() => expect(onGameComplete).toHaveBeenCalledTimes(1))
    expect(onGameComplete).toHaveBeenCalledWith({
      gameId: expect.any(String),
      score: expect.any(Number),
    })
  })
})
