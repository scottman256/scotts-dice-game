const STORAGE_KEY = 'scotts-dice-game.animate-rolls'

export function loadAnimateRolls() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveAnimateRolls(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // The preference still works for the current session when storage is unavailable.
  }
}
