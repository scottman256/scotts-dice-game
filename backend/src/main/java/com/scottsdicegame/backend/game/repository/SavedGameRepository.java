package com.scottsdicegame.backend.game.repository;

import com.scottsdicegame.backend.game.entity.SavedGame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface SavedGameRepository extends JpaRepository<SavedGame, UUID> {

    @Query("""
            SELECT game.user.id AS userId, game.updatedAt AS lastPlayed
            FROM SavedGame game
            WHERE (game.rollCount > 0 OR game.scores IS NOT EMPTY)
              AND SIZE(game.scores) < 19
              AND NOT EXISTS (SELECT score.id FROM GameScore score
                              WHERE score.user.id = game.user.id AND score.gameId = game.gameId)
            """)
    List<SavedGameActivity> findPlayerActivity();

    Optional<SavedGame> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
