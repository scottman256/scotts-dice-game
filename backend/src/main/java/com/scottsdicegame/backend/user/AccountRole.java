package com.scottsdicegame.backend.user;

public enum AccountRole {
    USER,
    ADMIN;

    public boolean isAdmin() {
        return this == ADMIN;
    }
}
