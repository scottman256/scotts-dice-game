package com.scottsdicegame.backend.admin;

import java.util.List;
import java.util.UUID;

final class DefaultLeaderboardCatalog {

    static final List<DefaultScore> SCORES = List.of(
            score(1, "Sir Rolls-a-Lot", 499),
            score(2, "Dicey McDiceface", 475),
            score(3, "Pip Zeppelin", 450),
            score(4, "Count Rollula", 425),
            score(5, "Snake Eyes Malone", 400),
            score(6, "Cubert von Chance", 375),
            score(7, "The Rolling Scone", 350),
            score(8, "Lady Luckbeard", 325),
            score(9, "Rollbert Einstein", 300),
            score(10, "Pipsqueak Prime", 250)
    );

    private static DefaultScore score(int position, String playerName, int score) {
        String suffix = "%012d".formatted(position);
        return new DefaultScore(
                UUID.fromString("00000000-0000-4000-8000-" + suffix),
                UUID.fromString("20000000-0000-4000-8000-" + suffix),
                "default-leaderboard-%02d".formatted(position),
                playerName,
                score
        );
    }

    record DefaultScore(
            UUID userId,
            UUID gameId,
            String systemKey,
            String playerName,
            int score
    ) {
    }

    private DefaultLeaderboardCatalog() {
    }
}
