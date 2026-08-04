package com.scottsdicegame.backend.admin.dto;

import java.util.UUID;

public record AdminSystemScoreResponse(UUID scoreId, String playerName, int score) {
}
