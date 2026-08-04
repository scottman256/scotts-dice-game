import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('uses a placeholder for missing or invalid completion dates', async () => {
    render(
      <ScoreboardScreen
        mode="global"
        loadScores={() => Promise.resolve([
          { scoreId: 1, rank: 1, playerName: 'No Date', score: 500, completedAt: null },
          { scoreId: 2, rank: 2, playerName: 'Bad Date', score: 450, completedAt: 'not-a-date' },
        ])}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByRole('cell', { name: '500' })).toBeVisible()
    expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(2)
  })

  it('gives administrators controls to add, delete, and reset global scores', async () => {
    const loadScores = jest.fn(() => Promise.resolve([{
      scoreId: 'score-1', rank: 1, playerName: 'Fishman', score: 999, completedAt: null,
    }]))
    const deleteScore = jest.fn(() => Promise.resolve())
    const resetGameData = jest.fn(() => Promise.resolve())
    const addSystemScore = jest.fn(() => Promise.resolve())
    const onGameDataReset = jest.fn()
    const user = userEvent.setup()
    render(
      <ScoreboardScreen
        mode="global"
        loadScores={loadScores}
        isAdmin
        deleteScore={deleteScore}
        resetGameData={resetGameData}
        addSystemScore={addSystemScore}
        onGameDataReset={onGameDataReset}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText('Fishman')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('dialog', { name: /Delete Fishman's score/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delete score' }))
    expect(deleteScore).toHaveBeenCalledWith('score-1')

    await user.click(screen.getByRole('button', { name: 'Add system score' }))
    await user.type(screen.getByLabelText('Player name'), 'New Roller')
    await user.type(screen.getByLabelText('Score'), '888')
    await user.click(screen.getByRole('button', { name: 'Add score' }))
    expect(addSystemScore).toHaveBeenCalledWith({ playerName: 'New Roller', score: 888 })

    await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
    const dialog = screen.getByRole('dialog', { name: 'Restore the original leaderboard?' })
    await user.click(within(dialog).getByRole('button', { name: 'Restore defaults' }))
    expect(resetGameData).toHaveBeenCalledTimes(1)
    expect(onGameDataReset).toHaveBeenCalledTimes(1)
  })

  it('keeps administrator controls usable when score actions fail', async () => {
    const user = userEvent.setup()
    const deleteScore = jest.fn(() => Promise.reject({}))
    const addSystemScore = jest.fn(() => Promise.reject({}))
    const resetGameData = jest.fn(() => Promise.reject({}))
    render(
      <ScoreboardScreen
        mode="global"
        loadScores={() => Promise.resolve([{
          scoreId: 'score-2', rank: 1, playerName: 'Error Roller', score: 777, completedAt: null,
        }])}
        isAdmin
        deleteScore={deleteScore}
        addSystemScore={addSystemScore}
        resetGameData={resetGameData}
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText('Error Roller')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete score' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That score could not be deleted.')

    await user.click(screen.getByRole('button', { name: 'Add system score' }))
    await user.type(screen.getByLabelText('Player name'), 'Retry Roller')
    await user.type(screen.getByLabelText('Score'), '650')
    await user.click(screen.getByRole('button', { name: 'Add score' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('The system score could not be added.')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore defaults' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Game data could not be reset.')
  })

  it('does not expose administrator controls on the personal scoreboard', async () => {
    render(
      <ScoreboardScreen
        mode="personal"
        loadScores={() => Promise.resolve([])}
        isAdmin
        onBack={jest.fn()}
      />,
    )

    expect(await screen.findByText(/No completed games yet/)).toBeVisible()
    expect(screen.queryByText('Admin leaderboard controls')).not.toBeInTheDocument()
  })
})
