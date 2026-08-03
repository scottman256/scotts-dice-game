import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from '@jest/globals'
import { ACHIEVEMENT_BADGES, getAchievementBadge } from './achievementBadges'

describe('achievement badge assets', () => {
  it('provides one optimized image for every achievement', () => {
    const keys = Object.keys(ACHIEVEMENT_BADGES)

    expect(keys).toHaveLength(27)
    for (const key of keys) {
      expect(existsSync(join(process.cwd(), 'src', 'assets', 'achievements', `${key}.jpg`))).toBe(true)
    }
  })

  it('returns no artwork for an achievement unknown to this frontend version', () => {
    expect(getAchievementBadge('future-achievement')).toBeNull()
  })
})
