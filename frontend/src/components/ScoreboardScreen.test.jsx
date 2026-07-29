import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import ScoreboardScreen from './ScoreboardScreen'

describe('ScoreboardScreen', () => {
  it('loads and displays the personal top ten', async () => {
    const loadScores = jest.fn(() => Promise.resolve([{
      scoreId: 1,
      rank: 1,
      playerName: 'test',
      score: 700,
      completedAt: '2026-07-28T12:00:00Z',
    }]))
    render(<ScoreboardScreen mode="personal" loadScores={loadScores} onBack={jest.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading scores…')
    expect(await screen.findByRole('heading', { name: 'My Top 10 Scores' })).toBeVisible()
    expect(await screen.findByRole('cell', { name: '700' })).toBeVisible()
    expect(loadScores).toHaveBeenCalledWith('personal')
  })

  it('shows the global empty state and a useful request failure', async () => {
    const { rerender } = render(
      <ScoreboardScreen mode="global" loadScores={() => Promise.resolve([])} onBack={jest.fn()} />,
    )

    expect(await screen.findByText(/No completed games yet/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Top 10 Overall' })).toBeVisible()

    rerender(
      <ScoreboardScreen
        mode="personal"
        loadScores={() => Promise.reject(new Error('offline'))}
        onBack={jest.fn()}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load scores right now.')
  })
})
