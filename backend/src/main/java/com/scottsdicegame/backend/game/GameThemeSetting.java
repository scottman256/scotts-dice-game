package com.scottsdicegame.backend.game;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "game_theme_settings")
public class GameThemeSetting {

    @Id
    @Column(name = "theme_id", length = 40)
    private String themeId;

    @Column(nullable = false)
    private boolean enabled;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GameThemeSetting() {
    }

    GameThemeSetting(String themeId, boolean enabled) {
        this.themeId = themeId;
        this.enabled = enabled;
    }

    public String getThemeId() {
        return themeId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
