package com.scottsdicegame.backend.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.scottsdicegame.backend.user.EmailAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @JsonAlias("username")
        @NotBlank(message = "Enter your username or email address.")
        @Size(
                max = EmailAddress.MAX_LENGTH,
                message = "Username or email address cannot exceed 254 characters."
        )
        String identifier,

        @NotBlank(message = "Enter your password.")
        @Size(max = 72, message = "Password cannot exceed 72 characters.")
        String password
) {
}
