const STORAGE_KEY = 'scotts-dice-game.confirm-scratches'

export function loadConfirmScratches() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveConfirmScratches(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // The preference still works for the current session when storage is unavailable.
  }
}
