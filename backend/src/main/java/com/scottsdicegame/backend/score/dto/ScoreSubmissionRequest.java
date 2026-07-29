package com.scottsdicegame.backend.score.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ScoreSubmissionRequest(
        @NotNull(message = "A game ID is required.")
        UUID gameId,

        @Min(value = 0, message = "Score cannot be negative.")
        @Max(value = 2000, message = "Score cannot exceed 2000 points.")
        int score
) {
}
