package com.scottsdicegame.backend.achievement.dto;

import java.util.List;

public record AchievementCollectionResponse(
        int capacity,
        List<AchievementResponse> achievements
) {
}
