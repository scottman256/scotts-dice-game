package com.scottsdicegame.backend.user.model;

public enum AccountRole {
    USER,
    ADMIN;

    public boolean isAdmin() {
        return this == ADMIN;
    }
}
