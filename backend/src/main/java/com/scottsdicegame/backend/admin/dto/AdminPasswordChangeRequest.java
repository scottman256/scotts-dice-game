package com.scottsdicegame.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordChangeRequest(
        @NotBlank(message = "Enter a new password.")
        @Size(max = 72, message = "Password cannot exceed 72 characters.")
        String password,

        @NotBlank(message = "Enter the new password again.")
        String passwordConfirmation
) {
}
