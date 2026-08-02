import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import App from './App'
import { BackendApiError } from './api/backendClient'

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
  getLeaderboard = jest.fn(() => Promise.resolve([])),
  getGameStats = jest.fn(() => Promise.resolve({
    gamesPlayed: 0,
    highScore: null,
    lowScore: null,
    averageScore: null,
    medianScore: null,
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
    getLeaderboard,
    getGameStats,
    getAchievements,
    getGameSession,
    saveTheme,
    saveGame,
    deleteSavedGame,
  }
}

describe('App authentication shell', () => {
  it('offers only guest play when the backend is unavailable', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ready to roll?' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Facebook' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Username' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    expect(screen.getByText('The game service is offline. Guest play still works normally.')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your Roll' })).not.toBeInTheDocument()
  })

  it('starts a normal guest game, shows the return link, and resets the game after returning', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(screen.getByRole('heading', { level: 1, name: "Scott's Dice Game" })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scorecard' })).toBeVisible()
    expect(screen.getByText('Guest Player')).toBeVisible()
    expect(screen.getByText('Local guest session')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    await user.click(screen.getByRole('link', { name: /Return to sign in/ }))

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your Roll' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
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
    expect(screen.getByRole('button', { name: 'Continue with Username' })).toBeEnabled()
  })

  it('restores a persisted backend account into the game navbar', async () => {
    const backendClient = createMockBackendClient({ restoredUser: authenticatedUser() })
    render(<App backendClient={backendClient} />)

    expect(await screen.findByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.com')).toBeVisible()
    expect(screen.getByRole('button', { name: /Player Hub/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
    expect(screen.queryByRole('link', { name: /Return to sign in/ })).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))

    await waitFor(() => expect(saveTheme).toHaveBeenCalledWith('vegas'))
  })

  it('never calls game persistence APIs during guest play', async () => {
    const backendClient = createMockBackendClient()
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))

    expect(backendClient.getGameSession).not.toHaveBeenCalled()
    expect(backendClient.saveGame).not.toHaveBeenCalled()
    expect(backendClient.saveTheme).not.toHaveBeenCalled()
    expect(backendClient.deleteSavedGame).not.toHaveBeenCalled()
  })

  it('signs in with the seeded username account', async () => {
    const manualUser = authenticatedUser({
      id: 'manual-user',
      name: 'test',
      email: '',
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

    await user.click(await screen.findByRole('button', { name: 'Continue with Username' }))
    await user.type(screen.getByLabelText('Username'), 'test')
    await user.type(screen.getByLabelText('Password'), 'test')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith({ username: 'test', password: 'test' })
    expect(await screen.findByText('test')).toBeVisible()
    expect(screen.getByText('Username account')).toBeVisible()
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
      'Invalid username or password.',
      { code: 'INVALID_CREDENTIALS', status: 401 },
    )))
    const backendClient = createMockBackendClient({
      status: { available: true, manualAuthEnabled: true, socialAuthEnabled: false },
      login,
    })
    const user = userEvent.setup()
    render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Continue with Username' }))
    await user.type(screen.getByLabelText('Username'), 'nobody')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.')
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
      highScore: 410,
      lowScore: 275,
      averageScore: 342.5,
      medianScore: 342.5,
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
    expect(gameSession).toHaveAttribute('data-game-theme', 'classic')
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))

    expect(gameSession).toHaveAttribute('data-game-theme', 'rainbow')
    expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', 'rainbow')
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
    expect(screen.getByRole('button', { name: /Die 1 showing .*Held/ }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Roll Again (2 left)' })).toBeEnabled()
    expect(settingsButton).toHaveFocus()
    expect(settingsButton).toHaveAttribute('aria-pressed', 'false')
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
  ])('applies the %s style after it is saved', async (themeLabel, themeId) => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: new RegExp(themeLabel) }))
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', themeId)
    expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', themeId)
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
  })

  it('discards a draft theme and returns focus to settings when canceled', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    const settingsButton = screen.getByRole('button', { name: 'Game settings' })
    await user.click(settingsButton)
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
    expect(screen.getByRole('heading', { name: 'Your Roll' })).toBeVisible()
    expect(settingsButton).toHaveFocus()
  })

  it('resets to Classic after a guest returns to sign-in', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))
    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Beach/ }))
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'beach')

    await user.click(screen.getByRole('link', { name: /Return to sign in/ }))
    expect(container.querySelector('.game-session')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
  })

  it('resets to Classic after an authenticated user signs out', async () => {
    const backendClient = createMockBackendClient({ restoredUser: authenticatedUser() })
    const user = userEvent.setup()
    const { container } = render(<App backendClient={backendClient} />)

    await user.click(await screen.findByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(container.querySelector('.game-session')).not.toBeInTheDocument()
  })
})
