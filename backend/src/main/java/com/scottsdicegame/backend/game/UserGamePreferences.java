package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_game_preferences")
public class UserGamePreferences {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false, length = 40)
    private String theme;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserGamePreferences() {
    }

    public UserGamePreferences(UserAccount user, String theme) {
        this.user = Objects.requireNonNull(user);
        this.theme = Objects.requireNonNull(theme);
    }

    public void setTheme(String theme) {
        this.theme = Objects.requireNonNull(theme);
    }

    public String getTheme() {
        return theme;
    }
}
