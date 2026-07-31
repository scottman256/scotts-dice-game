package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.game.dto.SavedGameRequest;
import com.scottsdicegame.backend.user.UserAccount;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "saved_games")
public class SavedGame {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserAccount user;

    @Column(name = "game_id", nullable = false, unique = true)
    private UUID gameId;

    @Column(name = "roll_count", nullable = false)
    private int rollCount;

    @Column(name = "extra_rolls_used", nullable = false)
    private int extraRollsUsed;

    @Column(nullable = false, length = 500)
    private String status;

    @Column(name = "status_tone", nullable = false, length = 20)
    private String statusTone;

    @ElementCollection
    @CollectionTable(name = "saved_game_dice", joinColumns = @JoinColumn(name = "saved_game_id"))
    @OrderColumn(name = "die_position")
    private List<SavedDie> dice = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "saved_game_scores", joinColumns = @JoinColumn(name = "saved_game_id"))
    @MapKeyColumn(name = "category_id", length = 40)
    @Column(name = "score", nullable = false)
    private Map<String, Integer> scores = new LinkedHashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SavedGame() {
    }

    public SavedGame(UserAccount user, SavedGameRequest request) {
        this.user = Objects.requireNonNull(user);
        update(request);
    }

    public void update(SavedGameRequest request) {
        gameId = request.gameId();
        rollCount = request.rollCount();
        extraRollsUsed = request.extraRollsUsed();
        status = request.status();
        statusTone = request.statusTone();
        dice.clear();
        for (int index = 0; index < request.dice().size(); index++) {
            dice.add(new SavedDie(request.dice().get(index), request.heldDice().get(index)));
        }
        scores.clear();
        scores.putAll(request.scores());
        updatedAt = Instant.now();
    }

    public UUID getGameId() {
        return gameId;
    }

    public int getRollCount() {
        return rollCount;
    }

    public int getExtraRollsUsed() {
        return extraRollsUsed;
    }

    public String getStatus() {
        return status;
    }

    public String getStatusTone() {
        return statusTone;
    }

    public List<SavedDie> getDice() {
        return dice;
    }

    public Map<String, Integer> getScores() {
        return scores;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
