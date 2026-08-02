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
                "ten-scores-500",
                "points-5000"
        );
        assertThat(keys).doesNotContain(
                "first-five-kind",
                "first-roll-five-kind",
                "points-10000",
                "points-25000",
                "golden-game",
                "baseball-game",
                "triple-crown",
                "world-traveler-game",
                "holiday-wonder"
        );
    }

    @Test
    void evaluatesEveryCatalogAchievementAndNeverAwardsAnExistingKeyTwice() {
        List<GameScore> history = new ArrayList<>();
        history.add(game(99, detailedScores(), "golden"));
        history.add(game(1_000, detailedScores(), "baseball"));
        history.add(game(1_000, detailedScores(), "world-traveler"));
        history.add(game(1_000, detailedScores(), "halloween"));
        history.add(game(1_000, detailedScores(), "christmas"));
        for (int index = 0; index < 996; index++) {
            history.add(game(1_000, detailedScores(), "classic"));
        }

        Set<String> keys = keys(AchievementEvaluator.evaluate(history, Set.of("first-game")));

        assertThat(AchievementCatalog.DEFINITIONS).hasSize(27);
        assertThat(AchievementCatalog.DISPLAY_CAPACITY).isEqualTo(36);
        assertThat(keys).hasSize(26).doesNotContain("first-game");
        assertThat(keys).containsAll(AchievementCatalog.DEFINITIONS.stream()
                .map(AchievementDefinition::key)
                .filter(key -> !key.equals("first-game"))
                .toList());
    }

    @Test
    void cumulativePointMilestonesUnlockOnTheirHistoricalCrossingGames() {
        List<GameScore> history = new ArrayList<>();
        for (int index = 0; index < 50; index++) {
            history.add(game(500, Map.of(), "classic"));
        }

        List<AchievementUnlock> unlocks = AchievementEvaluator.evaluate(history, Set.of());

        assertThat(unlocks)
                .filteredOn(unlock -> unlock.definition().key().equals("points-5000"))
                .singleElement()
                .extracting(AchievementUnlock::qualifyingGame)
                .isSameAs(history.get(9));
        assertThat(unlocks)
                .filteredOn(unlock -> unlock.definition().key().equals("points-10000"))
                .singleElement()
                .extracting(AchievementUnlock::qualifyingGame)
                .isSameAs(history.get(19));
        assertThat(unlocks)
                .filteredOn(unlock -> unlock.definition().key().equals("points-25000"))
                .singleElement()
                .extracting(AchievementUnlock::qualifyingGame)
                .isSameAs(history.get(49));
    }

    @Test
    void tripleCrownRequiresAllThreeFiveKindScoresInTheSameGame() {
        List<GameScore> splitAcrossGames = List.of(
                game(300, Map.of("fiveKind", 75), "classic"),
                game(300, Map.of("fiveKindBonus", 150), "classic"),
                game(300, Map.of("firstRollFiveKind", 250), "classic")
        );

        assertThat(keys(AchievementEvaluator.evaluate(splitAcrossGames, Set.of())))
                .doesNotContain("triple-crown");

        List<GameScore> historyWithTripleCrown = new ArrayList<>(splitAcrossGames);
        historyWithTripleCrown.add(game(675, detailedScores(), "classic"));

        assertThat(keys(AchievementEvaluator.evaluate(historyWithTripleCrown, Set.of())))
                .contains("triple-crown");
    }

    @Test
    void themeAchievementsReplayHistoryAndHolidayWonderUnlocksOnTheSecondHoliday() {
        GameScore halloween = game(275, Map.of(), "halloween");
        GameScore worldTraveler = game(275, Map.of(), "world-traveler");
        GameScore christmas = game(275, Map.of(), "christmas");

        List<AchievementUnlock> beforeChristmas = AchievementEvaluator.evaluate(
                List.of(halloween, worldTraveler),
                Set.of()
        );
        assertThat(keys(beforeChristmas))
                .contains("world-traveler-game")
                .doesNotContain("holiday-wonder");

        List<AchievementUnlock> completeHistory = AchievementEvaluator.evaluate(
                List.of(halloween, worldTraveler, christmas),
                Set.of()
        );
        assertThat(keys(completeHistory)).contains("world-traveler-game", "holiday-wonder");
        assertThat(completeHistory.stream()
                .filter(unlock -> unlock.definition().key().equals("holiday-wonder"))
                .findFirst()
                .orElseThrow()
                .qualifyingGame()).isSameAs(christmas);
    }

    private GameScore game(int score, Map<String, Integer> categoryScores, String theme) {
        return new GameScore(UUID.randomUUID(), user, score, false, categoryScores, theme);
    }

    private static Map<String, Integer> detailedScores() {
        return Map.of(
                "largeStraight", 50,
                "fiveKind", 75,
                "fiveKindBonus", 150,
                "firstRollFiveKind", 250
        );
    }

    private static Set<String> keys(List<AchievementUnlock> unlocks) {
        return unlocks.stream().map(unlock -> unlock.definition().key()).collect(java.util.stream.Collectors.toSet());
    }
}
