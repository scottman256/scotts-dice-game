package com.scottsdicegame.backend.achievement.model;

import com.scottsdicegame.backend.score.entity.GameScore;

public record AchievementUnlock(AchievementDefinition definition, GameScore qualifyingGame) {
}
