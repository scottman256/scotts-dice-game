package com.scottsdicegame.backend.admin.dto;

import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String name,
        String username,
        String email,
        String providerId,
        String providerLabel,
        boolean admin,
        boolean canChangePassword,
        boolean canDelete,
        Instant createdAt
) {
    public static AdminUserResponse from(UserAccount user, UUID requestingAdminId) {
        return new AdminUserResponse(
                user.getId(),
                user.getDisplayName(),
                user.getUsername(),
                user.getEmail() == null ? "" : user.getEmail(),
                user.getAuthProvider().name().toLowerCase(),
                providerLabel(user.getAuthProvider()),
                user.isAdmin(),
                user.getAuthProvider() == AuthProvider.MANUAL,
                !user.getId().equals(requestingAdminId),
                user.getCreatedAt()
        );
    }

    private static String providerLabel(AuthProvider provider) {
        return switch (provider) {
            case MANUAL -> "Username";
            case GOOGLE -> "Google";
            case FACEBOOK -> "Facebook";
            case SYSTEM -> "Leaderboard";
        };
    }
}
