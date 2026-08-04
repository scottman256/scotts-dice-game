package com.scottsdicegame.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface UserGamePreferencesRepository extends JpaRepository<UserGamePreferences, UUID> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE UserGamePreferences preferences
            SET preferences.theme = :fallbackTheme
            WHERE preferences.theme = :disabledTheme
            """)
    int resetThemeToClassic(
            @Param("disabledTheme") String disabledTheme,
            @Param("fallbackTheme") String fallbackTheme
    );
}
