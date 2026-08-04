package com.scottsdicegame.backend.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminSystemScoreRequest(
        @NotBlank(message = "Enter a player name.")
        @Size(max = 100, message = "Player name cannot exceed 100 characters.")
        String playerName,

        @Min(value = 0, message = "Score cannot be negative.")
        @Max(value = 2000, message = "Score cannot exceed 2000.")
        int score
) {
}
