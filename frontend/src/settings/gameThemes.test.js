import { describe, expect, it } from '@jest/globals'
import {
  DEFAULT_GAME_SETTINGS,
  GAME_SETTING_DEFINITIONS,
  GAME_THEMES,
  isGameTheme,
  normalizeGameSettings,
} from './gameThemes'

describe('game theme settings', () => {
  it('defines the fourteen requested themes in display order', () => {
    expect(GAME_THEMES.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'classic', label: 'Classic' },
      { id: 'rainbow', label: 'Rainbow' },
      { id: 'fire', label: 'Fire' },
      { id: 'beach', label: 'Beach' },
      { id: 'sky', label: 'Sky' },
      { id: 'christmas', label: 'Christmas' },
      { id: 'halloween', label: 'Halloween' },
      { id: 'golden', label: 'Golden' },
      { id: 'retro-arcade', label: 'Retro Arcade' },
      { id: 'vegas', label: 'Vegas' },
      { id: 'american', label: 'American' },
      { id: 'cosmic-galaxy', label: 'Cosmic Galaxy' },
      { id: 'sixties-tie-dye', label: '60s Tie-Dye' },
      { id: 'world-traveler', label: 'World Traveler' },
    ])
    expect(new Set(GAME_THEMES.map(({ id }) => id))).toHaveProperty('size', 14)
    GAME_THEMES.forEach((theme) => expect(theme.description).not.toHaveLength(0))
  })

  it('exposes a data-driven setting definition for future settings sections', () => {
    expect(GAME_SETTING_DEFINITIONS).toEqual([
      expect.objectContaining({
        id: 'theme',
        label: 'Game style',
        options: GAME_THEMES,
      }),
    ])
  })

  it.each([
    'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
    'retro-arcade', 'vegas',
    'american', 'cosmic-galaxy',
    'sixties-tie-dye', 'world-traveler',
  ])(
    'recognizes %s as a supported theme',
    (themeId) => expect(isGameTheme(themeId)).toBe(true),
  )

  it('rejects unsupported and missing theme identifiers', () => {
    expect(isGameTheme('neon')).toBe(false)
    expect(isGameTheme()).toBe(false)
  })

  it('uses Classic by default and normalizes invalid settings', () => {
    expect(DEFAULT_GAME_SETTINGS).toEqual({ theme: 'classic' })
    expect(normalizeGameSettings()).toEqual({ theme: 'classic' })
    expect(normalizeGameSettings({ theme: 'unknown' })).toEqual({ theme: 'classic' })
  })

  it('keeps valid and future setting values while normalizing the theme', () => {
    expect(normalizeGameSettings({ theme: 'beach', sound: 'quiet' })).toEqual({
      theme: 'beach',
      sound: 'quiet',
    })
  })
})
