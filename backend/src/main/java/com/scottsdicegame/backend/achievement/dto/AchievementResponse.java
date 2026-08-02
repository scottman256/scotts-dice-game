package com.scottsdicegame.backend.achievement.dto;

import java.time.Instant;

public record AchievementResponse(
        String key,
        String title,
        String description,
        Instant achievedAt
) {
}
