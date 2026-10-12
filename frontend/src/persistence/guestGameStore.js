import { ALL_CATEGORIES, CATEGORY_COUNT } from '../gameRules'
import { DICE_COUNT, EXTRA_ROLL_LIMIT, NORMAL_ROLL_LIMIT, hasGameProgress } from '../gameState'
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings } from '../settings/gameThemes'

const STORAGE_KEY = 'scotts-dice-game.guest-session'
const VERSION = 1
const CATEGORY_IDS = new Set(ALL_CATEGORIES.map(({ id }) => id))

function isIntegerBetween(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum
}

function resumableGame(game) {
  if (!game || typeof game !== 'object'
    || typeof game.gameId !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(game.gameId)
    || !Array.isArray(game.dice) || game.dice.length !== DICE_COUNT
    || !Array.isArray(game.heldDice) || game.heldDice.length !== DICE_COUNT
    || !game.heldDice.every((held) => typeof held === 'boolean')
    || !isIntegerBetween(game.rollCount, 0, NORMAL_ROLL_LIMIT + 1)
    || !isIntegerBetween(game.extraRollsUsed, 0, EXTRA_ROLL_LIMIT)
    || (game.rollCount > NORMAL_ROLL_LIMIT && game.extraRollsUsed === 0)
    || !game.scores || typeof game.scores !== 'object' || Array.isArray(game.scores)
    || Object.keys(game.scores).length >= CATEGORY_COUNT
    || !Object.entries(game.scores).every(([id, score]) => CATEGORY_IDS.has(id) && isIntegerBetween(score, 0, 250))
    || typeof game.status !== 'string' || game.status.length > 500
    || !['normal', 'celebration', 'legendary'].includes(game.statusTone)) return null

  const validDice = game.rollCount === 0
    ? game.dice.every((face) => face === null) && game.heldDice.every((held) => !held)
    : game.dice.every((face) => isIntegerBetween(face, 1, 6))
  if (!validDice || !hasGameProgress(game)) return null

  // Persist only game state, never transient UI state or additional caller fields.
  return {
    gameId: game.gameId,
    dice: [...game.dice],
    heldDice: [...game.heldDice],
    rollCount: game.rollCount,
    scores: { ...game.scores },
    extraRollsUsed: game.extraRollsUsed,
    status: game.status,
    statusTone: game.statusTone,
  }
}

function getGameSession() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (stored?.version === VERSION) {
      return {
        theme: normalizeGameSettings({ theme: stored.theme }).theme,
        savedGame: resumableGame(stored.savedGame),
      }
    }
  } catch {
    // Missing, damaged, or inaccessible storage must not prevent guest play.
  }
  return { theme: DEFAULT_GAME_SETTINGS.theme, savedGame: null }
}

function writeSession({ theme, savedGame }) {
  try {
    if (!savedGame && theme === DEFAULT_GAME_SETTINGS.theme) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: VERSION,
      theme,
      ...(savedGame ? { savedGame } : {}),
    }))
  } catch {
    // Like other browser preferences, the game still works when storage is blocked or full.
  }
}

// Mirrors the backend's session operations, with synchronous writes after each action.
// One small record replaces the previous save; no history or cookies are created.
export const guestGameStore = Object.freeze({
  getGameSession,
  saveTheme(theme) {
    writeSession({ ...getGameSession(), theme: normalizeGameSettings({ theme }).theme })
  },
  saveGame(gameId, state) {
    writeSession({ ...getGameSession(), savedGame: resumableGame({ ...state, gameId }) })
  },
  deleteSavedGame() {
    writeSession({ ...getGameSession(), savedGame: null })
  },
})
