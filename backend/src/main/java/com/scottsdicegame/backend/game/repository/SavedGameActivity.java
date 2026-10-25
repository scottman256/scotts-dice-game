package com.scottsdicegame.backend.game.repository;

import java.time.Instant;
import java.util.UUID;

public interface SavedGameActivity {
    UUID getUserId();
    Instant getLastPlayed();
}
