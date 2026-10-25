package com.scottsdicegame.backend.score.repository;

import java.time.Instant;
import java.util.UUID;

public interface PlayerActivity {
    UUID getUserId();
    long getGamesPlayed();
    Instant getLastPlayed();
}
