package com.scottsdicegame.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FirebaseLoginRequest(
        @NotBlank(message = "A Firebase ID token is required.")
        @Size(max = 12000, message = "The Firebase ID token is invalid.")
        String idToken
) {
}
