package com.scottsdicegame.backend.score.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

public record ScoreSubmissionRequest(
        @NotNull(message = "A game ID is required.")
        UUID gameId,

        @Min(value = 0, message = "Score cannot be negative.")
        @Max(value = 2000, message = "Score cannot exceed 2000 points.")
        int score,

        @NotBlank(message = "The completed game's theme is required.")
        @Size(max = 40, message = "The completed game's theme is invalid.")
        String theme,

        @NotNull(message = "A completed category scorecard is required.")
        @Size(min = 19, max = 19, message = "All 19 score categories are required.")
        Map<@NotBlank(message = "Score category is required.") String,
            @NotNull(message = "A category score is required.")
            @Min(value = 0, message = "Category scores cannot be negative.")
            @Max(value = 250, message = "Category scores cannot exceed 250 points.") Integer> categoryScores
) {
}
