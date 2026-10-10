import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, within } from '@testing-library/react'
import DiceRoller from './DiceRoller'
import { ALL_CATEGORIES } from '../gameRules'

const gameId = 'complete-game'
const scores = Object.fromEntries(ALL_CATEGORIES.filter(({ id }) => id !== 'any').map(({ id }) => [id, 0]))
const initialState = { scores, dice: [1, 2, 3, 4, 5], rollCount: 1 }
const summary = {
  gameId, status: 'ready', personalRank: 3, totalGames: 47,
  unlockedAchievements: [{ key: 'first-game', title: 'First Finish', description: 'Completed your first game.' }],
}

describe('completed game summary', () => {
  it('opens on completion, keeps badges on the final-score panel, and lets the player reopen it', () => {
    const onGameComplete = jest.fn()
    const props = { initialGameId: gameId, initialState, gameSummary: summary, onGameComplete }
    const { container, rerender } = render(<DiceRoller {...props} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
    expect(onGameComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toHaveTextContent('First Finish')
    fireEvent.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View game summary' })).toHaveFocus()
    const panel = container.querySelector('.final-score-display')
    expect(within(panel).getByText('First Finish')).toBeVisible()
    expect(panel.querySelector('img')).toHaveAttribute('src', 'test-file-stub')
    expect(panel).toHaveTextContent('3rd best score out of the 47 games')
    rerender(<DiceRoller {...props} theme="vegas" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onGameComplete).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'View game summary' }))
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('keeps a dismissed summary closed when a pending save finishes', () => {
    const props = { initialGameId: gameId, initialState }
    const { rerender } = render(<DiceRoller {...props} gameSummary={{ gameId, status: 'saving' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    rerender(<DiceRoller {...props} gameSummary={summary} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('First Finish')).toBeVisible()
  })

  it('does not show a summary on another screen or reuse a previous game result', () => {
    const props = { initialGameId: gameId, initialState, gameSummary: summary }
    const { rerender } = render(<DiceRoller {...props} isActive={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<DiceRoller {...props} isActive />)
    expect(screen.getByRole('dialog')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'New Game' })[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('First Finish')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
  })
})
