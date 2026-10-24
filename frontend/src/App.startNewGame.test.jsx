import React from 'react'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { guestGameStore } from './persistence/guestGameStore'
import { createInitialGameState } from './gameState'
import { ALL_CATEGORIES } from './gameRules'

const gameId = '83d35313-a908-4516-b132-c599f460df6a'
const state = createInitialGameState({
  dice: [1, 2, 3, 4, 5], heldDice: [true, false, true, false, false],
  rollCount: 3, scores: { sixes: 0 }, extraRollsUsed: 1,
})

function pending() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function backend(overrides = {}) {
  return {
    checkAvailability: jest.fn().mockResolvedValue({ available: true, socialAuthEnabled: false, manualAuthEnabled: true }),
    restoreSession: jest.fn().mockResolvedValue({ id: 'member', name: 'Member', providerId: 'manual' }),
    getGameSession: jest.fn().mockResolvedValue({ theme: 'vegas', savedGame: { gameId, ...state } }),
    saveGame: jest.fn().mockResolvedValue(),
    saveScore: jest.fn().mockResolvedValue({ score: 15, totalGames: 1, personalRank: 1, unlockedAchievements: [] }),
    saveTheme: jest.fn().mockResolvedValue(),
    deleteSavedGame: jest.fn().mockResolvedValue(),
    getPersonalScores: jest.fn().mockResolvedValue([]),
    ...overrides,
  }
}

async function openRestart(user) {
  await user.click(screen.getByRole('button', { name: /Player Hub/ }))
  await user.click(screen.getByRole('menuitem', { name: 'Start New Game' }))
  return screen.getByRole('dialog', { name: 'Start a new game?' })
}

async function expectRestartAvailable(user, available) {
  await user.click(screen.getByRole('button', { name: /Player Hub/ }))
  const action = screen.getByRole('menuitem', { name: 'Start New Game' })
  if (available) {
    expect(action).toBeEnabled()
  } else {
    expect(action).toBeDisabled()
    await user.click(action)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
  await user.keyboard('{Escape}')
}

async function resumeGuest() {
  guestGameStore.saveTheme('vegas')
  guestGameStore.saveGame(gameId, state)
  const user = userEvent.setup()
  const view = render(<App />)
  await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
  await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))
  return { ...view, user }
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('start over through the Player Hub', () => {
  it.each(['guest', 'member'])('enables restart only after rolling and disables it again after restarting as a %s', async (kind) => {
    const client = backend({ getGameSession: jest.fn().mockResolvedValue({ theme: 'classic', savedGame: null }) })
    const user = userEvent.setup()
    render(kind === 'guest' ? <App /> : <App backendClient={client} />)
    if (kind === 'guest') await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await screen.findByRole('button', { name: 'Roll Dice' })
    await expectRestartAvailable(user, false)

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    await expectRestartAvailable(user, false)
    expect(client.deleteSavedGame).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await expectRestartAvailable(user, true)
    await user.click(screen.getByRole('button', { name: /Score \d+ points in Any/ }))
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    await expectRestartAvailable(user, true)

    await openRestart(user)
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    await expectRestartAvailable(user, false)
    expect(client.deleteSavedGame).toHaveBeenCalledTimes(kind === 'member' ? 1 : 0)
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await expectRestartAvailable(user, true)
  })

  it.each(['guest', 'member'])('enables restart for a %s game resumed between turns, even with a zero score', async (kind) => {
    const betweenTurns = createInitialGameState({ scores: { sixes: 0 } })
    const client = backend({ getGameSession: jest.fn().mockResolvedValue({ theme: 'classic', savedGame: { gameId, ...betweenTurns } }) })
    const user = userEvent.setup()
    if (kind === 'guest') guestGameStore.saveGame(gameId, betweenTurns)
    render(kind === 'guest' ? <App /> : <App backendClient={client} />)
    if (kind === 'guest') await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    await expectRestartAvailable(user, true)
    await openRestart(user)
    expect(screen.getByRole('button', { name: 'Keep Playing' })).toHaveFocus()
  })

  it.each(['guest', 'member'])('keeps restart disabled after a %s discards a saved game at sign-in', async (kind) => {
    const client = backend()
    const user = userEvent.setup()
    if (kind === 'guest') guestGameStore.saveGame(gameId, state)
    render(kind === 'guest' ? <App /> : <App backendClient={client} />)
    if (kind === 'guest') await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(await screen.findByRole('button', { name: 'Start New Game' }))
    await expectRestartAvailable(user, false)
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await expectRestartAvailable(user, true)
  })

  it.each(['Keep Playing', 'Escape', 'Enter'])('preserves all progress when canceled with %s', async (choice) => {
    const { user } = await resumeGuest()
    const saved = guestGameStore.getGameSession()
    const dialog = await openRestart(user)
    expect(dialog).toHaveTextContent('Your current game’s progress will be lost.')
    expect(dialog).toHaveTextContent('Unfinished games do not count toward your statistics.')
    expect(screen.getByRole('button', { name: 'Keep Playing' })).toHaveFocus()
    if (choice === 'Escape') fireEvent(dialog, new Event('cancel', { cancelable: true }))
    else if (choice === 'Enter') await user.keyboard('{Enter}')
    else await user.click(screen.getByRole('button', { name: choice }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Player Hub/ })).toHaveFocus()
    expect(guestGameStore.getGameSession()).toEqual(saved)
    expect(screen.getByLabelText('Sixes: 0 points')).toBeVisible()
    expect(screen.getByLabelText('Roll 3')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing 1.*Held/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts a fresh guest game with a new ID while keeping the theme and clearing saved progress', async () => {
    const { user, container, unmount } = await resumeGuest()
    await openRestart(user)
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toHaveFocus()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    expect(screen.getByText('0/19 filled')).toBeVisible()
    expect(screen.getByText('3 of 3 remaining for this game')).toBeVisible()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'vegas', savedGame: null })
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    const saved = guestGameStore.getGameSession().savedGame
    expect(saved.gameId).not.toBe(gameId)
    expect(saved.scores).toEqual({})
    expect(saved.heldDice).toEqual(Array(5).fill(false))
    expect(saved.extraRollsUsed).toBe(0)
    unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    expect(screen.queryByLabelText('Sixes: 0 points')).not.toBeInTheDocument()
  })

  it.each(['resolve', 'reject'])('waits for an autosave to %s before deleting and prevents duplicate confirmation', async (outcome) => {
    const save = pending()
    const deletion = pending()
    const client = backend({ saveGame: jest.fn().mockReturnValueOnce(save.promise).mockResolvedValue(), deleteSavedGame: jest.fn(() => deletion.promise) })
    const user = userEvent.setup()
    render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: /Die 2 showing 2/ }))
    await waitFor(() => expect(client.saveGame).toHaveBeenCalledTimes(1))
    const dialog = await openRestart(user)
    await user.dblClick(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.getByRole('button', { name: 'Starting New Game…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Keep Playing' })).toBeDisabled()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(dialog).toBeVisible()
    expect(client.deleteSavedGame).not.toHaveBeenCalled()
    await act(async () => {
      if (outcome === 'resolve') save.resolve()
      else save.reject(new Error('Autosave failed'))
    })
    expect(client.deleteSavedGame).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Sixes: 0 points')).toBeInTheDocument()
    await act(async () => deletion.resolve())
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(client.saveScore).not.toHaveBeenCalled()
    expect(client.saveTheme).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(client.saveGame).toHaveBeenCalledTimes(2)
    expect(client.saveGame.mock.calls[1][0]).not.toBe(gameId)
    expect(client.saveGame.mock.calls[1][1]).toMatchObject({ rollCount: 1, scores: {}, extraRollsUsed: 0 })
  })

  it('keeps the current game on a deletion failure and allows retry', async () => {
    const client = backend({ deleteSavedGame: jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue() })
    const user = userEvent.setup()
    render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await openRestart(user)
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current game is still available.')
    expect(screen.getByLabelText('Roll 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Sixes: 0 points')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toHaveFocus()
    expect(client.deleteSavedGame).toHaveBeenCalledTimes(2)
    expect(client.saveScore).not.toHaveBeenCalled()
  })

  it('can start over from another Player Hub page and returns to the game', async () => {
    const client = backend()
    const user = userEvent.setup()
    const { container } = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My Top 10' }))
    await screen.findByText(/No completed games yet/)
    await openRestart(user)
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'My Top 10 Scores' })).not.toBeInTheDocument()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
  })

  it.each(['autosave', 'deletion'])('ignores a pending %s after the app unmounts', async (stage) => {
    const task = pending()
    const client = backend(stage === 'autosave'
      ? { saveGame: jest.fn(() => task.promise) }
      : { deleteSavedGame: jest.fn(() => task.promise) })
    const user = userEvent.setup()
    const { unmount } = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    if (stage === 'autosave') await user.click(screen.getByRole('button', { name: /Die 2 showing 2/ }))
    await openRestart(user)
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    unmount()
    await act(async () => task.resolve())
    expect(client.deleteSavedGame).toHaveBeenCalledTimes(stage === 'deletion' ? 1 : 0)
    expect(client.saveScore).not.toHaveBeenCalled()
  })

  it.each([0, 1])('preserves the existing completed-game New Game button %i without a confirmation', async (buttonIndex) => {
    const scores = Object.fromEntries(ALL_CATEGORIES.filter(({ id }) => id !== 'any').map(({ id }) => [id, 0]))
    const client = backend({ getGameSession: jest.fn().mockResolvedValue({ theme: 'vegas', savedGame: { ...state, gameId, rollCount: 1, scores } }) })
    const user = userEvent.setup()
    render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
    await user.click(await screen.findByRole('button', { name: 'Back to scorecard' }))
    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    expect(screen.getByRole('menuitem', { name: 'Start New Game' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getAllByRole('button', { name: 'New Game' })).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'New Game' })[buttonIndex])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    expect(client.saveScore).toHaveBeenCalledTimes(1)
    expect(client.deleteSavedGame).toHaveBeenCalledTimes(2)
    await expectRestartAvailable(user, false)
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await expectRestartAvailable(user, true)
  })
})
