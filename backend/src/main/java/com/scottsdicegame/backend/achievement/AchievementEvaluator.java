package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class AchievementEvaluator {

    static List<AchievementUnlock> evaluate(List<GameScore> games, Set<String> alreadyEarned) {
        Set<String> earned = new HashSet<>(alreadyEarned);
        List<AchievementUnlock> unlocks = new ArrayList<>();
        AchievementProgress progress = new AchievementProgress();

        for (GameScore game : games) {
            progress.record(game);
            for (AchievementDefinition definition : AchievementCatalog.DEFINITIONS) {
                if (earned.contains(definition.key())) continue;
                if (!definition.rule().isEarned(progress, game)) continue;

                earned.add(definition.key());
                unlocks.add(new AchievementUnlock(definition, game));
            }
        }

        return List.copyOf(unlocks);
    }

    private AchievementEvaluator() {
    }
}
