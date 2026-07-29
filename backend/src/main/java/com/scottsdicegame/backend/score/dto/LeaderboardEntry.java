package com.scottsdicegame.backend.score.dto;

import java.time.Instant;
import java.util.UUID;

public record LeaderboardEntry(
        int rank,
        UUID scoreId,
        int score,
        Instant completedAt,
        String playerName
) {
}
