package com.scottsdicegame.backend.game.repository;

import com.scottsdicegame.backend.game.entity.SavedGame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SavedGameRepository extends JpaRepository<SavedGame, UUID> {

    Optional<SavedGame> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
