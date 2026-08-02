package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;
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
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "user_achievements",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_achievement_key",
                columnNames = {"user_id", "achievement_key"}
        )
)
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "achievement_key", nullable = false, length = 80)
    private String achievementKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "qualifying_game_score_id", nullable = false)
    private GameScore qualifyingGameScore;

    @Column(name = "achieved_at", nullable = false, updatable = false)
    private Instant achievedAt;

    @CreationTimestamp
    @Column(name = "awarded_at", nullable = false, updatable = false)
    private Instant awardedAt;

    protected UserAchievement() {
    }

    UserAchievement(UserAccount user, AchievementUnlock unlock) {
        this.user = Objects.requireNonNull(user);
        this.achievementKey = unlock.definition().key();
        this.qualifyingGameScore = Objects.requireNonNull(unlock.qualifyingGame());
        this.achievedAt = Objects.requireNonNull(unlock.qualifyingGame().getCompletedAt());
    }

    public String getAchievementKey() {
        return achievementKey;
    }

    public Instant getAchievedAt() {
        return achievedAt;
    }
}
