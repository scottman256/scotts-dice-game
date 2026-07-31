package com.scottsdicegame.backend.game.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SavedGameRequest(
        @NotNull(message = "A game ID is required.")
        UUID gameId,

        @NotNull(message = "Five dice are required.")
        @Size(min = 5, max = 5, message = "Exactly five dice are required.")
        List<@Min(value = 1, message = "Die faces must be between 1 and 6.")
             @Max(value = 6, message = "Die faces must be between 1 and 6.") Integer> dice,

        @NotNull(message = "Five hold values are required.")
        @Size(min = 5, max = 5, message = "Exactly five hold values are required.")
        List<@NotNull(message = "Hold values are required.") Boolean> heldDice,

        @Min(value = 0, message = "Roll count cannot be negative.")
        @Max(value = 4, message = "Roll count cannot exceed four.")
        int rollCount,

        @NotNull(message = "Scores are required.")
        @Size(max = 18, message = "Completed games cannot be saved for resuming.")
        Map<@NotBlank(message = "Score category is required.") String,
            @Valid @NotNull(message = "A category score is required.")
            @Min(value = 0, message = "Category scores cannot be negative.")
            @Max(value = 250, message = "Category scores cannot exceed 250 points.") Integer> scores,

        @Min(value = 0, message = "Extra rolls used cannot be negative.")
        @Max(value = 3, message = "Extra rolls used cannot exceed three.")
        int extraRollsUsed,

        @NotBlank(message = "Game status is required.")
        @Size(max = 500, message = "Game status cannot exceed 500 characters.")
        String status,

        @NotBlank(message = "Game status tone is required.")
        @Size(max = 20, message = "Game status tone cannot exceed 20 characters.")
        String statusTone
) {
}
