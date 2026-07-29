import { getApps, initializeApp } from 'firebase/app'
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {
  AUTH_PROVIDERS,
  createUnavailableAuthService,
  normalizeFirebaseUser,
} from './authModel'

const FIREBASE_APP_NAME = 'dice-roller-auth'
const REQUIRED_CONFIG_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId']

const defaultFirebaseSdk = {
  FacebookAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  getApps,
  initializeApp,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
}

export function hasFirebaseConfig(config = {}) {
  return REQUIRED_CONFIG_FIELDS.every((field) => (
    typeof config[field] === 'string' && config[field].trim().length > 0
  ))
}

function unsupportedProviderError() {
  const error = new Error('Unsupported authentication provider.')
  error.code = 'auth/unsupported-provider'
  return error
}

export function createFirebaseAuthService(config, sdk = defaultFirebaseSdk) {
  if (!hasFirebaseConfig(config)) return createUnavailableAuthService()

  const existingApp = sdk.getApps().find(({ name }) => name === FIREBASE_APP_NAME)
  const app = existingApp ?? sdk.initializeApp(config, FIREBASE_APP_NAME)
  const auth = sdk.getAuth(app)

  return Object.freeze({
    isConfigured: true,
    subscribe(onUserChanged, onError) {
      return sdk.onAuthStateChanged(
        auth,
        (user) => onUserChanged(normalizeFirebaseUser(user)),
        onError,
      )
    },
    async signIn(providerId) {
      const Provider = {
        [AUTH_PROVIDERS.google]: sdk.GoogleAuthProvider,
        [AUTH_PROVIDERS.facebook]: sdk.FacebookAuthProvider,
      }[providerId]

      if (!Provider) throw unsupportedProviderError()

      await sdk.setPersistence(auth, sdk.browserLocalPersistence)
      const result = await sdk.signInWithPopup(auth, new Provider())
      return normalizeFirebaseUser(result.user)
    },
    async signOut() {
      await sdk.signOut(auth)
    },
    async getIdToken(forceRefresh = false) {
      return auth.currentUser?.getIdToken(forceRefresh) ?? null
    },
  })
}
