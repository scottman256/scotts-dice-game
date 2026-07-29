package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.user.AuthProvider;

public record FirebaseIdentity(
        AuthProvider provider,
        String subject,
        String displayName,
        String email,
        String photoUrl
) {
}
