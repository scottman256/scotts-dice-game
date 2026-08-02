package com.scottsdicegame.backend.stats.dto;

public record GameStatsResponse(
        long gamesPlayed,
        Integer highScore,
        Integer lowScore,
        Double averageScore,
        Double medianScore,
        long fiveOfAKindsScored,
        long firstRollFiveOfAKinds,
        long firstTopBonuses,
        long secondTopBonuses,
        long fiveOfAKindBonuses,
        long totalPoints
) {
    public static GameStatsResponse empty() {
        return new GameStatsResponse(0, null, null, null, null, 0, 0, 0, 0, 0, 0);
    }
}
