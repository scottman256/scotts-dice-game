package com.scottsdicegame.backend.achievement.model;

import com.scottsdicegame.backend.score.entity.GameScore;

import java.util.Set;

@FunctionalInterface
public interface AchievementRule {

    boolean isEarned(
            AchievementProgress progress,
            GameScore currentGame,
            Set<String> unlockedAchievementKeys
    );
}
