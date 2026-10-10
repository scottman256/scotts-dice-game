package com.scottsdicegame.backend.score.dto;

import com.scottsdicegame.backend.achievement.dto.AchievementResponse;
import com.scottsdicegame.backend.score.entity.GameScore;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ScoreSubmissionResponse(
        UUID id,
        UUID gameId,
        int score,
        Instant completedAt,
        boolean newHighScore,
        long personalRank,
        long totalGames,
        boolean tiedRank,
        List<AchievementResponse> unlockedAchievements
) {
    public ScoreSubmissionResponse {
        unlockedAchievements = List.copyOf(unlockedAchievements);
    }

    public static ScoreSubmissionResponse from(
            GameScore score,
            long personalRank,
            long totalGames,
            boolean tiedRank,
            List<AchievementResponse> unlockedAchievements
    ) {
        return new ScoreSubmissionResponse(
                score.getId(),
                score.getGameId(),
                score.getScore(),
                score.getCompletedAt(),
                score.isNewPersonalBest(),
                personalRank,
                totalGames,
                tiedRank,
                unlockedAchievements
        );
    }
}
