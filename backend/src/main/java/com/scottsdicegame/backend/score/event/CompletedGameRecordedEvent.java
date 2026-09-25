package com.scottsdicegame.backend.score.event;

import java.util.UUID;

public record CompletedGameRecordedEvent(UUID userId) {
}
