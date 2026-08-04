export const DEFAULT_GAME_SETTINGS = Object.freeze({
  theme: 'classic',
})

export const GAME_THEMES = Object.freeze([
  Object.freeze({
    id: 'classic',
    label: 'Classic',
    description: 'Crisp ivory dice with traditional round pips on deep navy felt.',
  }),
  Object.freeze({
    id: 'rainbow',
    label: 'Rainbow',
    description: 'Candy-glass rainbow dice with playful starburst pips.',
  }),
  Object.freeze({
    id: 'fire',
    label: 'Fire',
    description: 'Jagged obsidian dice cracked with lava and flame-shaped pips.',
  }),
  Object.freeze({
    id: 'beach',
    label: 'Beach',
    description: 'Sun-washed sand tiles with ocean waves and starfish pips.',
  }),
  Object.freeze({
    id: 'sky',
    label: 'Sky',
    description: 'Soft cloud-shaped dice with glossy blue raindrop pips.',
  }),
  Object.freeze({
    id: 'christmas',
    label: 'Christmas',
    description: 'Festive wrapped-gift dice with snowy crystal pips and ribbon trim.',
  }),
  Object.freeze({
    id: 'halloween',
    label: 'Halloween',
    description: 'Carved pumpkin dice with spooky bat-shaped pips.',
  }),
  Object.freeze({
    id: 'golden',
    label: 'Golden',
    description: 'Classic dice cast completely from polished pure gold.',
  }),
  Object.freeze({
    id: 'retro-arcade',
    label: 'Retro Arcade',
    description: 'Pixel-cut cabinet dice with electric scanlines and 8-bit pips.',
  }),
  Object.freeze({
    id: 'vegas',
    label: 'Vegas',
    description: 'Deluxe casino dice blazing with neon, marquee bulbs, chips, and card-suit details.',
  }),
  Object.freeze({
    id: 'american',
    label: 'American',
    description: 'Patriotic stitched-badge dice with flag stripes and liberty-star pips.',
  }),
  Object.freeze({
    id: 'cosmic-galaxy',
    label: 'Cosmic Galaxy',
    description: 'Deep-space portal dice filled with nebula clouds and orbiting-planet pips.',
  }),
  Object.freeze({
    id: 'sixties-tie-dye',
    label: '60s Tie-Dye',
    description: 'Free-form psychedelic dice with liquid color swirls and flower-power pips.',
  }),
  Object.freeze({
    id: 'world-traveler',
    label: 'World Traveler',
    description: 'Vintage luggage dice with map textures, stitched corners, and compass pips.',
  }),
  Object.freeze({
    id: 'clockwork',
    label: 'Clockwork',
    description: 'Brass machine dice with verdigris pipes, rivets, and turning gear pips.',
  }),
  Object.freeze({
    id: 'baseball',
    label: 'Baseball',
    description: 'Vintage leather baseball dice with red seams, ball pips, and ballpark details.',
  }),
  Object.freeze({
    id: 'candy-kingdom',
    label: 'Candy Kingdom',
    description: 'Frosted candy tiles with striped sweets, sugar sparkle, and peppermint pips.',
  }),
  Object.freeze({
    id: 'frozen-crystal',
    label: 'Frozen Crystal',
    description: 'Faceted translucent ice dice with frosted edges and snow-crystal pips.',
  }),
])

export const GAME_SETTING_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'theme',
    label: 'Game style',
    description: 'Choose the color and atmosphere used throughout the dice table.',
    options: GAME_THEMES,
  }),
])

export function isGameTheme(themeId) {
  return GAME_THEMES.some(({ id }) => id === themeId)
}

export function normalizeGameSettings(settings = {}) {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...settings,
    theme: isGameTheme(settings.theme) ? settings.theme : DEFAULT_GAME_SETTINGS.theme,
  }
}
