package com.scottsdicegame.backend.game.catalog;

import com.scottsdicegame.backend.score.model.ScoreCategories;

import java.util.List;
import java.util.Set;

public final class GameCatalog {

    public static final String DEFAULT_THEME = "classic";

    public static final List<String> THEME_IDS = List.of(
            "classic", "rainbow", "fire", "beach", "sky", "christmas", "halloween", "golden",
            "retro-arcade", "vegas", "american", "cosmic-galaxy", "sixties-tie-dye",
            "world-traveler", "clockwork", "baseball", "candy-kingdom", "frozen-crystal",
            "deep-sea", "jungle-adventure"
    );

    static final Set<String> THEMES = Set.copyOf(THEME_IDS);

    public static final Set<String> STATUS_TONES = Set.of("normal", "celebration", "legendary");

    public static boolean isSupportedTheme(String theme) {
        return THEMES.contains(theme);
    }

    public static boolean containsOnlyScoreCategories(Set<String> categories) {
        return ScoreCategories.ALL.containsAll(categories);
    }

    private GameCatalog() {
    }
}
