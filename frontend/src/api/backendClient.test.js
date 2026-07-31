import { describe, expect, it, jest } from '@jest/globals'
import {
  BackendApiError,
  createBackendClient,
  createUnavailableBackendClient,
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
    })))
    const client = createBackendClient({ fetchImpl, storage: storageMock() })

    await expect(client.checkAvailability()).resolves.toEqual({
      available: true,
      manualAuthEnabled: true,
      socialAuthEnabled: false,
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

  it('stores a login token and sends it with protected score requests', async () => {
    const storage = storageMock()
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(200, {
        accessToken: 'backend-token',
        user: { id: 'user-1', name: 'Scott' },
      }))
      .mockResolvedValueOnce(response(201, { score: 500, newHighScore: true }))
    const client = createBackendClient({ fetchImpl, storage })

    await expect(client.login({ username: 'test', password: 'test' }))
      .resolves.toMatchObject({ name: 'Scott' })
    await expect(client.saveScore('game-1', 500))
      .resolves.toMatchObject({ newHighScore: true })
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('Bearer backend-token')
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

    await client.login({ username: 'test', password: 'test' })
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

  it('provides a deterministic unavailable implementation for guest-only mode', async () => {
    const client = createUnavailableBackendClient()

    expect(client.knownUnavailable).toBe(true)
    await expect(client.checkAvailability()).resolves.toMatchObject({ available: false })
    await expect(client.login({})).rejects.toBeInstanceOf(BackendApiError)
  })
})
