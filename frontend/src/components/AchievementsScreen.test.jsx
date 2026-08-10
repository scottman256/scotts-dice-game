import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
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
  lockedAchievements: [
    { unlockDescription: 'Complete 10 games.' },
    { unlockDescription: 'Complete 100 games.' },
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
    const lockedCells = screen.getAllByLabelText(/Locked achievement slot/)
    expect(lockedCells).toHaveLength(34)
    expect(container.querySelectorAll('.achievement-slot-earned img')).toHaveLength(2)
    expect(container.querySelectorAll('.achievement-slot-earned')[0]).toHaveTextContent('First Finish')
    expect(container.querySelectorAll('.achievement-slot-earned')[1]).toHaveTextContent('Golden')
    const firstHint = within(lockedCells[0]).getByRole('tooltip')
    expect(firstHint).toHaveTextContent('Complete 10 games.')
    expect(lockedCells[0]).toHaveAttribute('aria-describedby', firstHint.id)
    expect(lockedCells[0]).toHaveAttribute('tabindex', '0')
    expect(screen.queryByText('Double Digits')).not.toBeInTheDocument()

    await user.hover(lockedCells[0])
    expect(firstHint).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders the server-controlled Grand Master hint without its title or artwork', async () => {
    const earnedAchievements = Array.from({ length: 24 }, (_, index) => ({
      key: `earned-${index}`,
      title: `Earned ${index}`,
      description: `Earned achievement ${index}.`,
      achievedAt: `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
    }))
    const { unmount } = render(
      <AchievementsScreen
        loadAchievements={() => Promise.resolve({
          capacity: 36,
          achievements: earnedAchievements,
          lockedAchievements: [{ unlockDescription: '?????' }],
        })}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText('24 / 36')).toBeVisible()
    let firstLockedCell = screen.getAllByLabelText(/Locked achievement slot/)[0]
    expect(within(firstLockedCell).getByRole('tooltip')).toHaveTextContent('?????')
    expect(screen.queryByText('Grand Master')).not.toBeInTheDocument()
    unmount()

    render(
      <AchievementsScreen
        loadAchievements={() => Promise.resolve({
          capacity: 36,
          achievements: [...earnedAchievements, {
            key: 'earned-24',
            title: 'Earned 24',
            description: 'Earned achievement 24.',
            achievedAt: '2026-07-25T12:00:00Z',
          }],
          lockedAchievements: [{ unlockDescription: 'Unlocked all 35 other achievements.' }],
        })}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText('25 / 36')).toBeVisible()
    firstLockedCell = screen.getAllByLabelText(/Locked achievement slot/)[0]
    expect(within(firstLockedCell).getByRole('tooltip'))
      .toHaveTextContent('Unlocked all 35 other achievements.')
    expect(screen.queryByText('Grand Master')).not.toBeInTheDocument()
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
