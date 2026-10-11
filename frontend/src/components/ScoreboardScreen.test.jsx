import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScoreboardScreen from './ScoreboardScreen'
import { ALL_CATEGORIES } from '../gameRules'

const scratchedCard = Object.fromEntries(ALL_CATEGORIES.map(({ id }) => [id, 0]))
const completedCard = {
  ...scratchedCard, ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30,
  any: 20, fiveKind: 75, fiveKindBonus: 150, firstRollFiveKind: 250,
}
const completedEntries = [
  { scoreId: 'first', rank: 1, playerName: 'Ada', score: 665, completedAt: '2026-10-11T12:00:00Z' },
  { scoreId: 'second', rank: 2, playerName: 'Ada', score: 0, completedAt: null },
]

function renderHistory(loadGame, onThemePreview = jest.fn()) {
  const loadScores = jest.fn().mockResolvedValue(completedEntries)
  const props = { mode: 'personal', loadScores, loadGame, onThemePreview, onBack: jest.fn() }
  return { ...render(<ScoreboardScreen {...props} />), props, user: userEvent.setup() }
}

describe('ScoreboardScreen', () => {
  it('opens each personal score as a read-only card and returns focus to the score link', async () => {
    const loadGame = jest.fn()
      .mockResolvedValueOnce({ score: 665, theme: 'vegas', categoryScores: completedCard, scorecardAvailable: true })
      .mockResolvedValueOnce({ score: 0, theme: 'classic', categoryScores: scratchedCard, scorecardAvailable: true })
    const { user, props } = renderHistory(loadGame)
    const scoreLink = await screen.findByRole('link', { name: '665' })
    scoreLink.focus()
    await user.keyboard('{Enter}')

    const card = await screen.findByRole('region', { name: 'Scorecard' })
    expect(screen.getByRole('heading', { name: 'Finished Scorecard' })).toHaveFocus()
    expect(loadGame).toHaveBeenLastCalledWith('first')
    expect(props.onThemePreview).toHaveBeenLastCalledWith('vegas')
    for (const { id, label } of ALL_CATEGORIES) {
      expect(within(card).getByLabelText(`${label}: ${completedCard[id]} points`)).toHaveTextContent(String(completedCard[id]))
    }
    expect(within(card).getByRole('row', { name: 'Grand Total 665' })).toBeVisible()
    expect(within(card).getByRole('row', { name: 'Total Bonuses Earned 215' })).toBeVisible()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Scratch the 5 of a Kind Bonus first')).not.toBeInTheDocument()
    expect(screen.queryByText(/Gold dollar buttons can be scored now/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Back to My Top 10' })[1])
    expect(scoreLink).toHaveFocus()
    expect(props.onThemePreview).toHaveBeenLastCalledWith(null)
    expect(props.loadScores).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('link', { name: '0' }))
    expect(await screen.findByRole('row', { name: 'Grand Total 0' })).toBeVisible()
    expect(loadGame).toHaveBeenLastCalledWith('second')
    expect(screen.getByLabelText('5 of a Kind: 0 points')).toBeVisible()
    expect(props.onThemePreview).toHaveBeenLastCalledWith('classic')
  })

  it('offers a retry after a failed request', async () => {
    const loadGame = jest.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ score: 0, theme: 'classic', categoryScores: scratchedCard, scorecardAvailable: true })
    const { user } = renderHistory(loadGame)
    await user.click(await screen.findByRole('link', { name: '0' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this scorecard.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('row', { name: 'Grand Total 0' })).toBeVisible()
    expect(loadGame).toHaveBeenCalledTimes(2)
  })

  it('handles a deleted score with a way back to the list', async () => {
    const { user } = renderHistory(jest.fn().mockRejectedValue({ status: 404 }))
    await user.click(await screen.findByRole('link', { name: '665' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This completed game is no longer available.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to My Top 10' }))
    expect(screen.getByRole('heading', { name: 'My Top 10 Scores' })).toBeVisible()
  })

  it('explains missing historical details without inventing category scores', async () => {
    const { user, props } = renderHistory(jest.fn().mockResolvedValue({
      score: 665, theme: null, categoryScores: {}, scorecardAvailable: false,
    }))
    await user.click(await screen.findByRole('link', { name: '665' }))
    expect(await screen.findByText(/category scores were not recorded/)).toBeVisible()
    expect(screen.getByText(/Final score: 665/)).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Scorecard' })).not.toBeInTheDocument()
    expect(props.onThemePreview).toHaveBeenLastCalledWith('classic')
  })

  it.each(['resolve', 'reject'])('ignores a late %s after leaving the loading view', async (outcome) => {
    let resolve, reject
    const pending = new Promise((res, rej) => { resolve = res; reject = rej })
    const { user, props } = renderHistory(jest.fn(() => pending))
    await user.click(await screen.findByRole('link', { name: '665' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading scorecard')
    await user.click(screen.getByRole('button', { name: 'Back to My Top 10' }))
    await act(async () => {
      if (outcome === 'resolve') resolve({ theme: 'vegas', categoryScores: completedCard, scorecardAvailable: true })
      else reject(new Error('offline'))
    })
    expect(screen.getByRole('link', { name: '665' })).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Finished Scorecard' })).not.toBeInTheDocument()
    expect(props.onThemePreview).not.toHaveBeenCalledWith('vegas')
  })

  it('closes a historical card when switching to the global leaderboard', async () => {
    const { user, props, rerender } = renderHistory(jest.fn().mockResolvedValue({
      score: 665, theme: 'vegas', categoryScores: completedCard, scorecardAvailable: true,
    }))
    await user.click(await screen.findByRole('link', { name: '665' }))
    await screen.findByRole('region', { name: 'Scorecard' })
    rerender(<ScoreboardScreen {...props} mode="global" />)
    expect(await screen.findByRole('cell', { name: '665' })).toBeVisible()
    expect(screen.queryByRole('link', { name: '665' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Finished Scorecard' })).not.toBeInTheDocument()
    expect(props.onThemePreview).toHaveBeenLastCalledWith(null)
    rerender(<ScoreboardScreen {...props} />)
    expect(await screen.findByRole('link', { name: '665' })).toBeVisible()
  })

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
