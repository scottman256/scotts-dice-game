package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

record AchievementUnlock(AchievementDefinition definition, GameScore qualifyingGame) {
}
