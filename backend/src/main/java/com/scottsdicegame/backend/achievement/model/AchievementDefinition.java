package com.scottsdicegame.backend.achievement.model;

public record AchievementDefinition(
        int catalogOrder,
        String key,
        String title,
        String description,
        String unlockDescription,
        AchievementRule rule
) {
}
