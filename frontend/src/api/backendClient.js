const TOKEN_STORAGE_KEY = 'scotts-dice-game.access-token'
const DEFAULT_TIMEOUT_MS = 1800

export class BackendApiError extends Error {
  constructor(message, { code = 'BACKEND_ERROR', status = 0, errors = {} } = {}) {
    super(message)
    this.name = 'BackendApiError'
    this.code = code
    this.status = status
    this.errors = errors
  }
}

function browserStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || 'http://localhost:8080').replace(/\/$/, '')
}

async function parseResponse(response) {
  const contentType = response.headers?.get?.('content-type') || ''
  if (!contentType.includes('json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function getBackendErrorMessage(error) {
  if (error instanceof BackendApiError) return error.message
  return 'We could not reach the game service. You can continue as a guest.'
}

export function createBackendClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  storage = browserStorage(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const apiBaseUrl = normalizeBaseUrl(baseUrl)

  function getToken() {
    return storage?.getItem(TOKEN_STORAGE_KEY) || null
  }

  function clearSession() {
    storage?.removeItem(TOKEN_STORAGE_KEY)
  }

  async function request(path, { method = 'GET', body, token = getToken(), signal } = {}) {
    let response
    try {
      response = await fetchImpl(`${apiBaseUrl}${path}`, {
        method,
        signal,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } catch (cause) {
      throw new BackendApiError(
        'The game service is currently unavailable. You can continue as a guest.',
        { code: 'BACKEND_UNAVAILABLE' },
      )
    }

    const payload = await parseResponse(response)
    if (!response.ok) {
      throw new BackendApiError(
        payload?.detail || 'The game service could not complete that request.',
        {
          code: payload?.code || 'BACKEND_ERROR',
          status: response.status,
          errors: payload?.errors || {},
        },
      )
    }
    return payload
  }

  function rememberAuth(authResponse) {
    storage?.setItem(TOKEN_STORAGE_KEY, authResponse.accessToken)
    return authResponse.user
  }

  return Object.freeze({
    knownUnavailable: false,
    baseUrl: apiBaseUrl,
    async checkAvailability() {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const status = await request('/api/public/status', { token: null, signal: controller.signal })
        return {
          available: status?.status === 'UP',
          manualAuthEnabled: Boolean(status?.manualAuthEnabled),
          socialAuthEnabled: Boolean(status?.socialAuthEnabled),
          enabledThemes: Array.isArray(status?.enabledThemes) ? status.enabledThemes : null,
        }
      } catch {
        return {
          available: false,
          manualAuthEnabled: false,
          socialAuthEnabled: false,
          enabledThemes: null,
        }
      } finally {
        clearTimeout(timeout)
      }
    },
    async restoreSession() {
      if (!getToken()) return null
      try {
        return await request('/api/auth/me')
      } catch (error) {
        if (error.status === 401) {
          clearSession()
          return null
        }
        throw error
      }
    },
    async register(credentials) {
      return rememberAuth(await request('/api/auth/register', {
        method: 'POST',
        token: null,
        body: credentials,
      }))
    },
    async login(credentials) {
      return rememberAuth(await request('/api/auth/login', {
        method: 'POST',
        token: null,
        body: credentials,
      }))
    },
    async loginWithFirebase(idToken) {
      return rememberAuth(await request('/api/auth/firebase', {
        method: 'POST',
        token: null,
        body: { idToken },
      }))
    },
    async signOut() {
      clearSession()
    },
    clearSession,
    async saveScore(gameId, score, categoryScores, theme) {
      return request('/api/scores', {
        method: 'POST',
        body: { gameId, score, theme, categoryScores },
      })
    },
    async getPersonalScores() {
      return request('/api/scores/me')
    },
    async getLeaderboard() {
      return request('/api/scores/leaderboard')
    },
    async getGameStats() {
      return request('/api/stats/me')
    },
    async getAchievements() {
      return request('/api/achievements/me')
    },
    async getGameSession() {
      return request('/api/game-session')
    },
    async saveTheme(theme) {
      return request('/api/game-session/theme', { method: 'PUT', body: { theme } })
    },
    async saveGame(gameId, state) {
      return request('/api/game-session/game', {
        method: 'PUT',
        body: { gameId, ...state },
      })
    },
    async deleteSavedGame() {
      return request('/api/game-session/game', { method: 'DELETE' })
    },
    async getAdminThemes() {
      return request('/api/admin/themes')
    },
    async updateAdminTheme(themeId, enabled) {
      return request(`/api/admin/themes/${encodeURIComponent(themeId)}`, {
        method: 'PUT',
        body: { enabled },
      })
    },
    async getAdminUsers() {
      return request('/api/admin/users')
    },
    async deleteAdminUser(userId) {
      return request(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
    },
    async changeAdminUserPassword(userId, credentials) {
      return request(`/api/admin/users/${encodeURIComponent(userId)}/password`, {
        method: 'PUT',
        body: credentials,
      })
    },
    async changeAdminUserEmail(userId, update) {
      return request(`/api/admin/users/${encodeURIComponent(userId)}/email`, {
        method: 'PUT',
        body: update,
      })
    },
    async addAdminSystemScore(entry) {
      return request('/api/admin/scores', { method: 'POST', body: entry })
    },
    async deleteAdminScore(scoreId) {
      return request(`/api/admin/scores/${encodeURIComponent(scoreId)}`, { method: 'DELETE' })
    },
    async resetAdminGameData() {
      return request('/api/admin/game-data/reset', { method: 'POST' })
    },
  })
}

export function createUnavailableBackendClient() {
  const unavailable = async () => {
    throw new BackendApiError(
      'The game service is currently unavailable. You can continue as a guest.',
      { code: 'BACKEND_UNAVAILABLE' },
    )
  }
  return Object.freeze({
    knownUnavailable: true,
    checkAvailability: async () => ({
      available: false,
      manualAuthEnabled: false,
      socialAuthEnabled: false,
      enabledThemes: null,
    }),
    restoreSession: async () => null,
    register: unavailable,
    login: unavailable,
    loginWithFirebase: unavailable,
    signOut: async () => {},
    clearSession() {},
    saveScore: unavailable,
    getPersonalScores: unavailable,
    getLeaderboard: unavailable,
    getGameStats: unavailable,
    getAchievements: unavailable,
    getGameSession: unavailable,
    saveTheme: unavailable,
    saveGame: unavailable,
    deleteSavedGame: unavailable,
    getAdminThemes: unavailable,
    updateAdminTheme: unavailable,
    getAdminUsers: unavailable,
    deleteAdminUser: unavailable,
    changeAdminUserPassword: unavailable,
    changeAdminUserEmail: unavailable,
    addAdminSystemScore: unavailable,
    deleteAdminScore: unavailable,
    resetAdminGameData: unavailable,
  })
}
