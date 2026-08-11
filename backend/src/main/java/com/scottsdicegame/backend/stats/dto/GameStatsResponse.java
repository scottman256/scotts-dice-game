package com.scottsdicegame.backend.stats.dto;

public record GameStatsResponse(
        long gamesPlayed,
        long activeDays,
        long longestPlayStreak,
        String favoriteTheme,
        Integer highScore,
        Integer lowScore,
        Double averageScore,
        Double medianScore,
        Double averageScratchesPerGame,
        long achievementsUnlocked,
        long gamesAtLeast500,
        long gamesAtLeast600,
        long fiveOfAKindsScored,
        long firstRollFiveOfAKinds,
        long firstTopBonuses,
        long secondTopBonuses,
        long fiveOfAKindBonuses,
        long totalPoints
) {
    public static GameStatsResponse empty() {
        return empty(0);
    }

    public static GameStatsResponse empty(long achievementsUnlocked) {
        return new GameStatsResponse(
                0,
                0,
                0,
                null,
                null,
                null,
                null,
                null,
                null,
                achievementsUnlocked,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
        );
    }
}
