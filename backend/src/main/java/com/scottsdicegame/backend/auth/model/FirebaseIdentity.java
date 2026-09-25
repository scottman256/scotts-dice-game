package com.scottsdicegame.backend.auth.model;

import com.scottsdicegame.backend.user.model.AuthProvider;

public record FirebaseIdentity(
        AuthProvider provider,
        String subject,
        String displayName,
        String email,
        String photoUrl
) {
}
