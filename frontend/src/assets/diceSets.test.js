import { describe, expect, it } from '@jest/globals'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DICE_SETS, getDiceSet } from './diceSets'

const THEME_IDS = [
  'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
  'retro-arcade', 'vegas',
  'american', 'cosmic-galaxy',
  'sixties-tie-dye', 'world-traveler', 'clockwork', 'baseball',
  'candy-kingdom', 'frozen-crystal', 'deep-sea', 'jungle-adventure',
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
  clockwork: ['id="brass-plate"', 'id="gear-pip"'],
  baseball: ['id="leather-shell"', 'id="baseball-pip"'],
  'candy-kingdom': ['id="candy-shell"', 'id="peppermint-pip"'],
  'frozen-crystal': ['id="ice-crystal"', 'id="snow-crystal-pip"'],
  'deep-sea': ['id="abyss-shell"', 'id="bioluminescent-pip"'],
  'jungle-adventure': ['id="stone-shell"', 'id="vine-pip"'],
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

  it('provides full-scene vector backgrounds for the immersive new themes', () => {
    const backgrounds = {
      'deep-sea': ['id="deep-sea-scene"', 'id="jelly-glow"'],
      'jungle-adventure': ['id="jungle-scene"', 'id="canopy-light"'],
    }

    Object.entries(backgrounds).forEach(([themeId, signatures]) => {
      const path = join(process.cwd(), 'src', 'assets', themeId, 'background.svg')
      expect(existsSync(path)).toBe(true)
      const svg = readFileSync(path, 'utf8')
      signatures.forEach((signature) => expect(svg).toContain(signature))
    })
  })

  it('does not leave the legacy dice files loose in the assets root', () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(existsSync(join(process.cwd(), 'src', 'assets', `dice-${face}.svg`))).toBe(false)
    }
  })
})
