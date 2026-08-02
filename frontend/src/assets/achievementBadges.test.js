import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from '@jest/globals'
import { ACHIEVEMENT_BADGES } from './achievementBadges'

describe('achievement badge assets', () => {
  it('provides one optimized image for every initial achievement', () => {
    const keys = Object.keys(ACHIEVEMENT_BADGES)

    expect(keys).toHaveLength(21)
    for (const key of keys) {
      expect(existsSync(join(process.cwd(), 'src', 'assets', 'achievements', `${key}.jpg`))).toBe(true)
    }
  })
})
