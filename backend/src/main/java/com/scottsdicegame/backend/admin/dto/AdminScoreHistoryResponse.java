package com.scottsdicegame.backend.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminScoreHistoryResponse(List<Entry> scores, int page, int totalPages, long totalScores) {
    public record Entry(UUID id, int score, Instant completedAt) { }
}
