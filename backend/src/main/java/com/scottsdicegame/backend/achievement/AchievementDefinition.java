package com.scottsdicegame.backend.achievement;

record AchievementDefinition(
        int catalogOrder,
        String key,
        String title,
        String description,
        String unlockDescription,
        AchievementRule rule
) {
}
