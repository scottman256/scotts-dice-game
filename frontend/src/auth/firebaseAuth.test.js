import { describe, expect, it, jest } from '@jest/globals'
import { AUTH_PROVIDERS } from './authModel'

jest.mock('firebase/app', () => ({
  getApps: () => [],
  initializeApp: () => ({ name: 'mock-firebase-app' }),
}))

jest.mock('firebase/auth', () => ({
  FacebookAuthProvider: class FacebookAuthProvider {},
  GoogleAuthProvider: class GoogleAuthProvider {},
  browserLocalPersistence: {},
  getAuth: () => ({ currentUser: null }),
  onAuthStateChanged: () => () => {},
  setPersistence: () => Promise.resolve(),
  signInWithPopup: () => Promise.resolve({ user: null }),
  signOut: () => Promise.resolve(),
}))

import { createFirebaseAuthService, hasFirebaseConfig } from './firebaseAuth'

const validConfig = {
  apiKey: 'api-key',
  authDomain: 'dice.example.firebaseapp.com',
  projectId: 'dice-example',
  appId: 'app-id',
}

function firebaseUser(overrides = {}) {
  return {
    uid: 'firebase-user',
    displayName: 'Grace Hopper',
    email: 'grace@example.com',
    photoURL: 'https://example.com/grace.jpg',
    providerData: [{ providerId: 'google.com' }],
    ...overrides,
  }
}

function createFakeSdk(overrides = {}) {
  class GoogleProvider {
    constructor() {
      this.providerId = 'google'
    }
  }

  class FacebookProvider {
    constructor() {
      this.providerId = 'facebook'
    }
  }

  const app = { name: 'dice-roller-auth' }
  const auth = { currentUser: null }
  const sdk = {
    GoogleAuthProvider: GoogleProvider,
    FacebookAuthProvider: FacebookProvider,
    browserLocalPersistence: { type: 'LOCAL' },
    getApps: jest.fn(() => []),
    initializeApp: jest.fn(() => app),
    getAuth: jest.fn(() => auth),
    onAuthStateChanged: jest.fn(() => jest.fn()),
    setPersistence: jest.fn(() => Promise.resolve()),
    signInWithPopup: jest.fn(() => Promise.resolve({ user: firebaseUser() })),
    signOut: jest.fn(() => Promise.resolve()),
    ...overrides,
  }

  return { app, auth, sdk }
}

describe('hasFirebaseConfig', () => {
  it('accepts a complete Firebase web configuration', () => {
    expect(hasFirebaseConfig(validConfig)).toBe(true)
  })

  it.each([
    undefined,
    {},
    { ...validConfig, apiKey: '' },
    { ...validConfig, authDomain: '   ' },
    { ...validConfig, projectId: null },
    { ...validConfig, appId: undefined },
  ])('rejects an incomplete configuration', (config) => {
    expect(hasFirebaseConfig(config)).toBe(false)
  })
})

describe('createFirebaseAuthService', () => {
  it('returns the unavailable service without initializing Firebase when config is incomplete', async () => {
    const { sdk } = createFakeSdk()
    const service = createFirebaseAuthService({ apiKey: 'partial' }, sdk)

    expect(service.isConfigured).toBe(false)
    expect(sdk.getApps).not.toHaveBeenCalled()
    await expect(service.signIn(AUTH_PROVIDERS.google)).rejects.toMatchObject({
      code: 'auth/not-configured',
    })
  })

  it('initializes one named Firebase app and its Auth instance', () => {
    const { app, auth, sdk } = createFakeSdk()
    const service = createFirebaseAuthService(validConfig, sdk)

    expect(service.isConfigured).toBe(true)
    expect(sdk.initializeApp).toHaveBeenCalledWith(validConfig, 'dice-roller-auth')
    expect(sdk.getAuth).toHaveBeenCalledWith(app)
    expect(sdk.getAuth).toHaveReturnedWith(auth)
  })

  it('reuses the named Firebase app during hot reloads', () => {
    const existingApp = { name: 'dice-roller-auth' }
    const otherApp = { name: 'another-app' }
    const { sdk } = createFakeSdk({
      getApps: jest.fn(() => [otherApp, existingApp]),
    })

    createFirebaseAuthService(validConfig, sdk)

    expect(sdk.initializeApp).not.toHaveBeenCalled()
    expect(sdk.getAuth).toHaveBeenCalledWith(existingApp)
  })

  it('normalizes auth observer updates and returns Firebase unsubscribe', () => {
    const unsubscribe = jest.fn()
    const observedUser = firebaseUser()
    const observerError = jest.fn()
    const { auth, sdk } = createFakeSdk({
      onAuthStateChanged: jest.fn((receivedAuth, onUserChanged, onError) => {
        expect(receivedAuth).toBe(auth)
        expect(onError).toBe(observerError)
        onUserChanged(observedUser)
        return unsubscribe
      }),
    })
    const service = createFirebaseAuthService(validConfig, sdk)
    const onUserChanged = jest.fn()

    expect(service.subscribe(onUserChanged, observerError)).toBe(unsubscribe)
    expect(onUserChanged).toHaveBeenCalledWith({
      id: 'firebase-user',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      photoUrl: 'https://example.com/grace.jpg',
      providerId: 'google',
      providerLabel: 'Google',
    })
  })

  it('forwards a signed-out observer update as null', () => {
    const { sdk } = createFakeSdk({
      onAuthStateChanged: jest.fn((auth, onUserChanged) => {
        onUserChanged(null)
        return jest.fn()
      }),
    })
    const service = createFirebaseAuthService(validConfig, sdk)
    const onUserChanged = jest.fn()

    service.subscribe(onUserChanged)

    expect(onUserChanged).toHaveBeenCalledWith(null)
  })

  it.each([
    [AUTH_PROVIDERS.google, 'google', 'google.com', 'Google'],
    [AUTH_PROVIDERS.facebook, 'facebook', 'facebook.com', 'Facebook'],
  ])('signs in with %s after setting local persistence', async (
    providerId,
    providerInstanceId,
    firebaseProviderId,
    providerLabel,
  ) => {
    const signedInUser = firebaseUser({
      providerData: [{ providerId: firebaseProviderId }],
    })
    const { auth, sdk } = createFakeSdk({
      signInWithPopup: jest.fn(() => Promise.resolve({ user: signedInUser })),
    })
    const service = createFirebaseAuthService(validConfig, sdk)

    await expect(service.signIn(providerId)).resolves.toMatchObject({
      providerId,
      providerLabel,
    })
    expect(sdk.setPersistence).toHaveBeenCalledWith(auth, sdk.browserLocalPersistence)
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(auth, expect.objectContaining({
      providerId: providerInstanceId,
    }))
    expect(sdk.setPersistence.mock.invocationCallOrder[0])
      .toBeLessThan(sdk.signInWithPopup.mock.invocationCallOrder[0])
  })

  it('rejects unsupported providers without opening a popup', async () => {
    const { sdk } = createFakeSdk()
    const service = createFirebaseAuthService(validConfig, sdk)

    await expect(service.signIn('github')).rejects.toMatchObject({
      code: 'auth/unsupported-provider',
    })
    expect(sdk.setPersistence).not.toHaveBeenCalled()
    expect(sdk.signInWithPopup).not.toHaveBeenCalled()
  })

  it('signs out the current Auth instance', async () => {
    const { auth, sdk } = createFakeSdk()
    const service = createFirebaseAuthService(validConfig, sdk)

    await service.signOut()

    expect(sdk.signOut).toHaveBeenCalledWith(auth)
  })

  it('retrieves a current ID token for the future backend', async () => {
    const getIdToken = jest.fn(() => Promise.resolve('firebase-id-token'))
    const { auth, sdk } = createFakeSdk()
    auth.currentUser = { getIdToken }
    const service = createFirebaseAuthService(validConfig, sdk)

    await expect(service.getIdToken()).resolves.toBe('firebase-id-token')
    await expect(service.getIdToken(true)).resolves.toBe('firebase-id-token')
    expect(getIdToken).toHaveBeenNthCalledWith(1, false)
    expect(getIdToken).toHaveBeenNthCalledWith(2, true)
  })

  it('returns null when no authenticated user has an ID token', async () => {
    const { sdk } = createFakeSdk()
    const service = createFirebaseAuthService(validConfig, sdk)

    await expect(service.getIdToken()).resolves.toBeNull()
  })
})
