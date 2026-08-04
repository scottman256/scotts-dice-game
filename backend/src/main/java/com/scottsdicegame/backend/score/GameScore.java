package com.scottsdicegame.backend.score;

import com.scottsdicegame.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.LinkedHashMap;
import java.util.Map;
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

    @Column(name = "default_seed", nullable = false)
    private boolean defaultSeed;

    @Column(length = 40)
    private String theme;

    @ElementCollection
    @CollectionTable(
            name = "completed_game_category_scores",
            joinColumns = @JoinColumn(name = "game_score_id")
    )
    @MapKeyColumn(name = "category_id", length = 40)
    @Column(name = "score", nullable = false)
    private Map<String, Integer> categoryScores = new LinkedHashMap<>();

    @CreationTimestamp
    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    protected GameScore() {
    }

    public GameScore(UUID gameId, UserAccount user, int score, boolean newPersonalBest) {
        this(gameId, user, score, newPersonalBest, Map.of(), null);
    }

    public GameScore(
            UUID gameId,
            UserAccount user,
            int score,
            boolean newPersonalBest,
            Map<String, Integer> categoryScores
    ) {
        this(gameId, user, score, newPersonalBest, categoryScores, null);
    }

    public GameScore(
            UUID gameId,
            UserAccount user,
            int score,
            boolean newPersonalBest,
            Map<String, Integer> categoryScores,
            String theme
    ) {
        this.gameId = Objects.requireNonNull(gameId);
        this.user = Objects.requireNonNull(user);
        this.score = score;
        this.newPersonalBest = newPersonalBest;
        this.categoryScores.putAll(Objects.requireNonNull(categoryScores));
        this.theme = theme;
    }

    public static GameScore systemScore(
            UUID id,
            UUID gameId,
            UserAccount user,
            int score,
            boolean defaultSeed
    ) {
        GameScore gameScore = new GameScore(gameId, user, score, true);
        gameScore.id = id;
        gameScore.defaultSeed = defaultSeed;
        return gameScore;
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

    public boolean isDefaultSeed() {
        return defaultSeed;
    }

    public String getTheme() {
        return theme;
    }

    public Map<String, Integer> getCategoryScores() {
        return categoryScores;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
