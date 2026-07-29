import { describe, expect, it } from '@jest/globals'
import {
  AUTH_PROVIDERS,
  createGuestUser,
  createUnavailableAuthService,
  getAuthErrorMessage,
  getUserInitials,
  normalizeFirebaseUser,
} from './authModel'

describe('authentication model', () => {
  it('defines the supported social providers', () => {
    expect(AUTH_PROVIDERS).toEqual({ google: 'google', facebook: 'facebook' })
    expect(Object.isFrozen(AUTH_PROVIDERS)).toBe(true)
  })

  it('creates a local guest identity', () => {
    expect(createGuestUser()).toEqual({
      id: 'guest',
      name: 'Guest Player',
      email: '',
      photoUrl: null,
      providerId: 'guest',
      providerLabel: 'Guest',
    })
  })
})

describe('normalizeFirebaseUser', () => {
  it('returns null for a signed-out Firebase session', () => {
    expect(normalizeFirebaseUser(null)).toBeNull()
  })

  it.each([
    ['google.com', 'google', 'Google'],
    ['facebook.com', 'facebook', 'Facebook'],
  ])('normalizes a %s profile', (firebaseProvider, providerId, providerLabel) => {
    expect(normalizeFirebaseUser({
      uid: 'user-123',
      displayName: '  Ada Lovelace  ',
      email: '  ada@example.com  ',
      photoURL: 'https://example.com/ada.jpg',
      providerData: [{ providerId: firebaseProvider }],
    })).toEqual({
      id: 'user-123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      photoUrl: 'https://example.com/ada.jpg',
      providerId,
      providerLabel,
    })
  })

  it('finds the supported provider among multiple linked providers', () => {
    expect(normalizeFirebaseUser({
      uid: 'linked-user',
      displayName: 'Linked Player',
      email: null,
      photoURL: '',
      providerData: [
        { providerId: 'password' },
        { providerId: 'facebook.com' },
      ],
    })).toMatchObject({
      providerId: 'facebook',
      providerLabel: 'Facebook',
      photoUrl: null,
    })
  })

  it('falls back to the email name and a generic provider label', () => {
    expect(normalizeFirebaseUser({
      uid: 'email-user',
      displayName: '   ',
      email: 'dice-fan@example.com',
      photoURL: null,
      providerData: [{ providerId: 'password' }],
    })).toEqual({
      id: 'email-user',
      name: 'dice-fan',
      email: 'dice-fan@example.com',
      photoUrl: null,
      providerId: 'firebase',
      providerLabel: 'Signed in',
    })
  })

  it('uses Player when no display name or email is available', () => {
    expect(normalizeFirebaseUser({
      uid: 'anonymous-profile',
      displayName: null,
      email: null,
      photoURL: null,
      providerData: undefined,
    }).name).toBe('Player')
  })
})

describe('getUserInitials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['Ada Byron Lovelace', 'AL'],
    ['  dice fan  ', 'DF'],
    ['Player', 'PL'],
    ['', 'P'],
    [null, 'P'],
  ])('returns %s as %s', (name, expected) => {
    expect(getUserInitials(name)).toBe(expected)
  })
})

describe('getAuthErrorMessage', () => {
  it.each([
    ['auth/popup-closed-by-user', 'Sign-in was canceled. You can try again whenever you are ready.'],
    ['auth/cancelled-popup-request', 'Sign-in was canceled. You can try again whenever you are ready.'],
    ['auth/popup-blocked', 'Your browser blocked the sign-in window. Allow popups for this site and try again.'],
    ['auth/account-exists-with-different-credential', 'An account already exists for this email. Sign in with the provider you used first.'],
    ['auth/network-request-failed', 'We could not reach the sign-in service. Check your connection and try again.'],
    ['auth/unauthorized-domain', 'This site is not yet authorized for social sign-in. Add its domain in Firebase Authentication.'],
    ['auth/operation-not-allowed', 'Social sign-in is not configured yet. Continue as a guest or add the Firebase settings.'],
    ['auth/not-configured', 'Social sign-in is not configured yet. Continue as a guest or add the Firebase settings.'],
  ])('maps %s to an actionable message', (code, expected) => {
    expect(getAuthErrorMessage({ code })).toBe(expected)
  })

  it('uses a safe generic message for unknown or missing errors', () => {
    expect(getAuthErrorMessage({ code: 'auth/internal-error' }))
      .toBe('We could not complete sign-in. Please try again.')
    expect(getAuthErrorMessage())
      .toBe('We could not complete sign-in. Please try again.')
  })
})

describe('createUnavailableAuthService', () => {
  it('implements the auth-service contract without provider configuration', async () => {
    const service = createUnavailableAuthService()
    const receivedUsers = []
    const unsubscribe = service.subscribe((user) => receivedUsers.push(user))

    expect(service.isConfigured).toBe(false)
    expect(receivedUsers).toEqual([null])
    expect(unsubscribe).toEqual(expect.any(Function))
    expect(await service.signOut()).toBeUndefined()
    expect(await service.getIdToken()).toBeNull()
    await expect(service.signIn('google')).rejects.toMatchObject({
      code: 'auth/not-configured',
    })
  })
})
