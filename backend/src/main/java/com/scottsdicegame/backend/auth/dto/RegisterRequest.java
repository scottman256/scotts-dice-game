package com.scottsdicegame.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Enter a username.")
        @Size(min = 3, max = 32, message = "Username must be between 3 and 32 characters.")
        @Pattern(
                regexp = "^[A-Za-z0-9][A-Za-z0-9._-]*$",
                message = "Username may contain letters, numbers, periods, underscores, and hyphens."
        )
        String username,

        @NotBlank(message = "Enter a password.")
        @Size(max = 72, message = "Password cannot exceed 72 characters.")
        String password,

        @NotBlank(message = "Enter the password again.")
        String passwordConfirmation
) {
}
