package com.scottsdicegame.backend.user;

public enum AuthProvider {
    MANUAL(true),
    GOOGLE(true),
    FACEBOOK(true),
    SYSTEM(false);

    private final boolean authenticationAllowed;

    AuthProvider(boolean authenticationAllowed) {
        this.authenticationAllowed = authenticationAllowed;
    }

    public boolean isAuthenticationAllowed() {
        return authenticationAllowed;
    }

    public boolean isSocial() {
        return this == GOOGLE || this == FACEBOOK;
    }
}
