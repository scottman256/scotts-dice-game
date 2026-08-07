import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BOTTOM_CATEGORIES, CATEGORY_COUNT, TOP_CATEGORIES } from '../gameRules'
import HowToPlayScreen from './HowToPlayScreen'

describe('HowToPlayScreen', () => {
  it('explains the complete turn flow and renders every canonical scoring category', async () => {
    const onBack = jest.fn()
    const user = userEvent.setup()
    render(<HowToPlayScreen sessionKind="signedOut" user={null} onBack={onBack} />)

    expect(screen.getByRole('main', { name: 'How to Play' })).toBeVisible()
    expect(screen.getByLabelText('Game overview')).toHaveTextContent(`${CATEGORY_COUNT} categories`)
    expect(screen.getByRole('heading', { name: 'Roll. Hold. Score.' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Three fourth-roll chances per game' })).toBeVisible()
    expect(screen.getByLabelText('3 fourth-roll chances')).toBeVisible()

    const topSection = screen.getByRole('region', { name: 'Top Section' })
    const bottomSection = screen.getByRole('region', { name: 'Bottom Section' })
    TOP_CATEGORIES.forEach(({ label, description }) => {
      const categoryRow = within(topSection).getByText(label).parentElement
      expect(categoryRow).toHaveTextContent(description)
    })
    BOTTOM_CATEGORIES.forEach(({ label, description }) => {
      const categoryRow = within(bottomSection).getByText(label).parentElement
      expect(categoryRow).toHaveTextContent(description)
    })

    expect(screen.getByText('100')).toBeVisible()
    expect(screen.getByText('+40 points')).toBeVisible()
    expect(screen.getByText('125')).toBeVisible()
    expect(screen.getByText('+25 more')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your game is ready when you return' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('adds backend features for a signed-in player without exposing admin controls', () => {
    render(
      <HowToPlayScreen
        sessionKind="authenticated"
        user={{ name: 'Dice Player', admin: false }}
        onBack={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Back to game' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your game is ready when you return' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Resume anywhere' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Track every finish' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Unlock achievements' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Shape the whole game room' }))
      .not.toBeInTheDocument()
  })

  it('adds the administrator toolkit beneath the signed-in feature section', () => {
    render(
      <HowToPlayScreen
        sessionKind="authenticated"
        user={{ name: 'admin', admin: true }}
        onBack={jest.fn()}
      />,
    )

    const memberHeading = screen.getByRole('heading', { name: 'Your game is ready when you return' })
    const adminHeading = screen.getByRole('heading', { name: 'Shape the whole game room' })
    expect(memberHeading).toBeVisible()
    expect(adminHeading).toBeVisible()
    expect(memberHeading.compareDocumentPosition(adminHeading) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Control available themes' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Manage player accounts' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Curate the leaderboard' })).toBeVisible()
  })
})
