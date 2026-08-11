import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameStatsScreen from './GameStatsScreen'

const TRACKED_STATS = {
  gamesPlayed: 2,
  activeDays: 2,
  longestPlayStreak: 1,
  favoriteTheme: 'cosmic-galaxy',
  highScore: 410,
  lowScore: 275,
  averageScore: 342.5,
  medianScore: 342.5,
  averageScratchesPerGame: 7.5,
  achievementsUnlocked: 9,
  gamesAtLeast500: 1,
  gamesAtLeast600: 0,
  fiveOfAKindsScored: 2,
  firstRollFiveOfAKinds: 0,
  firstTopBonuses: 2,
  secondTopBonuses: 1,
  fiveOfAKindBonuses: 1,
  totalPoints: 685,
}

describe('GameStatsScreen', () => {
  it('loads every tracked completed-game statistic and returns to the game', async () => {
    const loadStats = jest.fn(() => Promise.resolve(TRACKED_STATS))
    const onBack = jest.fn()
    const user = userEvent.setup()
    render(<GameStatsScreen loadStats={loadStats} onBack={onBack} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading game stats…')
    expect(await screen.findByRole('heading', { name: 'Game Stats' })).toBeVisible()
    expect(loadStats).toHaveBeenCalledTimes(1)

    for (const label of [
      'Games Played', 'High Score', 'Average', 'Total Points', 'Low Score', 'Median',
      'Active Days', 'Longest Streak', 'Favorite Theme', 'Achievements',
      '500+ Games', '600+ Games', 'Avg. Scratches', '5Ks Scored', 'First-Roll 5Ks',
      'Top Bonus I', 'Top Bonus II', '5K Bonuses',
    ]) {
      expect(screen.getByText(label)).toBeVisible()
    }
    for (const section of ['Player Journey', 'Score Profile', 'Category Craft']) {
      expect(screen.getByRole('heading', { name: section })).toBeVisible()
    }
    expect(screen.getAllByText('342.5')).toHaveLength(2)
    expect(screen.getByText('685')).toBeVisible()
    expect(screen.getByText('Cosmic Galaxy')).toBeVisible()
    expect(screen.getByText('7.5')).toBeVisible()
    const streakCard = screen.getByText('Longest Streak').closest('article')
    expect(within(streakCard).getByText('1 day')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows useful empty and failure states', async () => {
    const emptyStats = { ...TRACKED_STATS, gamesPlayed: 0, highScore: null, lowScore: null }
    const { rerender } = render(
      <GameStatsScreen loadStats={() => Promise.resolve(emptyStats)} onBack={jest.fn()} />,
    )

    expect(await screen.findByText(/Complete a game to start building/)).toBeVisible()

    rerender(
      <GameStatsScreen loadStats={() => Promise.reject(new Error('offline'))} onBack={jest.fn()} />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load game stats right now.')
  })
})
