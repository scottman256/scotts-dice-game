import { describe, expect, it } from '@jest/globals'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DICE_SETS, getDiceSet } from './diceSets'

const THEME_IDS = [
  'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
  'retro-arcade', 'vegas',
  'american', 'cosmic-galaxy',
  'sixties-tie-dye', 'world-traveler',
]
const THEME_SIGNATURES = Object.freeze({
  rainbow: ['id="body"', 'id="pip"'],
  fire: ['id="rock"', 'id="flame"'],
  beach: ['id="sand"', 'id="star"'],
  sky: ['id="cloud"', 'id="drop"'],
  christmas: ['id="gift"', 'id="snowflake"'],
  halloween: ['id="pumpkin"', 'id="bat"'],
  golden: ['id="gold"', 'id="gold-pip"'],
  'retro-arcade': ['id="pixel-grid"', 'id="pixel-pip"'],
  vegas: ['id="vegas-night"', 'id="casino-chip"', 'id="neon-marquee"'],
  american: ['id="flag-stripes"', 'id="liberty-star"'],
  'cosmic-galaxy': ['id="nebula"', 'id="orbit-planet"'],
  'sixties-tie-dye': ['id="tie-dye-swirl"', 'id="flower-pip"'],
  'world-traveler': ['id="map-paper"', 'id="compass-pip"'],
})

function assetPath(themeId, face) {
  return join(process.cwd(), 'src', 'assets', themeId, `dice-${face}.svg`)
}

describe('themed dice assets', () => {
  it('registers a complete, immutable six-face set for every game theme', () => {
    expect(Object.keys(DICE_SETS)).toEqual(THEME_IDS)

    THEME_IDS.forEach((themeId) => {
      expect(DICE_SETS[themeId]).toMatchObject({ id: themeId })
      expect(DICE_SETS[themeId].faces).toHaveLength(6)
      expect(Object.isFrozen(DICE_SETS[themeId])).toBe(true)
      expect(Object.isFrozen(DICE_SETS[themeId].faces)).toBe(true)
    })
  })

  it('falls back to the Classic set for unknown or missing themes', () => {
    expect(getDiceSet('rainbow')).toBe(DICE_SETS.rainbow)
    expect(getDiceSet('unknown')).toBe(DICE_SETS.classic)
    expect(getDiceSet()).toBe(DICE_SETS.classic)
  })

  it('stores every face in its theme folder with the correct pip count', () => {
    THEME_IDS.forEach((themeId) => {
      for (let face = 1; face <= 6; face += 1) {
        const path = assetPath(themeId, face)
        expect(existsSync(path)).toBe(true)

        const svg = readFileSync(path, 'utf8')
        const pipPattern = themeId === 'classic' ? /<circle\b/g : /href="#pip"/g
        expect(svg.match(pipPattern) ?? []).toHaveLength(face)
      }
    })
  })

  it('gives every non-Classic theme its own graphical SVG vocabulary', () => {
    Object.entries(THEME_SIGNATURES).forEach(([themeId, signatures]) => {
      for (let face = 1; face <= 6; face += 1) {
        const svg = readFileSync(assetPath(themeId, face), 'utf8')
        expect(svg).toContain(`data-theme="${themeId}"`)
        expect(svg).toContain(`data-face="${face}"`)
        signatures.forEach((signature) => expect(svg).toContain(signature))
      }
    })
  })

  it('does not leave the legacy dice files loose in the assets root', () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(existsSync(join(process.cwd(), 'src', 'assets', `dice-${face}.svg`))).toBe(false)
    }
  })
})
