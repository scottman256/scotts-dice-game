package com.scottsdicegame.backend.score.dto;

import com.scottsdicegame.backend.score.entity.GameScore;

import java.time.Instant;
import java.util.UUID;

public record ScoreSubmissionResponse(
        UUID id,
        UUID gameId,
        int score,
        Instant completedAt,
        boolean newHighScore
) {
    public static ScoreSubmissionResponse from(GameScore score) {
        return new ScoreSubmissionResponse(
                score.getId(),
                score.getGameId(),
                score.getScore(),
                score.getCompletedAt(),
                score.isNewPersonalBest()
        );
    }
}
