package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.user.UserAccount;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AchievementEvaluatorTest {

    private final UserAccount user = UserAccount.manual("player", "player", "encoded-password");

    @Test
    void retroactivelyAwardsMilestonesSupportedByLegacyScoreOnlyHistory() {
        List<GameScore> legacyHistory = new ArrayList<>();
        for (int index = 0; index < 10; index++) {
            legacyHistory.add(game(701, Map.of(), null));
        }

        Set<String> keys = keys(AchievementEvaluator.evaluate(legacyHistory, Set.of()));

        assertThat(keys).contains(
                "first-game",
                "games-10",
                "score-500",
                "score-600",
                "score-700",
                "ten-scores-500"
        );
        assertThat(keys).doesNotContain(
                "first-five-kind",
                "first-roll-five-kind",
                "golden-game",
                "baseball-game"
        );
    }

    @Test
    void evaluatesEveryInitialAchievementAndNeverAwardsAnExistingKeyTwice() {
        List<GameScore> history = new ArrayList<>();
        history.add(game(99, detailedScores(), "golden"));
        history.add(game(1_000, detailedScores(), "baseball"));
        for (int index = 0; index < 999; index++) {
            history.add(game(1_000, detailedScores(), "classic"));
        }

        Set<String> keys = keys(AchievementEvaluator.evaluate(history, Set.of("first-game")));

        assertThat(AchievementCatalog.DEFINITIONS).hasSize(21);
        assertThat(AchievementCatalog.DISPLAY_CAPACITY).isEqualTo(36);
        assertThat(keys).hasSize(20).doesNotContain("first-game");
        assertThat(keys).containsAll(AchievementCatalog.DEFINITIONS.stream()
                .map(AchievementDefinition::key)
                .filter(key -> !key.equals("first-game"))
                .toList());
    }

    private GameScore game(int score, Map<String, Integer> categoryScores, String theme) {
        return new GameScore(UUID.randomUUID(), user, score, false, categoryScores, theme);
    }

    private static Map<String, Integer> detailedScores() {
        return Map.of(
                "largeStraight", 50,
                "fiveKind", 75,
                "firstRollFiveKind", 250
        );
    }

    private static Set<String> keys(List<AchievementUnlock> unlocks) {
        return unlocks.stream().map(unlock -> unlock.definition().key()).collect(java.util.stream.Collectors.toSet());
    }
}
