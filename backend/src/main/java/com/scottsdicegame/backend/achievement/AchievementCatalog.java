package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

final class AchievementCatalog {

    static final int DISPLAY_CAPACITY = 36;

    static final List<AchievementDefinition> DEFINITIONS = List.of(
            games(1, "first-game", "First Finish", "Completed your first game.", 1),
            games(2, "games-10", "Double Digits", "Completed 10 games.", 10),
            games(3, "games-100", "Century Roller", "Completed 100 games.", 100),
            games(4, "games-500", "Endurance Legend", "Completed 500 games.", 500),
            cumulative(5, "first-five-kind", "Five of a Kind", "Scored your first 5 of a kind.",
                    progress -> progress.fiveOfAKinds() >= 1),
            cumulative(6, "first-roll-five-kind", "Natural Five", "Scored a 5 of a kind on the first roll.",
                    progress -> progress.firstRollFiveOfAKinds() >= 1),
            scoreOver(7, "score-500", "500 Club", "Finished a game with more than 500 points.", 500),
            scoreOver(8, "score-600", "600 Club", "Finished a game with more than 600 points.", 600),
            scoreOver(9, "score-700", "700 Club", "Finished a game with more than 700 points.", 700),
            cumulative(10, "ten-scores-500", "High-Roller Ten", "Scored 500 or more in 10 games.",
                    progress -> progress.scoresAtLeast500() >= 10),
            points(11, "points-5000", "5K Point Stash", "Scored 5,000 total points.", 5_000),
            points(12, "points-10000", "10K Point Cache", "Scored 10,000 total points.", 10_000),
            points(13, "points-25000", "25K Point Treasury", "Scored 25,000 total points.", 25_000),
            points(14, "points-50000", "50K Point Pile", "Scored 50,000 total points.", 50_000),
            points(15, "points-100000", "100K Point Vault", "Scored 100,000 total points.", 100_000),
            points(16, "points-500000", "Half-Million Hero", "Scored 500,000 total points.", 500_000),
            points(17, "points-1000000", "Million-Point Legend", "Scored 1,000,000 total points.", 1_000_000),
            fiveKinds(18, "five-kinds-50", "Fifty Fives", "Scored 50 total 5 of a kinds.", 50),
            fiveKinds(19, "five-kinds-100", "Century of Fives", "Scored 100 total 5 of a kinds.", 100),
            fiveKinds(20, "five-kinds-500", "Five-Kind Master", "Scored 500 total 5 of a kinds.", 500),
            cumulative(21, "large-straights-1000", "Straight Thousand", "Scored 1,000 large straights.",
                    progress -> progress.largeStraights() >= 1_000),
            definition(22, "score-under-100", "Boo!", "Finished a game with fewer than 100 points.",
                    (progress, game) -> game.getScore() < 100),
            definition(23, "golden-game", "Golden", "Completed a game with the Golden dice.",
                    (progress, game) -> "golden".equals(game.getTheme())),
            definition(24, "baseball-game", "Sporty", "Completed a game with the Baseball dice.",
                    (progress, game) -> "baseball".equals(game.getTheme())),
            definition(25, "triple-crown", "Triple Crown",
                    "Scored a 5 of a kind, its bonus, and a first-roll 5 of a kind in one game.",
                    (progress, game) -> scored(game, "fiveKind")
                            && scored(game, "fiveKindBonus")
                            && scored(game, "firstRollFiveKind")),
            definition(26, "world-traveler-game", "World Traveler",
                    "Completed a game with the World Traveler dice.",
                    (progress, game) -> "world-traveler".equals(game.getTheme())),
            cumulative(27, "holiday-wonder", "Holiday Wonder",
                    "Completed games with both the Halloween and Christmas dice.",
                    progress -> progress.completedEveryTheme("halloween", "christmas")),
            definition(28, "deep-sea-game", "Roll Beneath the Surface",
                    "Completed a game with the Deep Sea dice.",
                    (progress, game) -> "deep-sea".equals(game.getTheme())),
            completionDays(29, "roll-call", "Roll Call", 10),
            completionDays(30, "days-25", "Repeat Roller", 25),
            completionDays(31, "days-50", "Dice Regular", 50),
            completionDays(32, "days-100", "Hundred-Day Hero", 100),
            completionDays(33, "days-250", "Table Devotee", 250),
            completionDays(34, "days-365", "Year-Round Roller", 365),
            definition(35, "new-years-day", "New Year, New Roll",
                    "Completed a game on New Year's Day.",
                    (progress, game) -> completedOn(game, Month.JANUARY, 1))
    );

    private static final Map<String, AchievementDefinition> BY_KEY = indexDefinitions();

    static Optional<AchievementDefinition> find(String key) {
        return Optional.ofNullable(BY_KEY.get(key));
    }

    private static AchievementDefinition games(
            int order,
            String key,
            String title,
            String description,
            long threshold
    ) {
        return cumulative(order, key, title, description, progress -> progress.gamesPlayed() >= threshold);
    }

    private static AchievementDefinition scoreOver(
            int order,
            String key,
            String title,
            String description,
            int threshold
    ) {
        return definition(order, key, title, description, (progress, game) -> game.getScore() > threshold);
    }

    private static AchievementDefinition points(
            int order,
            String key,
            String title,
            String description,
            long threshold
    ) {
        return cumulative(order, key, title, description, progress -> progress.totalPoints() >= threshold);
    }

    private static AchievementDefinition fiveKinds(
            int order,
            String key,
            String title,
            String description,
            long threshold
    ) {
        return cumulative(order, key, title, description, progress -> progress.fiveOfAKinds() >= threshold);
    }

    private static AchievementDefinition completionDays(
            int order,
            String key,
            String title,
            int threshold
    ) {
        return cumulative(
                order,
                key,
                title,
                "Completed a game on " + threshold + " different days.",
                progress -> progress.distinctCompletionDays() >= threshold
        );
    }

    private static AchievementDefinition cumulative(
            int order,
            String key,
            String title,
            String description,
            ProgressRule rule
    ) {
        return definition(order, key, title, description, (progress, game) -> rule.isEarned(progress));
    }

    private static AchievementDefinition definition(
            int order,
            String key,
            String title,
            String description,
            AchievementRule rule
    ) {
        return new AchievementDefinition(order, key, title, description, rule);
    }

    private static boolean scored(GameScore game, String category) {
        return game.getCategoryScores().getOrDefault(category, 0) > 0;
    }

    private static boolean completedOn(GameScore game, Month month, int dayOfMonth) {
        Instant completedAt = game.getCompletedAt();
        if (completedAt == null) return false;

        LocalDate completedDate = LocalDate.ofInstant(completedAt, ZoneOffset.UTC);
        return completedDate.getMonth() == month && completedDate.getDayOfMonth() == dayOfMonth;
    }

    private static Map<String, AchievementDefinition> indexDefinitions() {
        Map<String, AchievementDefinition> definitions = new LinkedHashMap<>();
        for (AchievementDefinition definition : DEFINITIONS) {
            if (definitions.put(definition.key(), definition) != null) {
                throw new IllegalStateException("Duplicate achievement key: " + definition.key());
            }
        }
        if (definitions.size() > DISPLAY_CAPACITY) {
            throw new IllegalStateException("Achievement catalog exceeds the display capacity.");
        }
        return Map.copyOf(definitions);
    }

    @FunctionalInterface
    private interface ProgressRule {
        boolean isEarned(AchievementProgress progress);
    }

    private AchievementCatalog() {
    }
}
