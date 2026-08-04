import classic1 from './classic/dice-1.svg'
import classic2 from './classic/dice-2.svg'
import classic3 from './classic/dice-3.svg'
import classic4 from './classic/dice-4.svg'
import classic5 from './classic/dice-5.svg'
import classic6 from './classic/dice-6.svg'
import rainbow1 from './rainbow/dice-1.svg'
import rainbow2 from './rainbow/dice-2.svg'
import rainbow3 from './rainbow/dice-3.svg'
import rainbow4 from './rainbow/dice-4.svg'
import rainbow5 from './rainbow/dice-5.svg'
import rainbow6 from './rainbow/dice-6.svg'
import fire1 from './fire/dice-1.svg'
import fire2 from './fire/dice-2.svg'
import fire3 from './fire/dice-3.svg'
import fire4 from './fire/dice-4.svg'
import fire5 from './fire/dice-5.svg'
import fire6 from './fire/dice-6.svg'
import beach1 from './beach/dice-1.svg'
import beach2 from './beach/dice-2.svg'
import beach3 from './beach/dice-3.svg'
import beach4 from './beach/dice-4.svg'
import beach5 from './beach/dice-5.svg'
import beach6 from './beach/dice-6.svg'
import sky1 from './sky/dice-1.svg'
import sky2 from './sky/dice-2.svg'
import sky3 from './sky/dice-3.svg'
import sky4 from './sky/dice-4.svg'
import sky5 from './sky/dice-5.svg'
import sky6 from './sky/dice-6.svg'
import christmas1 from './christmas/dice-1.svg'
import christmas2 from './christmas/dice-2.svg'
import christmas3 from './christmas/dice-3.svg'
import christmas4 from './christmas/dice-4.svg'
import christmas5 from './christmas/dice-5.svg'
import christmas6 from './christmas/dice-6.svg'
import halloween1 from './halloween/dice-1.svg'
import halloween2 from './halloween/dice-2.svg'
import halloween3 from './halloween/dice-3.svg'
import halloween4 from './halloween/dice-4.svg'
import halloween5 from './halloween/dice-5.svg'
import halloween6 from './halloween/dice-6.svg'
import golden1 from './golden/dice-1.svg'
import golden2 from './golden/dice-2.svg'
import golden3 from './golden/dice-3.svg'
import golden4 from './golden/dice-4.svg'
import golden5 from './golden/dice-5.svg'
import golden6 from './golden/dice-6.svg'
import retroArcade1 from './retro-arcade/dice-1.svg'
import retroArcade2 from './retro-arcade/dice-2.svg'
import retroArcade3 from './retro-arcade/dice-3.svg'
import retroArcade4 from './retro-arcade/dice-4.svg'
import retroArcade5 from './retro-arcade/dice-5.svg'
import retroArcade6 from './retro-arcade/dice-6.svg'
import vegas1 from './vegas/dice-1.svg'
import vegas2 from './vegas/dice-2.svg'
import vegas3 from './vegas/dice-3.svg'
import vegas4 from './vegas/dice-4.svg'
import vegas5 from './vegas/dice-5.svg'
import vegas6 from './vegas/dice-6.svg'
import american1 from './american/dice-1.svg'
import american2 from './american/dice-2.svg'
import american3 from './american/dice-3.svg'
import american4 from './american/dice-4.svg'
import american5 from './american/dice-5.svg'
import american6 from './american/dice-6.svg'
import cosmicGalaxy1 from './cosmic-galaxy/dice-1.svg'
import cosmicGalaxy2 from './cosmic-galaxy/dice-2.svg'
import cosmicGalaxy3 from './cosmic-galaxy/dice-3.svg'
import cosmicGalaxy4 from './cosmic-galaxy/dice-4.svg'
import cosmicGalaxy5 from './cosmic-galaxy/dice-5.svg'
import cosmicGalaxy6 from './cosmic-galaxy/dice-6.svg'
import sixtiesTieDye1 from './sixties-tie-dye/dice-1.svg'
import sixtiesTieDye2 from './sixties-tie-dye/dice-2.svg'
import sixtiesTieDye3 from './sixties-tie-dye/dice-3.svg'
import sixtiesTieDye4 from './sixties-tie-dye/dice-4.svg'
import sixtiesTieDye5 from './sixties-tie-dye/dice-5.svg'
import sixtiesTieDye6 from './sixties-tie-dye/dice-6.svg'
import worldTraveler1 from './world-traveler/dice-1.svg'
import worldTraveler2 from './world-traveler/dice-2.svg'
import worldTraveler3 from './world-traveler/dice-3.svg'
import worldTraveler4 from './world-traveler/dice-4.svg'
import worldTraveler5 from './world-traveler/dice-5.svg'
import worldTraveler6 from './world-traveler/dice-6.svg'
import clockwork1 from './clockwork/dice-1.svg'
import clockwork2 from './clockwork/dice-2.svg'
import clockwork3 from './clockwork/dice-3.svg'
import clockwork4 from './clockwork/dice-4.svg'
import clockwork5 from './clockwork/dice-5.svg'
import clockwork6 from './clockwork/dice-6.svg'
import baseball1 from './baseball/dice-1.svg'
import baseball2 from './baseball/dice-2.svg'
import baseball3 from './baseball/dice-3.svg'
import baseball4 from './baseball/dice-4.svg'
import baseball5 from './baseball/dice-5.svg'
import baseball6 from './baseball/dice-6.svg'
import candyKingdom1 from './candy-kingdom/dice-1.svg'
import candyKingdom2 from './candy-kingdom/dice-2.svg'
import candyKingdom3 from './candy-kingdom/dice-3.svg'
import candyKingdom4 from './candy-kingdom/dice-4.svg'
import candyKingdom5 from './candy-kingdom/dice-5.svg'
import candyKingdom6 from './candy-kingdom/dice-6.svg'
import frozenCrystal1 from './frozen-crystal/dice-1.svg'
import frozenCrystal2 from './frozen-crystal/dice-2.svg'
import frozenCrystal3 from './frozen-crystal/dice-3.svg'
import frozenCrystal4 from './frozen-crystal/dice-4.svg'
import frozenCrystal5 from './frozen-crystal/dice-5.svg'
import frozenCrystal6 from './frozen-crystal/dice-6.svg'

function createDiceSet(id, faces) {
  return Object.freeze({ id, faces: Object.freeze(faces) })
}

export const DICE_SETS = Object.freeze({
  classic: createDiceSet('classic', [classic1, classic2, classic3, classic4, classic5, classic6]),
  rainbow: createDiceSet('rainbow', [rainbow1, rainbow2, rainbow3, rainbow4, rainbow5, rainbow6]),
  fire: createDiceSet('fire', [fire1, fire2, fire3, fire4, fire5, fire6]),
  beach: createDiceSet('beach', [beach1, beach2, beach3, beach4, beach5, beach6]),
  sky: createDiceSet('sky', [sky1, sky2, sky3, sky4, sky5, sky6]),
  christmas: createDiceSet('christmas', [
    christmas1, christmas2, christmas3, christmas4, christmas5, christmas6,
  ]),
  halloween: createDiceSet('halloween', [
    halloween1, halloween2, halloween3, halloween4, halloween5, halloween6,
  ]),
  golden: createDiceSet('golden', [golden1, golden2, golden3, golden4, golden5, golden6]),
  'retro-arcade': createDiceSet('retro-arcade', [
    retroArcade1, retroArcade2, retroArcade3, retroArcade4, retroArcade5, retroArcade6,
  ]),
  vegas: createDiceSet('vegas', [vegas1, vegas2, vegas3, vegas4, vegas5, vegas6]),
  american: createDiceSet('american', [
    american1, american2, american3, american4, american5, american6,
  ]),
  'cosmic-galaxy': createDiceSet('cosmic-galaxy', [
    cosmicGalaxy1, cosmicGalaxy2, cosmicGalaxy3,
    cosmicGalaxy4, cosmicGalaxy5, cosmicGalaxy6,
  ]),
  'sixties-tie-dye': createDiceSet('sixties-tie-dye', [
    sixtiesTieDye1, sixtiesTieDye2, sixtiesTieDye3,
    sixtiesTieDye4, sixtiesTieDye5, sixtiesTieDye6,
  ]),
  'world-traveler': createDiceSet('world-traveler', [
    worldTraveler1, worldTraveler2, worldTraveler3,
    worldTraveler4, worldTraveler5, worldTraveler6,
  ]),
  clockwork: createDiceSet('clockwork', [
    clockwork1, clockwork2, clockwork3, clockwork4, clockwork5, clockwork6,
  ]),
  baseball: createDiceSet('baseball', [
    baseball1, baseball2, baseball3, baseball4, baseball5, baseball6,
  ]),
  'candy-kingdom': createDiceSet('candy-kingdom', [
    candyKingdom1, candyKingdom2, candyKingdom3,
    candyKingdom4, candyKingdom5, candyKingdom6,
  ]),
  'frozen-crystal': createDiceSet('frozen-crystal', [
    frozenCrystal1, frozenCrystal2, frozenCrystal3,
    frozenCrystal4, frozenCrystal5, frozenCrystal6,
  ]),
})

export function getDiceSet(themeId) {
  return DICE_SETS[themeId] ?? DICE_SETS.classic
}
