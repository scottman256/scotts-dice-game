import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { loadAnimateRolls, saveAnimateRolls } from './rollMotionPreference'

const STORAGE_KEY = 'scotts-dice-game.animate-rolls'

describe('roll motion preference', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    jest.restoreAllMocks()
    window.localStorage.clear()
  })

  it('enables animation by default', () => {
    expect(loadAnimateRolls()).toBe(true)
  })

  it('remembers disabling and re-enabling animation', () => {
    saveAnimateRolls(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')
    expect(loadAnimateRolls()).toBe(false)

    saveAnimateRolls(true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(loadAnimateRolls()).toBe(true)
  })

  it.each(['', '0', 'FALSE', 'null', '{}'])('ignores invalid stored values: %s', (value) => {
    window.localStorage.setItem(STORAGE_KEY, value)
    expect(loadAnimateRolls()).toBe(true)
  })

  it('uses the default if reading storage fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    expect(loadAnimateRolls()).toBe(true)
  })

  it('does not interrupt play if saving fails', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    expect(() => saveAnimateRolls(false)).not.toThrow()
  })

  it('handles browsers that block localStorage access', () => {
    jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage access denied')
    })
    expect(loadAnimateRolls()).toBe(true)
    expect(() => saveAnimateRolls(false)).not.toThrow()
  })
})
