import React from 'react'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { guestGameStore } from './persistence/guestGameStore'
import { createInitialGameState } from './gameState'
import { ALL_CATEGORIES } from './gameRules'

const KEY = 'scotts-dice-game.guest-session'
const gameId = '83d35313-a908-4516-b132-c599f460df6a'
const savedState = createInitialGameState({
  dice: [1, 2, 3, 4, 5], heldDice: [true, false, true, false, false],
  rollCount: 3, scores: { sixes: 0 }, extraRollsUsed: 1,
})

function backend({ online = false, signedIn = false, enabledThemes = null } = {}) {
  return {
    checkAvailability: jest.fn().mockResolvedValue({ available: online, manualAuthEnabled: true, socialAuthEnabled: false, enabledThemes }),
    restoreSession: jest.fn().mockResolvedValue(signedIn ? { id: 'member', name: 'Member', providerId: 'manual' } : null),
    getGameSession: jest.fn().mockResolvedValue({ theme: 'fire', savedGame: null }),
    saveGame: jest.fn().mockResolvedValue(),
    saveTheme: jest.fn().mockResolvedValue(),
    deleteSavedGame: jest.fn().mockResolvedValue(),
    saveScore: jest.fn().mockResolvedValue(),
    signOut: jest.fn().mockResolvedValue(),
  }
}

function expectNoAccountWrites(client) {
  for (const method of ['saveGame', 'saveTheme', 'deleteSavedGame', 'saveScore']) {
    expect(client[method]).not.toHaveBeenCalled()
  }
}

beforeEach(() => localStorage.clear())
afterEach(() => { jest.restoreAllMocks(); localStorage.clear() })

describe('guest game recovery', () => {
  it('autosaves rolls, holds, scratches, extra rolls, and theme and restores them after a refresh while offline', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.2)
    const client = backend()
    const user = userEvent.setup()
    const first = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))
    const beforeScratch = localStorage.getItem(KEY)
    await user.click(screen.getByRole('button', { name: 'Record zero points in Ones' }))
    expect(localStorage.getItem(KEY)).toBe(beforeScratch)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(KEY)).toBe(beforeScratch)
    await user.click(screen.getByRole('button', { name: 'Record zero points in Ones' }))
    await user.click(screen.getByRole('button', { name: 'Score zero' }))
    expect(guestGameStore.getGameSession().savedGame).toMatchObject({ rollCount: 0, scores: { ones: 0 } })
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: /Die 1 showing 2/ }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))
    await user.click(screen.getByRole('button', { name: 'Use 4th Roll (3 left)' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Vegas/ }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    const saved = guestGameStore.getGameSession()
    expect(saved).toMatchObject({ theme: 'vegas', savedGame: {
      rollCount: 4, extraRollsUsed: 1, heldDice: [true, false, false, false, false], scores: { ones: 0 },
    } })
    first.unmount()

    const second = render(<App backendClient={client} />)
    expect(await screen.findByRole('button', { name: 'Continue as Guest' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(screen.getByRole('dialog', { name: 'Welcome back!' })).toBeVisible()
    expect(screen.getByText('1/19 filled')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue Last Game' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Roll Dice' })).not.toBeInTheDocument()
    expect(second.container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))
    expect(screen.getByLabelText('Roll 4')).toBeVisible()
    expect(screen.getByLabelText('Ones: 0 points')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing 2.*Held/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cash In a Score' })).toBeDisabled()
    expect(guestGameStore.getGameSession()).toEqual(saved)
    expectNoAccountWrites(client)
    expect(client.getGameSession).not.toHaveBeenCalled()
  })

  it('discards a guest save when starting over, retains its theme, and does not prompt again', async () => {
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, savedState)
    const client = backend({ online: true })
    const user = userEvent.setup()
    const first = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'vegas', savedGame: null })
    first.unmount()
    const second = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(second.container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expectNoAccountWrites(client)
  })

  it('keeps a save intact when the page closes before a resume decision', async () => {
    guestGameStore.saveGame(gameId, savedState)
    const saved = localStorage.getItem(KEY)
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    unmount()
    expect(localStorage.getItem(KEY)).toBe(saved)
  })

  it('clears completed guest progress while preserving the theme for the next game', async () => {
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, {
      ...savedState, rollCount: 1,
      scores: Object.fromEntries(ALL_CATEGORIES.filter(({ id }) => id !== 'any').map(({ id }) => [id, 0])),
    })
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
    expect(screen.getByRole('dialog', { name: 'Game Complete' })).toBeVisible()
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'vegas', savedGame: null })
    first.unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
  })

  it('keeps guest progress separate from a signed-in account and its saves', async () => {
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, savedState)
    const storedGuest = localStorage.getItem(KEY)
    const client = backend({ online: true, signedIn: true })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={client} />)
    await user.click(await screen.findByRole('button', { name: 'Roll Dice' }))
    await waitFor(() => expect(client.saveGame).toHaveBeenCalledTimes(1))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')
    expect(localStorage.getItem(KEY)).toBe(storedGuest)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(screen.getByLabelText('Sixes: 0 points')).toBeVisible()
    expect(localStorage.getItem(KEY)).toBe(storedGuest)
    expect(client.getGameSession).toHaveBeenCalledTimes(1)
  })

  it('uses Classic when a saved theme is disabled while retaining guest progress', async () => {
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, savedState)
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backend({ online: true, enabledThemes: ['classic'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
    expect(screen.getByRole('dialog', { name: 'Welcome back!' })).toBeVisible()
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'classic', savedGame: { gameId, ...savedState } })
  })

  it('starts normally with corrupt data and replaces it on the next roll', async () => {
    localStorage.setItem(KEY, 'broken JSON')
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(guestGameStore.getGameSession().savedGame.rollCount).toBe(1)
  })

  it('still lets guests play if browser storage is blocked', async () => {
    jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Storage blocked') })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
