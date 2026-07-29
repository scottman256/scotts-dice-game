export function randomFace() {
  return Math.floor(Math.random() * 6) + 1
}

export function rollUnheldDice(dice, heldDice, faceRoller = randomFace) {
  return dice.map((value, index) => (
    heldDice[index] && value !== null ? value : faceRoller()
  ))
}
