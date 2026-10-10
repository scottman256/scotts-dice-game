import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameSummaryModal from './GameSummaryModal'

const achievement = {
  key: 'first-game', title: 'First Finish', description: 'Completed your first game.',
}
const readySummary = {
  status: 'ready', personalRank: 3, totalGames: 47, tiedRank: false,
  unlockedAchievements: [],
}

describe('GameSummaryModal', () => {
  it('shows the final score, personal ranking, and each earned badge with its name and description', () => {
    render(<GameSummaryModal score={410} summary={{
      ...readySummary, newHighScore: true,
      unlockedAchievements: [achievement, { key: 'golden-game', title: 'Golden Game', description: 'Played with Golden dice.' }],
    }} onClose={jest.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Game Complete' })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByRole('heading', { name: 'Game Complete' })).toHaveFocus()
    expect(dialog).toHaveTextContent('Final score410')
    expect(dialog).toHaveTextContent('NEW HIGH SCORE')
    expect(dialog).toHaveTextContent('The game is over. You got the 3rd best score out of the 47 games you played.')
    expect(within(dialog).getByRole('heading', { name: 'Achievements unlocked' })).toBeVisible()
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2)
    expect(dialog.querySelectorAll('img')).toHaveLength(2)
    expect(within(dialog).getByText(achievement.description)).toBeVisible()
    expect(within(dialog).getByRole('heading', { name: achievement.title })).toBeVisible()
  })

  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [10, '10th'],
    [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'],
    [23, '23rd'], [101, '101st'], [111, '111th'], [112, '112th'], [113, '113th'], [1001, '1,001st'],
  ])('formats rank %s as %s and omits the badge section when nothing was unlocked', (personalRank, expected) => {
    render(<GameSummaryModal score={100} summary={{ ...readySummary, personalRank, totalGames: 1234 }} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent(`You got the ${expected} best score out of the 1,234 games you played.`)
    expect(screen.queryByRole('region', { name: 'Achievements unlocked this game' })).not.toBeInTheDocument()
    expect(screen.queryByText('NEW HIGH SCORE')).not.toBeInTheDocument()
  })

  it('uses singular game and achievement wording for a first game', () => {
    render(<GameSummaryModal score={100} summary={{
      ...readySummary, personalRank: 1, totalGames: 1, unlockedAchievements: [achievement],
    }} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('out of the 1 game you played.')
    expect(screen.getByRole('heading', { name: 'Achievement unlocked' })).toBeVisible()
  })

  it('clearly describes a tied ranking', () => {
    render(<GameSummaryModal score={100} summary={{ ...readySummary, tiedRank: true }} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('You tied for the 3rd best score out of the 47 games you played.')
  })

  it('updates a pending result without moving keyboard focus again', () => {
    const { rerender } = render(<GameSummaryModal score={100} summary={{ status: 'saving' }} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Saving your score and checking achievements')
    const close = screen.getByRole('button', { name: 'Back to scorecard' })
    close.focus()
    rerender(<GameSummaryModal score={100} summary={readySummary} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('3rd best score')
    expect(close).toHaveFocus()
  })

  it.each([
    ['guest', 'The game is over.'],
    ['error', 'The game is over. Your score could not be saved. Your ranking and new achievements are unavailable.'],
  ])('does not invent rankings or awards for a %s result', (status, message) => {
    render(<GameSummaryModal score={100} summary={{ status }} onClose={jest.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('keeps the achievement text if a future badge has no local artwork', () => {
    const { container } = render(<GameSummaryModal score={100} summary={{
      ...readySummary, unlockedAchievements: [{ ...achievement, key: 'future-badge' }],
    }} onClose={jest.fn()} />)
    expect(screen.getByText(achievement.description)).toBeVisible()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('closes the native dialog and restores focus when dismissed by button or Escape', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    const { rerender, unmount } = render(<button type="button">Open summary</button>)
    const opener = screen.getByRole('button', { name: 'Open summary' })
    opener.focus()
    rerender(<><button type="button">Open summary</button><GameSummaryModal score={100} summary={readySummary} onClose={onClose} /></>)
    const dialog = screen.getByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    expect(dialog).not.toHaveAttribute('open')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Open summary' })).toHaveFocus()
    unmount()

    render(<GameSummaryModal score={100} summary={readySummary} onClose={onClose} />)
    const nextDialog = screen.getByRole('dialog')
    fireEvent(nextDialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(nextDialog).not.toHaveAttribute('open')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
