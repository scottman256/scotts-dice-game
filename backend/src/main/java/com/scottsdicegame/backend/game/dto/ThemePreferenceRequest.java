package com.scottsdicegame.backend.game.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ThemePreferenceRequest(
        @NotBlank(message = "A theme is required.")
        @Size(max = 40, message = "Theme cannot exceed 40 characters.")
        String theme
) {
}
