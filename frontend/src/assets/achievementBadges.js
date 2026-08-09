import baseballGame from './achievements/baseball-game.jpg'
import firstFiveKind from './achievements/first-five-kind.jpg'
import firstGame from './achievements/first-game.jpg'
import firstRollFiveKind from './achievements/first-roll-five-kind.jpg'
import fiveKinds100 from './achievements/five-kinds-100.jpg'
import fiveKinds50 from './achievements/five-kinds-50.jpg'
import fiveKinds500 from './achievements/five-kinds-500.jpg'
import games10 from './achievements/games-10.jpg'
import games100 from './achievements/games-100.jpg'
import games500 from './achievements/games-500.jpg'
import goldenGame from './achievements/golden-game.jpg'
import largeStraights1000 from './achievements/large-straights-1000.jpg'
import points5000 from './achievements/points-5000.jpg'
import points10000 from './achievements/points-10000.jpg'
import points25000 from './achievements/points-25000.jpg'
import points100000 from './achievements/points-100000.jpg'
import points1000000 from './achievements/points-1000000.jpg'
import points50000 from './achievements/points-50000.jpg'
import points500000 from './achievements/points-500000.jpg'
import score500 from './achievements/score-500.jpg'
import score600 from './achievements/score-600.jpg'
import score700 from './achievements/score-700.jpg'
import scoreUnder100 from './achievements/score-under-100.jpg'
import tenScores500 from './achievements/ten-scores-500.jpg'
import tripleCrown from './achievements/triple-crown.jpg'
import worldTravelerGame from './achievements/world-traveler-game.jpg'
import holidayWonder from './achievements/holiday-wonder.jpg'
import deepSeaGame from './achievements/deep-sea-game.jpg'
import rollCall from './achievements/roll-call.jpg'

export const ACHIEVEMENT_BADGES = Object.freeze({
  'first-game': firstGame,
  'games-10': games10,
  'games-100': games100,
  'games-500': games500,
  'first-five-kind': firstFiveKind,
  'first-roll-five-kind': firstRollFiveKind,
  'score-500': score500,
  'score-600': score600,
  'score-700': score700,
  'ten-scores-500': tenScores500,
  'points-5000': points5000,
  'points-10000': points10000,
  'points-25000': points25000,
  'points-50000': points50000,
  'points-100000': points100000,
  'points-500000': points500000,
  'points-1000000': points1000000,
  'five-kinds-50': fiveKinds50,
  'five-kinds-100': fiveKinds100,
  'five-kinds-500': fiveKinds500,
  'large-straights-1000': largeStraights1000,
  'score-under-100': scoreUnder100,
  'golden-game': goldenGame,
  'baseball-game': baseballGame,
  'triple-crown': tripleCrown,
  'world-traveler-game': worldTravelerGame,
  'holiday-wonder': holidayWonder,
  'deep-sea-game': deepSeaGame,
  'roll-call': rollCall,
})

export function getAchievementBadge(key) {
  return ACHIEVEMENT_BADGES[key] || null
}
