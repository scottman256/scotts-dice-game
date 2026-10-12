import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import App from './App'
import { BackendApiError } from './api/backendClient'
import { ALL_CATEGORIES } from './gameRules'

const SCRATCH_PREFERENCE_KEY = 'scotts-dice-game.confirm-scratches'
const MOTION_PREFERENCE_KEY = 'scotts-dice-game.animate-rolls'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

function savedScratchGame() {
  return {
    gameId: '83d35313-a908-4516-b132-c599f460df6a',
    dice: [1, 2, 3, 4, 5],
    heldDice: [true, false, true, false, false],
    rollCount: 3,
    scores: { sixes: 6 },
    extraRollsUsed: 1,
    status: 'Roll 3 of 3. Hold any dice you want to keep, cash in, or spend one fourth-roll chance.',
    statusTone: 'normal',
  }
}

function authenticatedUser(overrides = {}) {
  return {
    id: 'auth-user',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    photoUrl: null,
    providerId: 'google',
    providerLabel: 'Google',
    ...overrides,
  }
}

function almostCompleteGame() {
  return {
    ...savedScratchGame(),
    rollCount: 1,
    scores: Object.fromEntries(ALL_CATEGORIES.filter(({ id }) => id !== 'any').map(({ id }) => [id, 0])),
  }
}

function deferredScore() {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject })
  return { promise, resolve, reject }
}

async function finishAuthenticatedGame(saveScore) {
  const backendClient = createMockBackendClient({
    restoredUser: authenticatedUser(),
    getGameSession: jest.fn(() => Promise.resolve({ theme: 'vegas', savedGame: almostCompleteGame() })),
    saveScore,
  })
  const user = userEvent.setup()
  const rendered = render(<App backendClient={backendClient} />)
  await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
  await user.click(screen.getByRole('button', { name: 'Score 15 points in Any' }))
  return { ...rendered, user, backendClient }
}

function createMockAuthService({
  isConfigured = true,
  initialUser = null,
  signIn = jest.fn(),
  signOut = jest.fn(() => Promise.resolve()),
} = {}) {
  let onUserChanged
  let onObserverError
  const unsubscribe = jest.fn()
  const service = {
    isConfigured,
    subscribe: jest.fn((userCallback, errorCallback) => {
      onUserChanged = userCallback
      onObserverError = errorCallback
      userCallback(initialUser)
      return unsubscribe
    }),
    signIn,
    signOut,
    getIdToken: jest.fn(() => Promise.resolve('firebase-id-token')),
  }

  return {
    service,
    unsubscribe,
    emitUser(user) {
      onUserChanged(user)
    },
    emitError(error = new Error('observer failed')) {
      onObserverError(error)
    },
  }
}

function createMockBackendClient({
  status = { available: true, manualAuthEnabled: true, socialAuthEnabled: true },
  restoredUser = null,
  register = jest.fn(),
  login = jest.fn(),
  loginWithFirebase = jest.fn(),
  signOut = jest.fn(() => Promise.resolve()),
  saveScore = jest.fn(),
  getPersonalScores = jest.fn(() => Promise.resolve([])),
  getCompletedGame = jest.fn(),
  getLeaderboard = jest.fn(() => Promise.resolve([])),
  getGameStats = jest.fn(() => Promise.resolve({
    gamesPlayed: 0,
    activeDays: 0,
    longestPlayStreak: 0,
    favoriteTheme: null,
    highScore: null,
    lowScore: null,
    averageScore: null,
    medianScore: null,
    averageScratchesPerGame: null,
    achievementsUnlocked: 0,
    gamesAtLeast500: 0,
    gamesAtLeast600: 0,
    fiveOfAKindsScored: 0,
    firstRollFiveOfAKinds: 0,
    firstTopBonuses: 0,
    secondTopBonuses: 0,
    fiveOfAKindBonuses: 0,
    totalPoints: 0,
  })),
  getAchievements = jest.fn(() => Promise.resolve({ capacity: 36, achievements: [] })),
  getGameSession = jest.fn(() => Promise.resolve({ theme: 'classic', savedGame: null })),
  saveTheme = jest.fn(() => Promise.resolve({ theme: 'classic' })),
  saveGame = jest.fn(() => Promise.resolve()),
  deleteSavedGame = jest.fn(() => Promise.resolve()),
  getAdminThemes = jest.fn(() => Promise.resolve({ themes: [] })),
  updateAdminTheme = jest.fn(() => Promise.resolve({ themes: [] })),
  getAdminUsers = jest.fn(() => Promise.resolve([])),
  deleteAdminUser = jest.fn(() => Promise.resolve()),
  changeAdminUserPassword = jest.fn(() => Promise.resolve()),
  changeAdminUserEmail = jest.fn(() => Promise.resolve()),
  addAdminSystemScore = jest.fn(() => Promise.resolve()),
  deleteAdminScore = jest.fn(() => Promise.resolve()),
  resetAdminGameData = jest.fn(() => Promise.resolve()),
} = {}) {
  return {
    knownUnavailable: false,
    checkAvailability: jest.fn(() => Promise.resolve(status)),
    restoreSession: jest.fn(() => Promise.resolve(restoredUser)),
    register,
    login,
    loginWithFirebase,
    signOut,
    saveScore,
    getPersonalScores,
    getCompletedGame,
    getLeaderboard,
    getGameStats,
    getAchievements,
    getGameSession,
    saveTheme,
    saveGame,
    deleteSavedGame,
    getAdminThemes,
    updateAdminTheme,
    getAdminUsers,
    deleteAdminUser,
    changeAdminUserPassword,
    changeAdminUserEmail,
    addAdminSystemScore,
    deleteAdminScore,
    resetAdminGameData,
  }
}

describe('end-of-game results', () => {
  const result = {
    personalRank: 3, totalGames: 47, newHighScore: false, tiedRank: false,
    unlockedAchievements: [{ key: 'first-game', title: 'First Finish', description: 'Completed your first game.' }],
  }

  it('shows returned badges and ranking, saves once, and retains the summary on the final-score panel', async () => {
    const pending = deferredScore()
    const saveScore = jest.fn(() => pending.promise)
    const { container, user, backendClient } = await finishAuthenticatedGame(saveScore)
    const dialog = screen.getByRole('dialog', { name: 'Game Complete' })
    expect(dialog).toHaveTextContent('Saving your score and checking achievements')
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()

    await act(async () => pending.resolve(result))

    expect(dialog).toHaveTextContent('3rd best score out of the 47 games you played.')
    expect(within(dialog).getByText('First Finish')).toBeVisible()
    expect(dialog.closest('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(saveScore).toHaveBeenCalledTimes(1)
    expect(saveScore).toHaveBeenCalledWith(almostCompleteGame().gameId, 15, { ...almostCompleteGame().scores, any: 15 }, 'vegas')
    expect(backendClient.deleteSavedGame).toHaveBeenCalledTimes(1)
    expect(backendClient.getAchievements).not.toHaveBeenCalled()
    expect(backendClient.getGameStats).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Back to scorecard' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('.final-score-display')).toHaveTextContent('First Finish')
    await user.click(screen.getAllByRole('button', { name: 'New Game' })[0])
    expect(screen.queryByText('First Finish')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
  })

  it('shows the ranking alone when no achievements unlocked, including a tied personal best', async () => {
    await finishAuthenticatedGame(jest.fn(() => Promise.resolve({
      ...result, personalRank: 1, totalGames: 8, tiedRank: true, unlockedAchievements: [],
    })))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('You tied for the 1st best score out of the 8 games you played.')
    expect(within(dialog).queryByRole('region', { name: 'Achievements unlocked this game' })).not.toBeInTheDocument()
    expect(screen.queryByText('NEW HIGH SCORE')).not.toBeInTheDocument()
  })

  it('preserves the existing new-high-score announcement', async () => {
    await finishAuthenticatedGame(jest.fn(() => Promise.resolve({ ...result, personalRank: 1, newHighScore: true })))
    expect(within(screen.getByRole('dialog')).getByText('NEW HIGH SCORE')).toBeVisible()
    expect(screen.getAllByText('NEW HIGH SCORE')).toHaveLength(2)
  })

  it('keeps the scorecard available and saved progress intact if submitting the score fails', async () => {
    const { user, backendClient } = await finishAuthenticatedGame(jest.fn(() => Promise.reject(new Error('Offline'))))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Your score could not be saved. Your ranking and new achievements are unavailable.')
    expect(dialog).toHaveTextContent('Final score15')
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Back to scorecard' }))
    expect(screen.getByRole('alert')).toHaveTextContent('the score could not be saved')
    expect(screen.getAllByRole('button', { name: 'New Game' })[0]).toBeEnabled()
  })

  it.each(['resolve', 'reject'])('ignores a late %s after a new game begins', async (outcome) => {
    const pending = deferredScore()
    const { user, backendClient } = await finishAuthenticatedGame(jest.fn(() => pending.promise))
    await user.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    await user.click(screen.getAllByRole('button', { name: 'New Game' })[0])
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await act(async () => pending[outcome](outcome === 'resolve' ? result : new Error('Offline')))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('First Finish')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    // Starting the new game clears old progress once; the old response must not clear the new roll.
    expect(backendClient.deleteSavedGame).toHaveBeenCalledTimes(1)
    expect(backendClient.saveGame).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'])('ignores a late %s after signing out and starting a guest session', async (outcome) => {
    const pending = deferredScore()
    const { user, backendClient } = await finishAuthenticatedGame(jest.fn(() => pending.promise))
    await user.click(screen.getByRole('button', { name: 'Back to scorecard' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await act(async () => pending[outcome](outcome === 'resolve' ? result : new Error('Offline')))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
  })

  it('ignores a response after the app unmounts', async () => {
    const pending = deferredScore()
    const { unmount, backendClient } = await finishAuthenticatedGame(jest.fn(() => pending.promise))
    unmount()
    await act(async () => pending.resolve(result))
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
  })

  it('gives guests a final-score summary without making authenticated requests or inventing history', async () => {
    localStorage.setItem(SCRATCH_PREFERENCE_KEY, 'false')
    const backendClient = createMockBackendClient()
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)
    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    for (let turn = 0; turn < ALL_CATEGORIES.length; turn++) {
      for (let roll = 0; roll < 3; roll++) fireEvent.click(container.querySelector('.roll-button'))
      fireEvent.click(container.querySelector('.score-coin:not(:disabled)'))
    }
    const dialog = screen.getByRole('dialog', { name: 'Game Complete' })
    expect(within(dialog).getByRole('status')).toHaveTextContent(/^The game is over\.$/)
    expect(within(dialog).queryByRole('list')).not.toBeInTheDocument()
    expect(backendClient.saveScore).not.toHaveBeenCalled()
    expect(backendClient.getAchievements).not.toHaveBeenCalled()
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
  })
})

describe('App authentication shell', () => {
  it('views a past scorecard in its saved theme without changing current progress or preferences', async () => {
    const categoryScores = Object.fromEntries(ALL_CATEGORIES.map(({ id }) => [id, id === 'fiveKind' ? 75 : 0]))
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn().mockResolvedValue({ theme: 'fire', savedGame: savedScratchGame() }),
      getPersonalScores: jest.fn().mockResolvedValue([
        { scoreId: 'past-game', rank: 1, score: 75, playerName: 'Ada', completedAt: '2026-10-11T12:00:00Z' },
      ]),
      getCompletedGame: jest.fn().mockResolvedValue({ score: 75, theme: 'vegas', categoryScores, scorecardAvailable: true }),
    })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: /Die 2 showing 2/ }))
    await waitFor(() => expect(backendClient.saveGame).toHaveBeenCalled())
    const savesBefore = backendClient.saveGame.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My Top 10' }))
    await user.click(await screen.findByRole('link', { name: '75' }))
    expect(await screen.findByLabelText('5 of a Kind: 75 points')).toBeVisible()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll Dice|Use 4th Roll/ })).not.toBeInTheDocument()
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    await user.click(screen.getAllByRole('button', { name: 'Back to My Top 10' })[0])
    expect(screen.getByRole('link', { name: '75' })).toHaveFocus()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')
    await user.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(screen.getByLabelText('Sixes: 6 points')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing 1.*Held/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Use 4th Roll (2 left)' })).toBeVisible()
    expect(backendClient.saveGame).toHaveBeenCalledTimes(savesBefore)
    expect(backendClient.saveTheme).not.toHaveBeenCalled()
    expect(backendClient.saveScore).not.toHaveBeenCalled()
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My Top 10' }))
    await user.click(await screen.findByRole('link', { name: '75' }))
    await screen.findByLabelText('5 of a Kind: 75 points')
    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Top 10 Overall' }))
    expect(await screen.findByRole('heading', { name: 'Top 10 Overall' })).toBeVisible()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')
  })

  it('offers only guest play when the backend is unavailable', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ready to roll?' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Facebook' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with username or email' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    expect(screen.getByText('The game service is offline. Guest play still works normally.')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your Roll' })).not.toBeInTheDocument()
  })

  it('opens the complete game guide from the login page and returns to sign-in', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('link', { name: /Learn how to play and score/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'How to Play' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Know what every roll is worth' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your game is ready when you return' }))
      .not.toBeInTheDocument()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
  })

  it('starts a guest game and offers to resume or start over after returning', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(screen.getByRole('heading', { level: 1, name: "Scott's Dice Game" })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scorecard' })).toBeVisible()
    expect(screen.getByText('Guest Player')).toBeVisible()
    expect(screen.getByText('Local guest session')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'How to Play' }))
    expect(screen.getByRole('heading', { level: 1, name: 'How to Play' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your game is ready when you return' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to game' }))

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    await user.click(screen.getByRole('link', { name: /Return to sign in/ }))

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your Roll' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(screen.getByRole('dialog', { name: 'Welcome back!' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Start New Game' }))
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
  })

  it('checks the backend and unsubscribes from Firebase on unmount', async () => {
    const auth = createMockAuthService()
    const backendClient = createMockBackendClient()
    const { unmount } = render(<App authService={auth.service} backendClient={backendClient} />)

    expect(screen.getByRole('main', { name: 'Loading account' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to the game service…')
    expect(await screen.findByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(backendClient.checkAvailability).toHaveBeenCalledTimes(1)
    expect(backendClient.restoreSession).toHaveBeenCalledTimes(1)
    expect(auth.service.subscribe).toHaveBeenCalledTimes(1)

    unmount()
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('enables username and social choices when the backend is online', async () => {
    const auth = createMockAuthService()
    const backendClient = createMockBackendClient()
    render(<App authService={auth.service} backendClient={backendClient} />)

    expect(await screen.findByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue with username or email' })).toBeEnabled()
  })

  it('restores a persisted backend account into the game navbar', async () => {
    const backendClient = createMockBackendClient({ restoredUser: authenticatedUser() })
    render(<App backendClient={backendClient} />)

    expect(await screen.findByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.com')).toBeVisible()
    expect(screen.getByRole('button', { name: /Player Hub/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
    expect(screen.queryByRole('link', { name: /Return to sign in/ })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'How to Play' }))
    expect(screen.getByRole('heading', { name: 'Your game is ready when you return' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Shape the whole game room' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
  })

  it('offers to resume and restores the saved theme, dice, holds, and scorecard', async () => {
    const savedGame = {
      gameId: '83d35313-a908-4516-b132-c599f460df6a',
      dice: [6, 5, 4, 3, 2],
      heldDice: [true, false, true, false, false],
      rollCount: 2,
      scores: { ones: 2 },
      extraRollsUsed: 1,
      status: 'Roll 2 of 3. Hold dice, roll again, or cash in a qualifying score.',
      statusTone: 'normal',
      updatedAt: '2026-07-29T12:00:00Z',
    }
    const getGameSession = jest.fn(() => Promise.resolve({ theme: 'fire', savedGame }))
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession,
    })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    const dialog = await screen.findByRole('dialog', { name: 'Welcome back!' })
    expect(dialog).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue Last Game' })).toHaveFocus()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')

    await user.click(screen.getByRole('button', { name: 'Continue Last Game' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 2')).toBeVisible()
    expect(screen.getByLabelText('Dice total 20')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing 6.*Held/ }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Ones: 2 points')).toBeVisible()
  })

  it('deletes saved progress when the returning player starts a new game', async () => {
    const deleteSavedGame = jest.fn(() => Promise.resolve())
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn(() => Promise.resolve({
        theme: 'cosmic-galaxy',
        savedGame: {
          gameId: '2f180d38-7ff8-45de-838f-9bec3784ca5d',
          dice: [1, 2, 3, 4, 5],
          heldDice: [false, false, false, false, false],
          rollCount: 1,
          scores: {},
          extraRollsUsed: 0,
          status: 'Roll 1 of 3.',
          statusTone: 'normal',
        },
      })),
      deleteSavedGame,
    })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Start New Game' }))

    await waitFor(() => expect(deleteSavedGame).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    expect(container.querySelector('.game-session'))
      .toHaveAttribute('data-game-theme', 'cosmic-galaxy')
  })

  it('autosaves authenticated progress after a roll and persists theme changes', async () => {
    const saveGame = jest.fn(() => Promise.resolve())
    const saveTheme = jest.fn(() => Promise.resolve({ theme: 'vegas' }))
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      saveGame,
      saveTheme,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Roll Dice' }))

    await waitFor(() => expect(saveGame).toHaveBeenCalledTimes(1))
    expect(saveGame).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dice: expect.arrayContaining([expect.any(Number)]),
        heldDice: [false, false, false, false, false],
        rollCount: 1,
        scores: {},
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Vegas/ }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))

    await waitFor(() => expect(saveTheme).toHaveBeenCalledWith('vegas'))
  })

  it('never calls game persistence APIs during guest play', async () => {
    const backendClient = createMockBackendClient()
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    await user.click(screen.getByRole('link', { name: 'How to Play' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')
    expect(screen.getByRole('heading', { level: 1, name: 'How to Play' })).toBeVisible()
    expect(backendClient.getGameSession).not.toHaveBeenCalled()
    expect(backendClient.saveGame).not.toHaveBeenCalled()
    expect(backendClient.saveTheme).not.toHaveBeenCalled()
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
  })

  it('leaves a scratch unsaved until confirmed and preserves the current turn when canceled', async () => {
    const savedGame = savedScratchGame()
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn(() => Promise.resolve({ theme: 'vegas', savedGame })),
    })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    await user.click(screen.getByRole('button', { name: 'Record zero points in Full House' }))

    const dialog = screen.getByRole('dialog', { name: 'Score zero in this category?' })
    expect(dialog).toHaveTextContent('Full House')
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(backendClient.saveGame).not.toHaveBeenCalled()
    expect(backendClient.saveScore).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 3')).toBeVisible()
    expect(screen.getByLabelText('Dice total 15')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing 1.*Held/ }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Sixes: 6 points')).toBeVisible()
    expect(screen.getByText('2 of 3 remaining for this game')).toBeVisible()
    expect(screen.queryByLabelText('Full House: 0 points')).not.toBeInTheDocument()
    expect(backendClient.saveGame).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Record zero points in Full House' }))
    await user.click(screen.getByRole('button', { name: 'Score zero' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Full House: 0 points')).toBeVisible()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()
    await waitFor(() => expect(backendClient.saveGame).toHaveBeenCalledTimes(1))
    expect(backendClient.saveGame).toHaveBeenCalledWith(savedGame.gameId, expect.objectContaining({
      dice: [null, null, null, null, null],
      heldDice: [false, false, false, false, false],
      rollCount: 0,
      scores: { sixes: 6, fullHouse: 0 },
      extraRollsUsed: 1,
    }))
    expect(backendClient.saveScore).not.toHaveBeenCalled()
  })

  it('lets a guest disable confirmations for immediate scratches and enable them again', async () => {
    const backendClient = createMockBackendClient()
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    const confirmationPreference = screen.getByRole('checkbox', { name: 'Confirm before scratching' })
    expect(confirmationPreference).toBeChecked()
    await user.click(confirmationPreference)
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    expect(localStorage.getItem(SCRATCH_PREFERENCE_KEY)).toBe('false')

    jest.spyOn(Math, 'random').mockReturnValue(0)
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))
    await user.click(screen.getByRole('button', { name: 'Record zero points in Twos' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Twos: 0 points')).toBeVisible()
    expect(screen.getByLabelText('Turn not started')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).not.toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))
    await user.click(screen.getByRole('button', { name: 'Record zero points in Threes' }))

    expect(screen.getByRole('dialog', { name: 'Score zero in this category?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Twos: 0 points')).toBeVisible()
    expect(screen.queryByLabelText('Threes: 0 points')).not.toBeInTheDocument()
    expect(backendClient.saveGame).not.toHaveBeenCalled()
    expect(backendClient.saveTheme).not.toHaveBeenCalled()
  })

  it('keeps the browser preference across a remount and authenticated theme restoration', async () => {
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn(() => Promise.resolve({ theme: 'fire', savedGame: savedScratchGame() })),
    })
    const user = userEvent.setup()
    const firstApp = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    firstApp.unmount()

    const { container } = render(<App backendClient={backendClient} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Record zero points in Full House' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Full House: 0 points')).toBeVisible()
    await waitFor(() => expect(backendClient.saveGame).toHaveBeenCalledTimes(1))
  })

  it.each([
    ['username', 'test'],
    ['email address', 'test@test.com'],
  ])('signs in with the seeded account using its %s', async (_kind, identifier) => {
    const manualUser = authenticatedUser({
      id: 'manual-user',
      name: 'test',
      email: 'test@test.com',
      providerId: 'manual',
      providerLabel: 'Username',
    })
    const login = jest.fn(() => Promise.resolve(manualUser))
    const backendClient = createMockBackendClient({
      status: { available: true, manualAuthEnabled: true, socialAuthEnabled: false },
      login,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue with username or email' }))
    await user.type(screen.getByLabelText('Username or email address'), identifier)
    await user.type(screen.getByLabelText('Password'), 'test')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith({ identifier, password: 'test' })
    expect(await screen.findByText('test')).toBeVisible()
    expect(screen.getByText('test@test.com')).toBeVisible()
  })

  it('exchanges a Firebase token with the backend after Google sign-in', async () => {
    const signIn = jest.fn(() => Promise.resolve())
    const auth = createMockAuthService({ initialUser: null, signIn })
    const loginWithFirebase = jest.fn(() => Promise.resolve(authenticatedUser()))
    const backendClient = createMockBackendClient({ loginWithFirebase })
    const user = userEvent.setup()
    render(<App authService={auth.service} backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }))

    expect(signIn).toHaveBeenCalledWith('google')
    expect(auth.service.getIdToken).toHaveBeenCalledWith(true)
    expect(loginWithFirebase).toHaveBeenCalledWith('firebase-id-token')
    expect(await screen.findByText('Ada Lovelace')).toBeVisible()
  })

  it('displays backend login errors without leaving the landing page', async () => {
    const login = jest.fn(() => Promise.reject(new BackendApiError(
      'The username, email address, or password is incorrect.',
      { code: 'INVALID_CREDENTIALS', status: 401 },
    )))
    const backendClient = createMockBackendClient({
      status: { available: true, manualAuthEnabled: true, socialAuthEnabled: false },
      login,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue with username or email' }))
    await user.type(screen.getByLabelText('Username or email address'), 'nobody@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The username, email address, or password is incorrect.',
    )
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('signs out through the backend and returns to the landing page', async () => {
    const signOut = jest.fn(() => Promise.resolve())
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser({ providerId: 'manual', providerLabel: 'Username' }),
      signOut,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
  })

  it('switches among scores, stats, and achievements through the Player Hub', async () => {
    const getPersonalScores = jest.fn(() => Promise.resolve([{
      scoreId: 9,
      rank: 1,
      playerName: 'Ada Lovelace',
      score: 842,
      completedAt: '2026-07-28T12:00:00Z',
    }]))
    const getLeaderboard = jest.fn(() => Promise.resolve([{
      scoreId: 10,
      rank: 1,
      playerName: 'Sir Rolls-a-Lot',
      score: 499,
      completedAt: '2026-07-27T12:00:00Z',
    }]))
    const getGameStats = jest.fn(() => Promise.resolve({
      gamesPlayed: 2,
      activeDays: 2,
      longestPlayStreak: 2,
      favoriteTheme: 'classic',
      highScore: 410,
      lowScore: 275,
      averageScore: 342.5,
      medianScore: 342.5,
      averageScratchesPerGame: 7.5,
      achievementsUnlocked: 4,
      gamesAtLeast500: 0,
      gamesAtLeast600: 0,
      fiveOfAKindsScored: 2,
      firstRollFiveOfAKinds: 0,
      firstTopBonuses: 2,
      secondTopBonuses: 1,
      fiveOfAKindBonuses: 1,
      totalPoints: 685,
    }))
    const getAchievements = jest.fn(() => Promise.resolve({
      capacity: 36,
      achievements: [{
        key: 'first-game',
        title: 'First Finish',
        description: 'Completed your first game.',
        achievedAt: '2026-07-28T12:00:00Z',
      }],
    }))
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getPersonalScores,
      getLeaderboard,
      getGameStats,
      getAchievements,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My Top 10' }))

    expect(await screen.findByRole('heading', { name: 'My Top 10 Scores' })).toBeVisible()
    expect(getPersonalScores).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('cell', { name: '842' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    expect(screen.getByRole('menuitem', { name: 'My Top 10' }))
      .toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('menuitem', { name: 'Top 10 Overall' }))

    expect(await screen.findByRole('heading', { name: 'Top 10 Overall' })).toBeVisible()
    expect(getLeaderboard).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('cell', { name: 'Sir Rolls-a-Lot' })).toBeVisible()
    expect(screen.getByRole('cell', { name: '499' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Game Stats' }))

    expect(await screen.findByRole('heading', { name: 'Game Stats' })).toBeVisible()
    expect(getGameStats).toHaveBeenCalledTimes(1)
    expect(screen.getByText('685')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /Player Hub/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Achievements' }))

    expect(await screen.findByRole('heading', { name: 'Achievements' })).toBeVisible()
    expect(getAchievements).toHaveBeenCalledTimes(1)
    expect(screen.getByText('First Finish')).toBeVisible()
    expect(screen.getAllByRole('cell')).toHaveLength(36)
  })

  it('exposes admin settings and user management only to an admin account', async () => {
    const getAdminThemes = jest.fn(() => Promise.resolve({
      themes: [
        { id: 'classic', enabled: true },
        { id: 'candy-kingdom', enabled: true },
      ],
    }))
    const getAdminUsers = jest.fn(() => Promise.resolve([{
      id: 'admin-user',
      name: 'admin',
      username: 'admin',
      email: 'admin@admin.com',
      providerId: 'manual',
      providerLabel: 'Username',
      admin: true,
      canChangePassword: true,
      canChangeEmail: true,
      canDelete: false,
      createdAt: '2026-08-03T12:00:00Z',
    }]))
    const changeAdminUserEmail = jest.fn(() => Promise.resolve())
    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser({
        id: 'admin-user', name: 'admin', email: 'admin@admin.com', providerId: 'manual', providerLabel: 'Username', admin: true,
      }),
      getAdminThemes,
      getAdminUsers,
      changeAdminUserEmail,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('link', { name: 'How to Play' }))
    expect(screen.getByRole('heading', { name: 'Your game is ready when you return' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Shape the whole game room' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back to game' }))

    await user.click(await screen.findByRole('button', { name: /^Admin/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Admin Settings' }))
    expect(await screen.findByRole('heading', { name: 'Admin Settings' })).toBeVisible()
    expect(getAdminThemes).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^Admin/ }))
    await user.click(screen.getByRole('menuitem', { name: 'User Accounts' }))
    expect(await screen.findByRole('heading', { name: 'User Accounts' })).toBeVisible()
    expect(await screen.findByText('Current account')).toBeVisible()
    expect(getAdminUsers).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Change email' }))
    const emailInput = screen.getByLabelText('Email address')
    await user.clear(emailInput)
    await user.type(emailInput, 'new-admin@example.com')
    await user.click(screen.getByRole('button', { name: 'Update email' }))
    expect(changeAdminUserEmail).toHaveBeenCalledWith('admin-user', { email: 'new-admin@example.com' })
    expect(await screen.findAllByText('new-admin@example.com')).toHaveLength(2)
  })

  it('returns a persisted disabled theme to Classic when the session loads', async () => {
    localStorage.setItem(SCRATCH_PREFERENCE_KEY, 'false')
    const backendClient = createMockBackendClient({
      status: {
        available: true,
        manualAuthEnabled: true,
        socialAuthEnabled: false,
        enabledThemes: ['classic'],
      },
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn(() => Promise.resolve({ theme: 'fire', savedGame: null })),
    })
    const { container } = render(<App backendClient={backendClient} />)
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Roll Dice' })).toBeVisible()
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).not.toBeChecked()
  })

  it('changes roll motion mid-turn without losing holds and animates only subsequent rolls', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: /Die 1 showing/ }))
    const heldLabel = screen.getByRole('button', { name: /Die 1 showing/ }).getAttribute('aria-label')

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    expect(localStorage.getItem(MOTION_PREFERENCE_KEY)).toBe('false')
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    expect(screen.getByRole('button', { name: heldLabel })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 2')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    expect(localStorage.getItem(MOTION_PREFERENCE_KEY)).toBe('true')
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Roll Again (1 left)' }))
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(4)
    expect(screen.getByRole('button', { name: heldLabel })).toHaveAttribute('aria-pressed', 'true')
  })

  it('remembers disabled roll motion across a remount and authenticated game restoration', async () => {
    const user = userEvent.setup()
    const firstApp = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    firstApp.unmount()

    const backendClient = createMockBackendClient({
      restoredUser: authenticatedUser(),
      getGameSession: jest.fn(() => Promise.resolve({ theme: 'vegas', savedGame: savedScratchGame() })),
    })
    const { container } = render(<App backendClient={backendClient} />)
    await user.click(await screen.findByRole('button', { name: 'Continue Last Game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'vegas')
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use 4th Roll (2 left)' }))
    expect(screen.getByLabelText('Roll 4')).toBeVisible()
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    await waitFor(() => expect(backendClient.saveGame).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Animate dice rolls' })).not.toBeChecked()
  })

  it('does not replay a roll when returning from settings with motion still enabled', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Roll Again (2 left)' }))
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
  })

  it('changes theme mid-game without losing the current roll or held dice', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    const gameSession = container.querySelector('.game-session')
    expect(gameSession).toHaveAttribute('data-game-theme', 'classic')
    expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', 'classic')

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    const firstDie = screen.getByRole('button', { name: /Die 1 showing .*Click to hold/ })
    await user.click(firstDie)
    expect(firstDie).toHaveAttribute('aria-pressed', 'true')

    const settingsButton = screen.getByRole('button', { name: 'Game settings' })
    await user.click(settingsButton)

    expect(screen.getByRole('heading', { name: 'Game settings' })).toHaveFocus()
    expect(settingsButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Roll 1')).not.toBeVisible()

    await user.click(screen.getByRole('radio', { name: /Rainbow/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    expect(gameSession).toHaveAttribute('data-game-theme', 'classic')
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))

    expect(gameSession).toHaveAttribute('data-game-theme', 'rainbow')
    expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', 'rainbow')
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing .*Held/ }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Roll Again (2 left)' })).toBeEnabled()
    expect(settingsButton).toHaveFocus()
    expect(settingsButton).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem(SCRATCH_PREFERENCE_KEY)).toBe('false')
  })

  it.each([
    ['Fire', 'fire'],
    ['Beach', 'beach'],
    ['Sky', 'sky'],
    ['Christmas', 'christmas'],
    ['Halloween', 'halloween'],
    ['Golden', 'golden'],
    ['Retro Arcade', 'retro-arcade'],
    ['Vegas', 'vegas'],
    ['American', 'american'],
    ['Cosmic Galaxy', 'cosmic-galaxy'],
    ['60s Tie-Dye', 'sixties-tie-dye'],
    ['World Traveler', 'world-traveler'],
    ['Clockwork', 'clockwork'],
    ['Baseball', 'baseball'],
    ['Candy Kingdom', 'candy-kingdom'],
    ['Frozen Crystal', 'frozen-crystal'],
    ['Deep Sea', 'deep-sea'],
    ['Jungle Adventure', 'jungle-adventure'],
  ])('applies the %s style after it is saved', async (themeLabel, themeId) => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: new RegExp(themeLabel) }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', themeId)
    expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', themeId)
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
  })

  it('discards draft preferences and returns focus to settings when canceled', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    const settingsButton = screen.getByRole('button', { name: 'Game settings' })
    await user.click(settingsButton)
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
    expect(settingsButton).toHaveFocus()
    expect(localStorage.getItem(SCRATCH_PREFERENCE_KEY)).toBeNull()
    expect(localStorage.getItem(MOTION_PREFERENCE_KEY)).toBeNull()
    await user.click(settingsButton)
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Animate dice rolls' })).toBeChecked()
  })

  it('keeps the guest theme and browser preferences after returning to sign-in', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Beach/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'beach')

    await user.click(screen.getByRole('link', { name: /Return to sign in/ }))
    expect(container.querySelector('.game-session')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'beach')
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Animate dice rolls' })).not.toBeChecked()
  })

  it('resets to Classic but keeps browser preferences after an authenticated user signs out', async () => {
    const backendClient = createMockBackendClient({ restoredUser: authenticatedUser() })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirm before scratching' }))
    await user.click(screen.getByRole('checkbox', { name: 'Animate dice rolls' }))
    await user.click(screen.getByRole('button', { name: 'Save settings & return to game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(container.querySelector('.game-session')).not.toBeInTheDocument()
    expect(localStorage.getItem(SCRATCH_PREFERENCE_KEY)).toBe('false')
    expect(localStorage.getItem(MOTION_PREFERENCE_KEY)).toBe('false')
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    expect(screen.getByRole('checkbox', { name: 'Confirm before scratching' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Animate dice rolls' })).not.toBeChecked()
  })
})
