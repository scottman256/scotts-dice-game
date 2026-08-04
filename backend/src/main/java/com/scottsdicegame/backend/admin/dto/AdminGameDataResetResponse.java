package com.scottsdicegame.backend.admin.dto;

public record AdminGameDataResetResponse(
        int scoresDeleted,
        long achievementsDeleted,
        long savedGamesDeleted,
        int defaultsRestored
) {
}
