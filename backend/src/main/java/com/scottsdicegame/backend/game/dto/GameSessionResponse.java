package com.scottsdicegame.backend.game.dto;

public record GameSessionResponse(
        String theme,
        SavedGameResponse savedGame
) {
}
