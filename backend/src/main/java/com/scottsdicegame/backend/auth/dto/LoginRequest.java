package com.scottsdicegame.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Enter your username.")
        @Size(max = 32, message = "Username cannot exceed 32 characters.")
        String username,

        @NotBlank(message = "Enter your password.")
        @Size(max = 72, message = "Password cannot exceed 72 characters.")
        String password
) {
}
