package com.scottsdicegame.backend.score.dto;

import com.scottsdicegame.backend.score.entity.GameScore;
import com.scottsdicegame.backend.score.model.ScoreCategories;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record CompletedGameResponse(
        UUID scoreId,
        int score,
        Instant completedAt,
        String theme,
        Map<String, Integer> categoryScores,
        boolean scorecardAvailable
) {
    public static CompletedGameResponse from(GameScore game) {
        return new CompletedGameResponse(
                game.getId(),
                game.getScore(),
                game.getCompletedAt(),
                game.getTheme(),
                Map.copyOf(game.getCategoryScores()),
                ScoreCategories.isCompleteScorecard(game.getCategoryScores())
        );
    }
}
