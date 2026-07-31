package com.scottsdicegame.backend.game;

import java.util.Set;

final class GameCatalog {

    static final String DEFAULT_THEME = "classic";

    static final Set<String> THEMES = Set.of(
            "classic", "rainbow", "fire", "beach", "sky", "christmas", "halloween", "golden",
            "retro-arcade", "vegas", "american", "cosmic-galaxy", "sixties-tie-dye",
            "world-traveler", "clockwork", "baseball"
    );

    static final Set<String> SCORE_CATEGORIES = Set.of(
            "ones", "twos", "threes", "fours", "fives", "sixes", "any", "allEven", "allOdd",
            "twoPair", "threeKind", "fourKind", "fullHouse", "miniStraight", "smallStraight",
            "largeStraight", "fiveKind", "fiveKindBonus", "firstRollFiveKind"
    );

    static final Set<String> STATUS_TONES = Set.of("normal", "celebration", "legendary");

    private GameCatalog() {
    }
}
