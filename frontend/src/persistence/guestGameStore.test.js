import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { guestGameStore } from './guestGameStore'
import { ALL_CATEGORIES } from '../gameRules'
import { createInitialGameState } from '../gameState'

const KEY = 'scotts-dice-game.guest-session'
const gameId = '83d35313-a908-4516-b132-c599f460df6a'
const game = {
  gameId,
  ...createInitialGameState({
    dice: [1, 2, 3, 4, 5], heldDice: [true, false, true, false, false],
    rollCount: 4, scores: { sixes: 0, fiveKindBonus: 150 }, extraRollsUsed: 1,
  }),
}

beforeEach(() => localStorage.clear())
afterEach(() => { jest.restoreAllMocks(); localStorage.clear() })

describe('guest game storage', () => {
  it('defaults to an empty classic session without writing anything', () => {
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'classic', savedGame: null })
    expect(localStorage.length).toBe(0)
  })

  it('round-trips progress and theme in one compact, versioned record', () => {
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, { ...game, transientUiState: 'not persisted' })
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'vegas', savedGame: game })
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem(KEY).length).toBeLessThan(1000)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ version: 1, theme: 'vegas', savedGame: game })
    guestGameStore.saveTheme('fire')
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'fire', savedGame: game })
    guestGameStore.saveGame(gameId, { ...game, extraRollsUsed: 2 })
    expect(guestGameStore.getGameSession().savedGame.extraRollsUsed).toBe(2)
    expect(localStorage.length).toBe(1)
  })

  it('preserves scratches and celebration messages between turns', () => {
    const state = createInitialGameState({ scores: { ones: 0, fiveKind: 75 }, status: 'Amazing! Five of a Kind!', statusTone: 'celebration' })
    guestGameStore.saveGame(gameId, state)
    expect(guestGameStore.getGameSession().savedGame).toEqual({ gameId, ...state })
  })

  it('clears progress while retaining a chosen theme and unrelated preferences', () => {
    localStorage.setItem('scotts-dice-game.confirm-scratches', 'false')
    guestGameStore.saveTheme('vegas')
    guestGameStore.saveGame(gameId, game)
    guestGameStore.deleteSavedGame()
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ version: 1, theme: 'vegas' })
    expect(localStorage.getItem('scotts-dice-game.confirm-scratches')).toBe('false')
    guestGameStore.saveTheme('classic')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not retain empty or finished games', () => {
    guestGameStore.saveGame(gameId, createInitialGameState())
    expect(localStorage.getItem(KEY)).toBeNull()
    guestGameStore.saveGame(gameId, game)
    guestGameStore.saveGame(gameId, createInitialGameState({
      scores: Object.fromEntries(ALL_CATEGORIES.map(({ id }) => [id, 0])),
    }))
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it.each(['broken JSON', 'null', '[]', '{}', '{"version":2}', '{"version":1,"theme":"missing"}'])(
    'ignores invalid or unsupported data: %s', (value) => {
      localStorage.setItem(KEY, value)
      expect(guestGameStore.getGameSession()).toEqual({ theme: 'classic', savedGame: null })
    },
  )

  it.each([
    { gameId: null }, { gameId: 'invalid' }, { dice: null }, { dice: [1] },
    { dice: [0, 2, 3, 4, 5] }, { dice: [7, 2, 3, 4, 5] }, { dice: [null, 2, 3, 4, 5] },
    { heldDice: null }, { heldDice: [false] }, { heldDice: [1, false, false, false, false] },
    { rollCount: -1 }, { rollCount: 5 }, { rollCount: 1.5 }, { rollCount: 0 },
    { extraRollsUsed: -1 }, { extraRollsUsed: 4 }, { extraRollsUsed: 0 },
    { scores: null }, { scores: [] }, { scores: 7 }, { scores: { unknown: 0 } },
    { scores: { ones: -1 } }, { scores: { ones: 251 } }, { scores: { ones: 0.5 } },
    { status: null }, { status: 'x'.repeat(501) }, { statusTone: 'invalid' },
    { dice: Array(5).fill(null), rollCount: 0 },
  ])('discards malformed game fields without losing the theme: %j', (overrides) => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, theme: 'fire', savedGame: { ...game, ...overrides } }))
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'fire', savedGame: null })
  })

  it.each(['getItem', 'setItem', 'removeItem'])('keeps working when storage %s fails', (method) => {
    jest.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('Storage unavailable') })
    expect(() => guestGameStore.saveGame(gameId, game)).not.toThrow()
    expect(() => guestGameStore.saveTheme('fire')).not.toThrow()
    expect(() => guestGameStore.deleteSavedGame()).not.toThrow()
    expect(() => guestGameStore.getGameSession()).not.toThrow()
  })

  it('handles browsers that deny access to localStorage entirely', () => {
    jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Blocked') })
    expect(guestGameStore.getGameSession()).toEqual({ theme: 'classic', savedGame: null })
    expect(() => guestGameStore.saveGame(gameId, game)).not.toThrow()
    expect(() => guestGameStore.deleteSavedGame()).not.toThrow()
  })
})
