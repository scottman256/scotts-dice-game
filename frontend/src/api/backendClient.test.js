import { describe, expect, it, jest } from '@jest/globals'
import {
  BackendApiError,
  createBackendClient,
  createUnavailableBackendClient,
  getBackendErrorMessage,
} from './backendClient'

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  }
}

function storageMock() {
  const values = new Map()
  return {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: jest.fn((key) => values.delete(key)),
  }
}

describe('backend client', () => {
  it('reports backend capability flags from the public status endpoint', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(response(200, {
      status: 'UP',
      manualAuthEnabled: true,
      socialAuthEnabled: false,
      enabledThemes: ['classic', 'golden'],
    })))
    const client = createBackendClient({ fetchImpl, storage: storageMock() })

    await expect(client.checkAvailability()).resolves.toEqual({
      available: true,
      manualAuthEnabled: true,
      socialAuthEnabled: false,
      enabledThemes: ['classic', 'golden'],
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/api/public/status',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('falls back cleanly when the backend cannot be reached', async () => {
    const client = createBackendClient({
      fetchImpl: jest.fn(() => Promise.reject(new TypeError('offline'))),
      storage: storageMock(),
    })

    await expect(client.checkAvailability()).resolves.toMatchObject({ available: false })
  })

  it('stores a login token and sends completed scorecards with protected stats requests', async () => {
    const storage = storageMock()
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(200, {
        accessToken: 'backend-token',
        user: { id: 'user-1', name: 'Scott' },
      }))
      .mockResolvedValueOnce(response(201, { score: 500, newHighScore: true }))
      .mockResolvedValueOnce(response(200, { gamesPlayed: 1, highScore: 500 }))
      .mockResolvedValueOnce(response(200, { capacity: 36, achievements: [] }))
    const client = createBackendClient({ fetchImpl, storage })
    const categoryScores = { fiveKind: 75 }

    await expect(client.login({ identifier: 'test@test.com', password: 'test' }))
      .resolves.toMatchObject({ name: 'Scott' })
    await expect(client.saveScore('game-1', 500, categoryScores, 'golden'))
      .resolves.toMatchObject({ newHighScore: true })
    await expect(client.getGameStats()).resolves.toMatchObject({ gamesPlayed: 1 })
    await expect(client.getAchievements()).resolves.toMatchObject({ capacity: 36 })
    expect(fetchImpl.mock.calls[0]).toEqual([
      'http://localhost:8080/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'test@test.com', password: 'test' }),
      }),
    ])
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('Bearer backend-token')
    expect(fetchImpl.mock.calls[1][1].body).toBe(JSON.stringify({
      gameId: 'game-1',
      score: 500,
      theme: 'golden',
      categoryScores,
    }))
    expect(fetchImpl.mock.calls[2][0]).toBe('http://localhost:8080/api/stats/me')
    expect(fetchImpl.mock.calls[3][0]).toBe('http://localhost:8080/api/achievements/me')
  })

  it('loads, saves, and deletes authenticated game progress and theme preferences', async () => {
    const storage = storageMock()
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(200, {
        accessToken: 'backend-token',
        user: { id: 'user-1', name: 'Scott' },
      }))
      .mockResolvedValueOnce(response(200, { theme: 'classic', savedGame: null }))
      .mockResolvedValueOnce(response(200, { theme: 'vegas' }))
      .mockResolvedValueOnce(response(200, { gameId: 'game-1' }))
      .mockResolvedValueOnce(response(204, null))
    const client = createBackendClient({ fetchImpl, storage })
    const state = {
      dice: [1, 2, 3, 4, 5],
      heldDice: [true, false, false, false, false],
      rollCount: 1,
      scores: {},
      extraRollsUsed: 0,
      status: 'Roll 1 of 3.',
      statusTone: 'normal',
    }

    await client.login({ identifier: 'test', password: 'test' })
    await expect(client.getGameSession()).resolves.toMatchObject({ theme: 'classic' })
    await expect(client.saveTheme('vegas')).resolves.toEqual({ theme: 'vegas' })
    await expect(client.saveGame('game-1', state)).resolves.toEqual({ gameId: 'game-1' })
    await expect(client.deleteSavedGame()).resolves.toBeNull()

    expect(fetchImpl.mock.calls[1]).toEqual([
      'http://localhost:8080/api/game-session',
      expect.objectContaining({ method: 'GET' }),
    ])
    expect(fetchImpl.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ theme: 'vegas' }),
    }))
    expect(fetchImpl.mock.calls[3][1]).toEqual(expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ gameId: 'game-1', ...state }),
    }))
    expect(fetchImpl.mock.calls[4][1]).toEqual(expect.objectContaining({ method: 'DELETE' }))
  })

  it('supports social login, session restoration, score views, and sign-out', async () => {
    const storage = storageMock()
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(200, {
        accessToken: 'firebase-backend-token',
        user: { id: 'user-1', name: 'Cosmic Roller' },
      }))
      .mockResolvedValueOnce(response(200, { id: 'user-1', name: 'Cosmic Roller' }))
      .mockResolvedValueOnce(response(200, [{ rank: 1, score: 640 }]))
      .mockResolvedValueOnce(response(200, [{ rank: 1, score: 700 }]))
    const client = createBackendClient({ fetchImpl, storage })

    await expect(client.loginWithFirebase('firebase-id-token'))
      .resolves.toMatchObject({ name: 'Cosmic Roller' })
    await expect(client.restoreSession()).resolves.toMatchObject({ id: 'user-1' })
    await expect(client.getPersonalScores()).resolves.toEqual([{ rank: 1, score: 640 }])
    await expect(client.getLeaderboard()).resolves.toEqual([{ rank: 1, score: 700 }])
    await expect(client.signOut()).resolves.toBeUndefined()

    expect(fetchImpl.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ idToken: 'firebase-id-token' }),
    }))
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('Bearer firebase-backend-token')
    expect(fetchImpl.mock.calls[2][0]).toBe('http://localhost:8080/api/scores/me')
    expect(fetchImpl.mock.calls[3][0]).toBe('http://localhost:8080/api/scores/leaderboard')
    expect(storage.removeItem).toHaveBeenCalledWith('scotts-dice-game.access-token')
  })

  it('provides all administrator theme, user, score, and reset operations', async () => {
    const storage = storageMock()
    storage.setItem('scotts-dice-game.access-token', 'admin-token')
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(200, { themes: [{ id: 'classic', enabled: true }] }))
      .mockResolvedValueOnce(response(200, { themes: [{ id: 'rainbow', enabled: false }] }))
      .mockResolvedValueOnce(response(200, [{ id: 'user-1', name: 'Player' }]))
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(response(201, { scoreId: 'score-1', playerName: 'Fishman', score: 999 }))
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(response(200, { scoresDeleted: 3 }))
    const client = createBackendClient({ fetchImpl, storage })

    await client.getAdminThemes()
    await client.updateAdminTheme('rainbow', false)
    await client.getAdminUsers()
    await client.deleteAdminUser('user/1')
    await client.changeAdminUserPassword('user/1', {
      password: 'NewPassword!2026',
      passwordConfirmation: 'NewPassword!2026',
    })
    await client.changeAdminUserEmail('user/1', { email: 'player@example.com' })
    await client.addAdminSystemScore({ playerName: 'Fishman', score: 999 })
    await client.deleteAdminScore('score/1')
    await client.resetAdminGameData()

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8080/api/admin/themes',
      'http://localhost:8080/api/admin/themes/rainbow',
      'http://localhost:8080/api/admin/users',
      'http://localhost:8080/api/admin/users/user%2F1',
      'http://localhost:8080/api/admin/users/user%2F1/password',
      'http://localhost:8080/api/admin/users/user%2F1/email',
      'http://localhost:8080/api/admin/scores',
      'http://localhost:8080/api/admin/scores/score%2F1',
      'http://localhost:8080/api/admin/game-data/reset',
    ])
    expect(fetchImpl.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ enabled: false }),
    }))
    expect(fetchImpl.mock.calls[5][1]).toEqual(expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ email: 'player@example.com' }),
    }))
    expect(fetchImpl.mock.calls[6][1]).toEqual(expect.objectContaining({
      method: 'POST', body: JSON.stringify({ playerName: 'Fishman', score: 999 }),
    }))
  })

  it('surfaces backend problem details such as duplicate usernames', async () => {
    const client = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve(response(409, {
        code: 'USERNAME_TAKEN',
        detail: 'That username is already taken. Please choose another one.',
      }))),
      storage: storageMock(),
    })

    await expect(client.register({})).rejects.toEqual(expect.objectContaining({
      name: 'BackendApiError',
      code: 'USERNAME_TAKEN',
      status: 409,
      message: 'That username is already taken. Please choose another one.',
    }))
  })

  it('uses safe fallbacks for non-JSON, malformed, and incomplete responses', async () => {
    expect(getBackendErrorMessage(new TypeError('network failed')))
      .toBe('We could not reach the game service. You can continue as a guest.')

    const noContentClient = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve({ ok: true, status: 204 })),
      storage: storageMock(),
    })
    await expect(noContentClient.checkAvailability()).resolves.toEqual({
      available: false,
      manualAuthEnabled: false,
      socialAuthEnabled: false,
      enabledThemes: null,
    })

    const malformedJsonClient = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => { throw new SyntaxError('invalid JSON') },
      })),
      storage: storageMock(),
    })
    await expect(malformedJsonClient.getLeaderboard()).resolves.toBeNull()

    const incompleteErrorClient = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        headers: { get: () => 'text/plain' },
      })),
      storage: storageMock(),
    })
    await expect(incompleteErrorClient.getPersonalScores()).rejects.toEqual(expect.objectContaining({
      code: 'BACKEND_ERROR',
      status: 503,
      message: 'The game service could not complete that request.',
      errors: {},
    }))
  })

  it('restores safely with no token and clears an expired authenticated session', async () => {
    const emptyStorage = storageMock()
    const unusedFetch = jest.fn()
    const signedOutClient = createBackendClient({ fetchImpl: unusedFetch, storage: emptyStorage })

    await expect(signedOutClient.restoreSession()).resolves.toBeNull()
    expect(unusedFetch).not.toHaveBeenCalled()

    const expiredStorage = storageMock()
    expiredStorage.setItem('scotts-dice-game.access-token', 'expired-token')
    const expiredClient = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve(response(401, {
        code: 'INVALID_TOKEN',
        detail: 'The access token is invalid.',
      }))),
      storage: expiredStorage,
    })

    await expect(expiredClient.restoreSession()).resolves.toBeNull()
    expect(expiredStorage.removeItem).toHaveBeenCalledWith('scotts-dice-game.access-token')
  })

  it('preserves non-authentication errors while restoring a session', async () => {
    const storage = storageMock()
    storage.setItem('scotts-dice-game.access-token', 'backend-token')
    const client = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve(response(503, {
        code: 'SERVICE_BUSY',
        detail: 'Try again shortly.',
      }))),
      storage,
    })

    await expect(client.restoreSession()).rejects.toEqual(expect.objectContaining({
      code: 'SERVICE_BUSY',
      status: 503,
    }))
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('can register when persistent browser storage is unavailable', async () => {
    const client = createBackendClient({
      fetchImpl: jest.fn(() => Promise.resolve(response(201, {
        accessToken: 'temporary-token',
        user: { id: 'user-1', name: 'Private Roller' },
      }))),
      storage: null,
    })

    await expect(client.register({ username: 'private-roller' }))
      .resolves.toMatchObject({ name: 'Private Roller' })
  })

  it('provides a deterministic unavailable implementation for guest-only mode', async () => {
    const client = createUnavailableBackendClient()

    expect(client.knownUnavailable).toBe(true)
    await expect(client.checkAvailability()).resolves.toMatchObject({ available: false })
    await expect(client.restoreSession()).resolves.toBeNull()
    await expect(client.signOut()).resolves.toBeUndefined()
    expect(client.clearSession()).toBeUndefined()
    await expect(client.login({})).rejects.toBeInstanceOf(BackendApiError)
  })
})
