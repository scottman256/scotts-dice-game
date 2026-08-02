package com.scottsdicegame.backend.score;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ScoreCategories {

    public static final Set<String> ALL = Set.of(
            "ones", "twos", "threes", "fours", "fives", "sixes", "any", "allEven", "allOdd",
            "twoPair", "threeKind", "fourKind", "fullHouse", "miniStraight", "smallStraight",
            "largeStraight", "fiveKind", "fiveKindBonus", "firstRollFiveKind"
    );

    private static final List<String> TOP = List.of(
            "ones", "twos", "threes", "fours", "fives", "sixes", "any", "allEven", "allOdd"
    );

    private static final int FIRST_TOP_BONUS_THRESHOLD = 100;
    private static final int FIRST_TOP_BONUS_POINTS = 40;
    private static final int SECOND_TOP_BONUS_THRESHOLD = 125;
    private static final int SECOND_TOP_BONUS_POINTS = 25;

    private ScoreCategories() {
    }

    public static boolean isCompleteScorecard(Map<String, Integer> scores) {
        return scores != null
                && scores.size() == ALL.size()
                && scores.keySet().equals(ALL)
                && scores.values().stream().allMatch(score -> score != null && score >= 0 && score <= 250);
    }

    public static int topSubtotal(Map<String, Integer> scores) {
        return TOP.stream().mapToInt(category -> scores.getOrDefault(category, 0)).sum();
    }

    public static int grandTotal(Map<String, Integer> scores) {
        int subtotal = scores.values().stream().mapToInt(Integer::intValue).sum();
        int topSubtotal = topSubtotal(scores);
        if (topSubtotal >= FIRST_TOP_BONUS_THRESHOLD) subtotal += FIRST_TOP_BONUS_POINTS;
        if (topSubtotal >= SECOND_TOP_BONUS_THRESHOLD) subtotal += SECOND_TOP_BONUS_POINTS;
        return subtotal;
    }

    public static boolean earnedFirstTopBonus(Map<String, Integer> scores) {
        return topSubtotal(scores) >= FIRST_TOP_BONUS_THRESHOLD;
    }

    public static boolean earnedSecondTopBonus(Map<String, Integer> scores) {
        return topSubtotal(scores) >= SECOND_TOP_BONUS_THRESHOLD;
    }
}
