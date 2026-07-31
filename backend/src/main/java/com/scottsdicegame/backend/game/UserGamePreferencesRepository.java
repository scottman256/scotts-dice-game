package com.scottsdicegame.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserGamePreferencesRepository extends JpaRepository<UserGamePreferences, UUID> {
}
