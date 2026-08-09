package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class AchievementEvaluator {

    static List<AchievementUnlock> evaluate(List<GameScore> games, Set<String> alreadyEarned) {
        Set<String> persistedOrNewlyEarned = new HashSet<>(alreadyEarned);
        Set<String> earnedInHistory = new HashSet<>();
        Set<String> earnedInHistoryView = Collections.unmodifiableSet(earnedInHistory);
        List<AchievementUnlock> unlocks = new ArrayList<>();
        AchievementProgress progress = new AchievementProgress();

        for (GameScore game : games) {
            progress.record(game);
            for (AchievementDefinition definition : AchievementCatalog.DEFINITIONS) {
                if (earnedInHistory.contains(definition.key())) continue;
                if (!definition.rule().isEarned(progress, game, earnedInHistoryView)) continue;

                earnedInHistory.add(definition.key());
                if (!persistedOrNewlyEarned.add(definition.key())) continue;
                unlocks.add(new AchievementUnlock(definition, game));
            }
        }

        return List.copyOf(unlocks);
    }

    private AchievementEvaluator() {
    }
}
