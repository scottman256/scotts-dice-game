import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import DiceRoller from './DiceRoller'
import { ALL_CATEGORIES } from '../gameRules'
import { GAME_THEMES } from '../settings/gameThemes'

const savedTurn = {
  dice: [1, 2, 3, 4, 5],
  heldDice: [true, false, true, false, false],
  rollCount: 1,
}

function roll() {
  fireEvent.click(screen.getByRole('button', { name: /^(Roll Dice|Roll Again|Use 4th Roll)/ }))
}

describe('dice roll animation', () => {
  it.each(GAME_THEMES.map(({ id }) => id))(
    'tumbles only unheld dice in the %s theme without changing results or saving extra state',
    (theme) => {
      const faceRoller = jest.fn(() => 6)
      const onGameStateChange = jest.fn()
      const { container } = render(
        <DiceRoller theme={theme} initialState={savedTurn} faceRoller={faceRoller} onGameStateChange={onGameStateChange} />,
      )
      const heldDie = screen.getByRole('button', { name: /Die 1 showing 1/ })
      const heldArtwork = heldDie.querySelector('img')
      expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()

      roll()

      expect(container.querySelector('.dice-row')).toHaveAttribute('data-dice-theme', theme)
      expect(container.querySelectorAll('.die-tumbling')).toHaveLength(3)
      expect(container.querySelector('.die-held .die-tumbling')).not.toBeInTheDocument()
      expect(heldDie.querySelector('img')).toBe(heldArtwork)
      expect(heldDie).toHaveAttribute('aria-pressed', 'true')
      expect(faceRoller).toHaveBeenCalledTimes(3)
      expect(screen.getByLabelText('Dice total 22')).toBeVisible()
      expect(onGameStateChange).toHaveBeenCalledTimes(1)
      expect(onGameStateChange.mock.calls[0][0].state).toEqual(expect.objectContaining({
        dice: [1, 6, 3, 6, 6], heldDice: savedTurn.heldDice, rollCount: 2,
      }))

      container.querySelectorAll('.die-tumbling').forEach((face) => fireEvent.animationEnd(face))

      expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
      expect(onGameStateChange).toHaveBeenCalledTimes(1)
      expect(faceRoller).toHaveBeenCalledTimes(3)
    },
  )

  it('restarts the tumble on rapid consecutive rolls even when every face is unchanged', () => {
    const faceRoller = jest.fn(() => 2)
    const { container } = render(<DiceRoller faceRoller={faceRoller} />)
    roll()
    const firstFaces = [...container.querySelectorAll('.die-tumbling')]
    expect(firstFaces).toHaveLength(5)
    const firstDie = screen.getByRole('button', { name: /Die 1 showing 2/ })
    firstDie.focus()

    roll()

    expect(screen.getByLabelText('Roll 2')).toBeVisible()
    expect(faceRoller).toHaveBeenCalledTimes(10)
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
    firstFaces.forEach((face) => expect(face).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Die 1 showing 2/ })).toBe(firstDie)
    expect(firstDie).toHaveFocus()
  })

  it('stops a tumble when a die is held and does not replay it when released', () => {
    const { container } = render(<DiceRoller faceRoller={() => 2} />)
    roll()
    const die = screen.getByRole('button', { name: /Die 1 showing 2/ })
    fireEvent.click(die)
    expect(die).toHaveAttribute('aria-pressed', 'true')
    expect(die.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(4)

    fireEvent.click(die)
    expect(die).toHaveAttribute('aria-pressed', 'false')
    expect(die.querySelector('.die-tumbling')).not.toBeInTheDocument()
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
  })

  it('leaves all dice still when all five are held', () => {
    const faceRoller = jest.fn(() => 6)
    const { container } = render(<DiceRoller faceRoller={faceRoller} initialState={{
      ...savedTurn, heldDice: [true, true, true, true, true],
    }} />)
    roll()
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(faceRoller).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Dice total 15')).toBeVisible()
    expect(screen.getByLabelText('Roll 2')).toBeVisible()
  })

  it('applies motion changes immediately and only animates new rolls when re-enabled', () => {
    const faceRoller = jest.fn(() => 2)
    const { container, rerender } = render(<DiceRoller faceRoller={faceRoller} />)
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)

    rerender(<DiceRoller faceRoller={faceRoller} animateRolls={false} />)
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    roll()
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Roll 2')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Score 10 points in Twos' })).toBeEnabled()

    rerender(<DiceRoller faceRoller={faceRoller} animateRolls />)
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
    expect(faceRoller).toHaveBeenCalledTimes(15)
  })

  it('allows scoring during motion and animates the next turn normally', () => {
    const { container } = render(<DiceRoller faceRoller={() => 2} />)
    roll()
    fireEvent.click(screen.getByRole('button', { name: 'Score 10 points in Twos' }))
    expect(screen.getByLabelText('Twos: 10 points')).toBeVisible()
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /has not been rolled/ })).toHaveLength(5)
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
    expect(screen.getByLabelText('Roll 1')).toBeVisible()
  })

  it('animates the fourth roll without allowing a fifth roll or spending another chance', () => {
    const faceRoller = jest.fn(() => 6)
    const { container } = render(<DiceRoller faceRoller={faceRoller} initialState={{ ...savedTurn, rollCount: 3 }} />)
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(3)
    expect(screen.getByLabelText('Roll 4')).toBeVisible()
    expect(screen.getByText('2 of 3 remaining for this game')).toBeVisible()
    const rollButton = screen.getByRole('button', { name: 'Cash In a Score' })
    expect(rollButton).toBeDisabled()
    fireEvent.click(rollButton)
    expect(faceRoller).toHaveBeenCalledTimes(3)
  })

  it('clears motion when the final category is scored and starts a fresh game normally', () => {
    const scores = Object.fromEntries(ALL_CATEGORIES.filter(({ id }) => id !== 'twos').map(({ id }) => [id, 0]))
    const onGameComplete = jest.fn()
    const { container } = render(<DiceRoller faceRoller={() => 2} initialState={{ scores }} onGameComplete={onGameComplete} />)
    roll()
    fireEvent.click(screen.getByRole('button', { name: 'Score 10 points in Twos' }))
    expect(container.querySelector('.die-tumbling')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Game Complete' })).toBeDisabled()
    expect(onGameComplete).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getAllByRole('button', { name: 'New Game' })[0])
    roll()
    expect(container.querySelectorAll('.die-tumbling')).toHaveLength(5)
    expect(screen.getByText('0/19 filled')).toBeVisible()
  })
})
