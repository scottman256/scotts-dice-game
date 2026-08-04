import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GAME_THEMES } from '../settings/gameThemes'
import AdminSettingsScreen from './AdminSettingsScreen'

const enabledThemes = GAME_THEMES.map(({ id }) => ({ id, enabled: true }))

function renderScreen(overrides = {}) {
  const props = {
    loadSettings: jest.fn(() => Promise.resolve({ themes: enabledThemes })),
    updateTheme: jest.fn((themeId, enabled) => Promise.resolve({
      themes: enabledThemes.map((theme) => theme.id === themeId ? { ...theme, enabled } : theme),
    })),
    resetGameData: jest.fn(() => Promise.resolve({ scoresDeleted: 4 })),
    onThemeAvailabilityChange: jest.fn(),
    onGameDataReset: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  }
  return { props, user: userEvent.setup(), ...render(<AdminSettingsScreen {...props} />) }
}

describe('AdminSettingsScreen', () => {
  it('lists every theme without previews, keeps Classic locked, and updates availability', async () => {
    const { container, props, user } = renderScreen()

    expect(await screen.findByRole('heading', { name: 'Theme availability' })).toBeVisible()
    expect(screen.getAllByRole('switch')).toHaveLength(18)
    expect(screen.getByRole('switch', { name: 'Classic theme' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Classic theme' })).toBeDisabled()
    expect(container.querySelector('.theme-preview')).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Candy Kingdom theme' }))
    expect(props.updateTheme).toHaveBeenCalledWith('candy-kingdom', false)
    expect(props.onThemeAvailabilityChange).toHaveBeenCalledWith(expect.arrayContaining([
      { id: 'candy-kingdom', enabled: false },
    ]))
  })

  it('confirms a game-data reset and reports success', async () => {
    const { props, user } = renderScreen()
    await screen.findByRole('heading', { name: 'Theme availability' })

    await user.click(screen.getByRole('button', { name: 'Reset all game data' }))
    const dialog = screen.getByRole('dialog', { name: 'Reset all game data?' })
    await user.click(within(dialog).getByRole('button', { name: 'Reset game data' }))

    expect(props.resetGameData).toHaveBeenCalledTimes(1)
    expect(props.onGameDataReset).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent('restored to the original leaderboard state')
  })

  it('shows a useful error when settings cannot load', async () => {
    renderScreen({ loadSettings: jest.fn(() => Promise.reject(new Error('Access denied.'))) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied.')
  })

  it('keeps the current theme state when an update fails', async () => {
    const { props, user } = renderScreen({
      updateTheme: jest.fn(() => Promise.reject({})),
    })
    await screen.findByRole('heading', { name: 'Theme availability' })

    await user.click(screen.getByRole('switch', { name: 'Vegas theme' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The theme setting could not be changed.')
    expect(screen.getByRole('switch', { name: 'Vegas theme' })).toBeChecked()
    expect(props.onThemeAvailabilityChange).not.toHaveBeenCalled()
  })

  it('can cancel a reset and reports a reset failure without losing settings', async () => {
    const { props, user } = renderScreen({
      resetGameData: jest.fn(() => Promise.reject({})),
    })
    await screen.findByRole('heading', { name: 'Theme availability' })

    await user.click(screen.getByRole('button', { name: 'Reset all game data' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset all game data' }))
    await user.click(screen.getByRole('button', { name: 'Reset game data' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Game data could not be reset.')
    expect(props.onGameDataReset).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Theme availability' })).toBeVisible()
  })
})
