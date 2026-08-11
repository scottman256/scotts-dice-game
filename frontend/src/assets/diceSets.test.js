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

  it('provides and wires full-scene vector backgrounds for every immersive theme', () => {
    const backgrounds = {
      rainbow: ['id="rainbow-scene"', 'id="six-color-rainbow"', 'id="prism-clouds"'],
      fire: ['id="fire-scene"', 'id="flame-field"'],
      beach: ['id="beach-scene"', 'id="sun-haze"'],
      sky: ['id="sky-scene"', 'id="sun-rays"', 'id="cloud-sea"'],
      christmas: ['id="christmas-scene"', 'id="festive-lights"'],
      halloween: ['id="halloween-scene"', 'id="bat-swarm"', 'id="eerie-moon"'],
      golden: ['id="golden-scene"', 'id="art-deco-fan"', 'id="golden-columns"'],
      'retro-arcade': ['id="arcade-scene"', 'id="neon-grid"', 'id="arcade-cabinets"'],
      vegas: ['id="vegas-scene"', 'id="premium-resorts"', 'id="strip-fountains"'],
      american: ['id="american-scene"', 'id="freedom-fireworks"'],
      'cosmic-galaxy': ['id="cosmic-scene"', 'id="nebula-cloud"', 'id="ringed-planet"', 'id="red-giant"', 'id="accurate-comet"'],
      'world-traveler': ['id="traveler-scene"', 'id="world-map"', 'id="flight-route"'],
      baseball: ['id="baseball-scene"', 'id="ballpark-lights"', 'id="baseball-diamond"'],
      'candy-kingdom': ['id="candy-scene"', 'id="candy-pieces"'],
      'frozen-crystal': ['id="frozen-scene"', 'id="aurora-sky"', 'id="crystal-cavern"'],
      'deep-sea': ['id="deep-sea-scene"', 'id="jelly-glow"'],
      'jungle-adventure': ['id="jungle-scene"', 'id="canopy-light"'],
    }
    const stylesheet = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

    Object.entries(backgrounds).forEach(([themeId, signatures]) => {
      const path = join(process.cwd(), 'src', 'assets', themeId, 'background.svg')
      expect(existsSync(path)).toBe(true)
      const svg = readFileSync(path, 'utf8')
      signatures.forEach((signature) => expect(svg).toContain(signature))
      expect(stylesheet).toContain(`url("./assets/${themeId}/background.svg")`)
    })

    const rainbowSvg = readFileSync(join(process.cwd(), 'src', 'assets', 'rainbow', 'background.svg'), 'utf8')
    expect([...rainbowSvg.matchAll(/data-rainbow-band="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'red', 'orange', 'yellow', 'green', 'blue', 'violet',
    ])

    const travelerSvg = readFileSync(join(process.cwd(), 'src', 'assets', 'world-traveler', 'background.svg'), 'utf8')
    expect(travelerSvg).not.toContain('id="landmark-silhouettes"')
  })

  it('does not leave the legacy dice files loose in the assets root', () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(existsSync(join(process.cwd(), 'src', 'assets', `dice-${face}.svg`))).toBe(false)
    }
  })
})
