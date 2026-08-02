import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AchievementsScreen from './AchievementsScreen'

const COLLECTION = {
  capacity: 36,
  achievements: [
    {
      key: 'first-game',
      title: 'First Finish',
      description: 'Completed your first game.',
      achievedAt: '2026-07-28T12:00:00Z',
    },
    {
      key: 'golden-game',
      title: 'Golden',
      description: 'Completed a game with the Golden dice.',
      achievedAt: '2026-07-29T12:00:00Z',
    },
  ],
}

describe('AchievementsScreen', () => {
  it('shows earned achievements in API order within a visible 36-slot collection', async () => {
    const loadAchievements = jest.fn(() => Promise.resolve(COLLECTION))
    const onBack = jest.fn()
    const user = userEvent.setup()
    const { container } = render(
      <AchievementsScreen loadAchievements={loadAchievements} onBack={onBack} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading achievements…')
    expect(await screen.findByText('First Finish')).toBeVisible()
    expect(loadAchievements).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Golden')).toBeVisible()
    expect(screen.getByText('2 / 36')).toBeVisible()
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('cell')).toHaveLength(36)
    expect(screen.getAllByLabelText(/Locked achievement slot/)).toHaveLength(34)
    expect(container.querySelectorAll('.achievement-slot-earned img')).toHaveLength(2)
    expect(container.querySelectorAll('.achievement-slot-earned')[0]).toHaveTextContent('First Finish')
    expect(container.querySelectorAll('.achievement-slot-earned')[1]).toHaveTextContent('Golden')

    await user.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('keeps unearned details hidden and reports loading failures', async () => {
    const { rerender } = render(
      <AchievementsScreen
        loadAchievements={() => Promise.resolve({ capacity: 36, achievements: [] })}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText('0 / 36')).toBeVisible()
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('cell')).toHaveLength(36)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()

    rerender(
      <AchievementsScreen
        loadAchievements={() => Promise.reject(new Error('offline'))}
        onBack={jest.fn()}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load achievements right now.')
  })
})
