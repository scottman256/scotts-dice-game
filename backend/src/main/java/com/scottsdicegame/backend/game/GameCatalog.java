package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.score.ScoreCategories;

import java.util.List;
import java.util.Set;

public final class GameCatalog {

    static final String DEFAULT_THEME = "classic";

    public static final List<String> THEME_IDS = List.of(
            "classic", "rainbow", "fire", "beach", "sky", "christmas", "halloween", "golden",
            "retro-arcade", "vegas", "american", "cosmic-galaxy", "sixties-tie-dye",
            "world-traveler", "clockwork", "baseball", "candy-kingdom", "frozen-crystal"
    );

    static final Set<String> THEMES = Set.copyOf(THEME_IDS);

    static final Set<String> STATUS_TONES = Set.of("normal", "celebration", "legendary");

    public static boolean isSupportedTheme(String theme) {
        return THEMES.contains(theme);
    }

    static boolean containsOnlyScoreCategories(Set<String> categories) {
        return ScoreCategories.ALL.containsAll(categories);
    }

    private GameCatalog() {
    }
}
