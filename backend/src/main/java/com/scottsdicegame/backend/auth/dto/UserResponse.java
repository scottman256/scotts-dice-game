package com.scottsdicegame.backend.auth.dto;

import com.scottsdicegame.backend.user.UserAccount;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String username,
        String email,
        String photoUrl,
        String providerId,
        String providerLabel
) {
    public static UserResponse from(UserAccount user) {
        return new UserResponse(
                user.getId(),
                user.getDisplayName(),
                user.getUsername(),
                user.getEmail() == null ? "" : user.getEmail(),
                user.getPhotoUrl(),
                user.getAuthProvider().name().toLowerCase(),
                switch (user.getAuthProvider()) {
                    case MANUAL -> "Username";
                    case GOOGLE -> "Google";
                    case FACEBOOK -> "Facebook";
                }
        );
    }
}
