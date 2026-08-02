package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

@FunctionalInterface
interface AchievementRule {

    boolean isEarned(AchievementProgress progress, GameScore currentGame);
}
