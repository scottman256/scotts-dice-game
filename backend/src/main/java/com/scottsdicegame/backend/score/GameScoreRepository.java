package com.scottsdicegame.backend.score;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameScoreRepository extends JpaRepository<GameScore, UUID> {

    Optional<GameScore> findByUserIdAndGameId(UUID userId, UUID gameId);

    Optional<GameScore> findTopByUserIdOrderByScoreDescCompletedAtAsc(UUID userId);

    @EntityGraph(attributePaths = "user")
    List<GameScore> findTop10ByUserIdOrderByScoreDescCompletedAtAsc(UUID userId);

    @EntityGraph(attributePaths = "user")
    List<GameScore> findTop10ByOrderByScoreDescCompletedAtAsc();
}
