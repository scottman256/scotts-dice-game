package com.scottsdicegame.backend.score;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

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

    @EntityGraph(attributePaths = "categoryScores")
    List<GameScore> findByUserIdOrderByCompletedAtAscIdAsc(UUID userId);

    @EntityGraph(attributePaths = "categoryScores")
    @Query("""
            SELECT score
            FROM GameScore score
            WHERE score.user.id = :userId
              AND score.categoryScores IS NOT EMPTY
            """)
    List<GameScore> findStatTrackedByUserId(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM GameScore score WHERE score.defaultSeed = false")
    int deleteAllNonDefaultScores();

    boolean existsByUserId(UUID userId);
}
