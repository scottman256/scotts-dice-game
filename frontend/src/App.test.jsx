import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import App from './App'

const NO_AUTH_EMISSION = Symbol('no-auth-emission')

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

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createMockAuthService({
  isConfigured = true,
  initialUser = NO_AUTH_EMISSION,
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
      if (initialUser !== NO_AUTH_EMISSION) userCallback(initialUser)
      return unsubscribe
    }),
    signIn,
    signOut,
    getIdToken: jest.fn(),
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

describe('App authentication shell', () => {
  it('shows the new landing page first and keeps unconfigured social providers disabled', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ready to roll?' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    expect(screen.getByText('Social sign-in needs Firebase setup. Guest play is ready now.')).toBeVisible()
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

  it('checks a configured provider session and unsubscribes on unmount', () => {
    const auth = createMockAuthService()
    const { unmount } = render(<App authService={auth.service} />)

    expect(screen.getByRole('main', { name: 'Loading account' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Checking your saved sign-in…')
    expect(auth.service.subscribe).toHaveBeenCalledTimes(1)

    unmount()
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('enables social choices after the auth observer reports no saved user', () => {
    const auth = createMockAuthService()
    render(<App authService={auth.service} />)

    act(() => auth.emitUser(null))

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeEnabled()
  })

  it('restores a persisted authenticated profile into the game navbar', () => {
    const auth = createMockAuthService()
    render(<App authService={auth.service} />)

    act(() => auth.emitUser(authenticatedUser()))

    expect(screen.getByRole('heading', { name: "Scott's Dice Game" })).toBeVisible()
    expect(screen.getByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.com')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
    expect(screen.queryByRole('link', { name: /Return to sign in/ })).not.toBeInTheDocument()
  })

  it('shows provider progress and enters the game after Google sign-in succeeds', async () => {
    const signInResult = deferred()
    const signIn = jest.fn(() => signInResult.promise)
    const auth = createMockAuthService({ initialUser: null, signIn })
    const user = userEvent.setup()
    render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(signIn).toHaveBeenCalledWith('google')
    expect(screen.getByRole('button', { name: 'Connecting to Google…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeDisabled()

    await act(async () => {
      signInResult.resolve(authenticatedUser())
      await signInResult.promise
    })

    expect(screen.getByRole('heading', { name: "Scott's Dice Game" })).toBeVisible()
    expect(screen.getByText('Ada Lovelace')).toBeVisible()
  })

  it('passes the Facebook provider and displays its returned identity', async () => {
    const facebookUser = authenticatedUser({
      id: 'facebook-user',
      name: 'Lin Player',
      email: '',
      providerId: 'facebook',
      providerLabel: 'Facebook',
    })
    const signIn = jest.fn(() => Promise.resolve(facebookUser))
    const auth = createMockAuthService({ initialUser: null, signIn })
    const user = userEvent.setup()
    render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Continue with Facebook' }))

    expect(signIn).toHaveBeenCalledWith('facebook')
    expect(await screen.findByText('Lin Player')).toBeVisible()
    expect(screen.getByText('Facebook account')).toBeVisible()
  })

  it('keeps the landing page usable and explains provider sign-in failures', async () => {
    const signIn = jest.fn(() => Promise.reject({ code: 'auth/popup-blocked' }))
    const auth = createMockAuthService({ initialUser: null, signIn })
    const user = userEvent.setup()
    render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your browser blocked the sign-in window. Allow popups for this site and try again.',
    )
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
  })

  it('recovers to the landing page when saved-session restoration fails', () => {
    const auth = createMockAuthService()
    render(<App authService={auth.service} />)

    act(() => auth.emitError())

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not restore your saved sign-in. Please sign in again.',
    )
  })

  it('shows sign-out progress and returns to the landing page after success', async () => {
    const signOutResult = deferred()
    const signOut = jest.fn(() => signOutResult.promise)
    const auth = createMockAuthService({
      initialUser: authenticatedUser(),
      signOut,
    })
    const user = userEvent.setup()
    render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled()

    await act(async () => {
      signOutResult.resolve()
      await signOutResult.promise
    })

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
  })

  it('keeps the authenticated game open when sign-out fails', async () => {
    const signOut = jest.fn(() => Promise.reject(new Error('sign out failed')))
    const auth = createMockAuthService({
      initialUser: authenticatedUser(),
      signOut,
    })
    const user = userEvent.setup()
    render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not sign you out. Please try again.',
    )
    expect(screen.getByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
  })

  it('returns to the landing page when Firebase later reports a signed-out session', () => {
    const auth = createMockAuthService({ initialUser: authenticatedUser() })
    render(<App authService={auth.service} />)

    expect(screen.getByText('Ada Lovelace')).toBeVisible()
    act(() => auth.emitUser(null))

    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
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
    const auth = createMockAuthService({ initialUser: authenticatedUser() })
    const user = userEvent.setup()
    const { container } = render(<App authService={auth.service} />)

    await user.click(screen.getByRole('button', { name: 'Game settings' }))
    await user.click(screen.getByRole('radio', { name: /Fire/ }))
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))
    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'fire')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('heading', { name: 'Ready to roll?' })).toBeVisible()
    act(() => auth.emitUser(authenticatedUser()))

    expect(container.querySelector('.game-session')).toHaveAttribute('data-game-theme', 'classic')
  })
})
