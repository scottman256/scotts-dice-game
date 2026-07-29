export const AUTH_PROVIDERS = Object.freeze({
  google: 'google',
  facebook: 'facebook',
})

const PROVIDER_DETAILS = Object.freeze({
  'google.com': { id: AUTH_PROVIDERS.google, label: 'Google' },
  'facebook.com': { id: AUTH_PROVIDERS.facebook, label: 'Facebook' },
})

export function createGuestUser() {
  return {
    id: 'guest',
    name: 'Guest Player',
    email: '',
    photoUrl: null,
    providerId: 'guest',
    providerLabel: 'Guest',
  }
}

export function normalizeFirebaseUser(user) {
  if (!user) return null

  const providerKey = user.providerData
    ?.map(({ providerId }) => providerId)
    .find((providerId) => PROVIDER_DETAILS[providerId])
  const provider = PROVIDER_DETAILS[providerKey] ?? {
    id: 'firebase',
    label: 'Signed in',
  }
  const email = user.email?.trim() ?? ''
  const fallbackName = email ? email.split('@')[0] : 'Player'

  return {
    id: user.uid,
    name: user.displayName?.trim() || fallbackName,
    email,
    photoUrl: user.photoURL || null,
    providerId: provider.id,
    providerLabel: provider.label,
  }
}

export function getUserInitials(name) {
  const words = typeof name === 'string'
    ? name.trim().split(/\s+/).filter(Boolean)
    : []

  if (words.length === 0) return 'P'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words.at(-1)[0]}`.toUpperCase()
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was canceled. You can try again whenever you are ready.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow popups for this site and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists for this email. Sign in with the provider you used first.'
    case 'auth/network-request-failed':
      return 'We could not reach the sign-in service. Check your connection and try again.'
    case 'auth/unauthorized-domain':
      return 'This site is not yet authorized for social sign-in. Add its domain in Firebase Authentication.'
    case 'auth/operation-not-allowed':
    case 'auth/not-configured':
      return 'Social sign-in is not configured yet. Continue as a guest or add the Firebase settings.'
    default:
      return 'We could not complete sign-in. Please try again.'
  }
}

export function createUnavailableAuthService() {
  return Object.freeze({
    isConfigured: false,
    subscribe(onUserChanged) {
      onUserChanged(null)
      return () => {}
    },
    async signIn() {
      const error = new Error('Firebase Authentication is not configured.')
      error.code = 'auth/not-configured'
      throw error
    },
    async signOut() {},
    async getIdToken() {
      return null
    },
  })
}
