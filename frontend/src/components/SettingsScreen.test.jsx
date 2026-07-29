import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsScreen from './SettingsScreen'

function renderSettings(overrides = {}) {
  const props = {
    currentSettings: { theme: 'classic' },
    onCancel: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  }
  return { props, user: userEvent.setup(), ...render(<SettingsScreen {...props} />) }
}

describe('SettingsScreen', () => {
  it('renders an accessible, focused settings page with all fourteen style choices', () => {
    const { container } = renderSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Game settings' })).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Game style' })).toBeVisible()
    expect(screen.getByText(/without interrupting your current turn or score/i)).toBeVisible()

    const expectedThemes = [
      'Classic', 'Rainbow', 'Fire', 'Beach', 'Sky', 'Christmas', 'Halloween', 'Golden',
      'Retro Arcade', 'Vegas',
      'American', 'Cosmic Galaxy',
      '60s Tie-Dye', 'World Traveler',
    ]
    expectedThemes.forEach((theme) => {
      expect(screen.getByRole('radio', { name: new RegExp(`^${theme}`) })).toBeVisible()
    })
    expect(screen.getAllByRole('radio')).toHaveLength(14)
    expect(screen.getByRole('radio', { name: /^Classic/ })).toBeChecked()
    ;[
      'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
      'retro-arcade', 'vegas',
      'american', 'cosmic-galaxy',
      'sixties-tie-dye', 'world-traveler',
    ]
      .forEach((themeId) => {
      expect(container.querySelector(`[data-preview-theme="${themeId}"] img.preview-die`))
        .toHaveAttribute('src', 'test-file-stub')
      })
  })

  it.each([
    ['Classic', 'classic'],
    ['Rainbow', 'rainbow'],
    ['Fire', 'fire'],
    ['Beach', 'beach'],
    ['Sky', 'sky'],
    ['Christmas', 'christmas'],
    ['Halloween', 'halloween'],
    ['Golden', 'golden'],
    ['Retro Arcade', 'retro-arcade'],
    ['Vegas', 'vegas'],
    ['American', 'american'],
    ['Cosmic Galaxy', 'cosmic-galaxy'],
    ['60s Tie-Dye', 'sixties-tie-dye'],
    ['World Traveler', 'world-traveler'],
  ])('saves the %s selection as normalized settings', async (label, themeId) => {
    const { props, user } = renderSettings({ currentSettings: { theme: 'fire' } })

    await user.click(screen.getByRole('radio', { name: new RegExp(`^${label}`) }))
    expect(props.onSave).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save style & return to game' }))

    expect(props.onSave).toHaveBeenCalledWith({ theme: themeId })
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it('discards draft changes when Cancel is selected', async () => {
    const { props, user } = renderSettings()

    await user.click(screen.getByRole('radio', { name: /Sky/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('falls back to Classic for invalid incoming settings', () => {
    renderSettings({ currentSettings: { theme: 'not-a-theme' } })

    expect(screen.getByRole('radio', { name: /^Classic/ })).toBeChecked()
  })
})
