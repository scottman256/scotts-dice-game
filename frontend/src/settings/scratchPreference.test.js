import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { loadConfirmScratches, saveConfirmScratches } from './scratchPreference'

const STORAGE_KEY = 'scotts-dice-game.confirm-scratches'

describe('scratch confirmation preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    window.localStorage.clear()
  })

  it('asks for confirmation by default', () => {
    expect(loadConfirmScratches()).toBe(true)
  })

  it.each([false, true])('persists and reloads an explicit preference of %s', (enabled) => {
    saveConfirmScratches(enabled)

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(enabled))
    expect(loadConfirmScratches()).toBe(enabled)
  })

  it('can re-enable confirmation after it has been disabled', () => {
    saveConfirmScratches(false)
    expect(loadConfirmScratches()).toBe(false)

    saveConfirmScratches(true)
    expect(loadConfirmScratches()).toBe(true)
  })

  it.each(['', '0', 'FALSE', 'null', '{}', 'not-a-preference'])(
    'defaults to confirmation when browser storage contains an invalid value: %s',
    (value) => {
      window.localStorage.setItem(STORAGE_KEY, value)

      expect(loadConfirmScratches()).toBe(true)
    },
  )

  it('defaults to confirmation when reading storage fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    expect(loadConfirmScratches()).toBe(true)
  })

  it('does not interrupt the game when saving the preference fails', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })

    expect(() => saveConfirmScratches(false)).not.toThrow()
  })

  it('handles browsers that reject access to localStorage itself', () => {
    jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage access denied')
    })

    expect(loadConfirmScratches()).toBe(true)
    expect(() => saveConfirmScratches(false)).not.toThrow()
  })
})
