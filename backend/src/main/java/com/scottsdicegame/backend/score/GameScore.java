package com.scottsdicegame.backend.score;

import com.scottsdicegame.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "game_scores")
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "game_id", nullable = false)
    private UUID gameId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false)
    private int score;

    @Column(name = "new_personal_best", nullable = false)
    private boolean newPersonalBest;

    @CreationTimestamp
    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    protected GameScore() {
    }

    public GameScore(UUID gameId, UserAccount user, int score, boolean newPersonalBest) {
        this.gameId = Objects.requireNonNull(gameId);
        this.user = Objects.requireNonNull(user);
        this.score = score;
        this.newPersonalBest = newPersonalBest;
    }

    public UUID getId() {
        return id;
    }

    public UUID getGameId() {
        return gameId;
    }

    public UserAccount getUser() {
        return user;
    }

    public int getScore() {
        return score;
    }

    public boolean isNewPersonalBest() {
        return newPersonalBest;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
