package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

import java.util.Set;

@FunctionalInterface
interface AchievementRule {

    boolean isEarned(
            AchievementProgress progress,
            GameScore currentGame,
            Set<String> unlockedAchievementKeys
    );
}
