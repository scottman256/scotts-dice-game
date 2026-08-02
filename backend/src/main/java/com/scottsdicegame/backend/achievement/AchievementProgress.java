package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.GameScore;

import java.util.Map;

final class AchievementProgress {

    private long gamesPlayed;
    private long totalPoints;
    private long scoresAtLeast500;
    private long fiveOfAKinds;
    private long firstRollFiveOfAKinds;
    private long largeStraights;

    void record(GameScore game) {
        gamesPlayed++;
        totalPoints += game.getScore();
        if (game.getScore() >= 500) scoresAtLeast500++;

        Map<String, Integer> scores = game.getCategoryScores();
        fiveOfAKinds += scored(scores, "fiveKind")
                + scored(scores, "fiveKindBonus")
                + scored(scores, "firstRollFiveKind");
        firstRollFiveOfAKinds += scored(scores, "firstRollFiveKind");
        largeStraights += scored(scores, "largeStraight");
    }

    long gamesPlayed() {
        return gamesPlayed;
    }

    long totalPoints() {
        return totalPoints;
    }

    long scoresAtLeast500() {
        return scoresAtLeast500;
    }

    long fiveOfAKinds() {
        return fiveOfAKinds;
    }

    long firstRollFiveOfAKinds() {
        return firstRollFiveOfAKinds;
    }

    long largeStraights() {
        return largeStraights;
    }

    private static int scored(Map<String, Integer> scores, String category) {
        return scores.getOrDefault(category, 0) > 0 ? 1 : 0;
    }
}
