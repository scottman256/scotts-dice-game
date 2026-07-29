import { describe, expect, it, jest } from '@jest/globals'
import { randomFace, rollUnheldDice } from './diceLogic'

describe('randomFace', () => {
  it.each([
    [0, 1],
    [0.16, 1],
    [1 / 6, 2],
    [0.5, 4],
    [5 / 6, 6],
    [0.999999, 6],
  ])('maps Math.random value %s to die face %s', (randomValue, expectedFace) => {
    jest.spyOn(Math, 'random').mockReturnValue(randomValue)

    expect(randomFace()).toBe(expectedFace)
  })
})

describe('rollUnheldDice', () => {
  it('rolls every die in a fresh hand in order', () => {
    const values = [6, 1, 5, 2, 4]
    const faceRoller = jest.fn(() => values.shift())

    expect(rollUnheldDice(
      [null, null, null, null, null],
      [false, false, false, false, false],
      faceRoller,
    )).toEqual([6, 1, 5, 2, 4])
    expect(faceRoller).toHaveBeenCalledTimes(5)
  })

  it('preserves held values and rolls only unheld dice', () => {
    const faceRoller = jest.fn()
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6)

    const result = rollUnheldDice(
      [1, 2, 3, 4, 5],
      [true, false, true, false, true],
      faceRoller,
    )

    expect(result).toEqual([1, 5, 3, 6, 5])
    expect(faceRoller).toHaveBeenCalledTimes(2)
  })

  it('rolls a held position if it does not yet contain a value', () => {
    const faceRoller = jest.fn(() => 4)

    const result = rollUnheldDice(
      [null, 2, 3, 4, 5],
      [true, true, true, true, true],
      faceRoller,
    )

    expect(result).toEqual([4, 2, 3, 4, 5])
    expect(faceRoller).toHaveBeenCalledTimes(1)
  })

  it('returns a new array without mutating the dice or hold inputs', () => {
    const dice = Object.freeze([1, 2, 3, 4, 5])
    const heldDice = Object.freeze([true, true, true, true, true])

    const result = rollUnheldDice(dice, heldDice, jest.fn(() => 6))

    expect(result).toEqual(dice)
    expect(result).not.toBe(dice)
    expect(dice).toEqual([1, 2, 3, 4, 5])
    expect(heldDice).toEqual([true, true, true, true, true])
  })
})
