import { describe, expect, it } from '@jest/globals'
import {
  DEFAULT_GAME_SETTINGS,
  GAME_SETTING_DEFINITIONS,
  GAME_THEMES,
  isGameTheme,
  normalizeGameSettings,
} from './gameThemes'

describe('game theme settings', () => {
  it('defines the twenty requested themes in display order', () => {
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
      { id: 'clockwork', label: 'Clockwork' },
      { id: 'baseball', label: 'Baseball' },
      { id: 'candy-kingdom', label: 'Candy Kingdom' },
      { id: 'frozen-crystal', label: 'Frozen Crystal' },
      { id: 'deep-sea', label: 'Deep Sea' },
      { id: 'jungle-adventure', label: 'Jungle Adventure' },
    ])
    expect(new Set(GAME_THEMES.map(({ id }) => id))).toHaveProperty('size', 20)
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
    'sixties-tie-dye', 'world-traveler', 'clockwork', 'baseball',
    'candy-kingdom', 'frozen-crystal', 'deep-sea', 'jungle-adventure',
  ])(
    'recognizes %s as a supported theme',
    (themeId) => expect(isGameTheme(themeId)).toBe(true),
  )

  it('rejects unsupported and missing theme identifiers', () => {
    expect(isGameTheme('neon')).toBe(false)
    expect(isGameTheme()).toBe(false)
  })

  it('uses Classic by default and normalizes invalid settings', () => {
    expect(DEFAULT_GAME_SETTINGS).toEqual({ theme: 'classic', confirmScratches: true })
    expect(normalizeGameSettings()).toEqual({ theme: 'classic', confirmScratches: true })
    expect(normalizeGameSettings({ theme: 'unknown' })).toEqual({ theme: 'classic', confirmScratches: true })
  })

  it.each([true, false])('preserves the explicit scratch-confirmation preference %s', (confirmScratches) => {
    expect(normalizeGameSettings({ theme: 'vegas', confirmScratches })).toEqual({
      theme: 'vegas',
      confirmScratches,
    })
  })

  it.each([undefined, null, 'false', 'true', 0, 1])(
    'enables scratch confirmation when the incoming preference is invalid: %s',
    (confirmScratches) => {
      expect(normalizeGameSettings({ confirmScratches }).confirmScratches).toBe(true)
    },
  )

  it('keeps valid and future setting values while normalizing the theme', () => {
    expect(normalizeGameSettings({ theme: 'beach', sound: 'quiet' })).toEqual({
      theme: 'beach',
      confirmScratches: true,
      sound: 'quiet',
    })
  })
})
