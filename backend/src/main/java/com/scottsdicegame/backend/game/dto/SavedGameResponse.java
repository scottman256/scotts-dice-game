package com.scottsdicegame.backend.game.dto;

import com.scottsdicegame.backend.game.SavedDie;
import com.scottsdicegame.backend.game.SavedGame;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SavedGameResponse(
        UUID gameId,
        List<Integer> dice,
        List<Boolean> heldDice,
        int rollCount,
        Map<String, Integer> scores,
        int extraRollsUsed,
        String status,
        String statusTone,
        Instant updatedAt
) {
    public static SavedGameResponse from(SavedGame savedGame) {
        return new SavedGameResponse(
                savedGame.getGameId(),
                savedGame.getDice().stream().map(SavedDie::getFace).toList(),
                savedGame.getDice().stream().map(SavedDie::isHeld).toList(),
                savedGame.getRollCount(),
                Map.copyOf(savedGame.getScores()),
                savedGame.getExtraRollsUsed(),
                savedGame.getStatus(),
                savedGame.getStatusTone(),
                savedGame.getUpdatedAt()
        );
    }
}
