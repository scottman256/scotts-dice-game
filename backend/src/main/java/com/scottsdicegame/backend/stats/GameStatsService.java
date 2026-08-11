package com.scottsdicegame.backend.stats;

import com.scottsdicegame.backend.achievement.UserAchievementRepository;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.GameCatalog;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.score.ScoreCategories;
import com.scottsdicegame.backend.stats.dto.GameStatsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;

@Service
public class GameStatsService {

    private final GameScoreRepository scoreRepository;
    private final AuthenticationService authenticationService;
    private final UserAchievementRepository achievementRepository;

    public GameStatsService(
            GameScoreRepository scoreRepository,
            AuthenticationService authenticationService,
            UserAchievementRepository achievementRepository
    ) {
        this.scoreRepository = scoreRepository;
        this.authenticationService = authenticationService;
        this.achievementRepository = achievementRepository;
    }

    @Transactional(readOnly = true)
    public GameStatsResponse getForUser(UUID userId) {
        authenticationService.requireUser(userId);
        long achievementsUnlocked = achievementRepository.countByUserId(userId);
        List<GameScore> games = scoreRepository.findStatTrackedByUserId(userId);
        if (games.isEmpty()) return GameStatsResponse.empty(achievementsUnlocked);

        List<Integer> totals = games.stream().map(GameScore::getScore).sorted().toList();
        long totalPoints = totals.stream().mapToLong(Integer::longValue).sum();
        long totalScratches = 0;
        long gamesAtLeast500 = 0;
        long gamesAtLeast600 = 0;
        long fiveOfAKinds = 0;
        long firstRollFiveOfAKinds = 0;
        long firstTopBonuses = 0;
        long secondTopBonuses = 0;
        long fiveOfAKindBonuses = 0;
        SortedSet<LocalDate> activeDays = new TreeSet<>();
        Map<String, ThemeUsage> themeUsage = new HashMap<>();

        for (GameScore game : games) {
            Map<String, Integer> scores = game.getCategoryScores();
            totalScratches += scores.values().stream().filter(score -> score == 0).count();
            if (game.getScore() >= 500) gamesAtLeast500++;
            if (game.getScore() >= 600) gamesAtLeast600++;
            fiveOfAKinds += scored(scores, "fiveKind")
                    + scored(scores, "fiveKindBonus")
                    + scored(scores, "firstRollFiveKind");
            firstRollFiveOfAKinds += scored(scores, "firstRollFiveKind");
            fiveOfAKindBonuses += scored(scores, "fiveKindBonus");
            if (ScoreCategories.earnedFirstTopBonus(scores)) firstTopBonuses++;
            if (ScoreCategories.earnedSecondTopBonus(scores)) secondTopBonuses++;

            Instant completedAt = game.getCompletedAt();
            if (completedAt != null) {
                activeDays.add(LocalDate.ofInstant(completedAt, ZoneOffset.UTC));
            }
            if (game.getTheme() != null) {
                themeUsage.compute(
                        game.getTheme(),
                        (theme, usage) -> usage == null
                                ? new ThemeUsage(1, completedAt)
                                : usage.record(completedAt)
                );
            }
        }

        int middle = totals.size() / 2;
        double median = totals.size() % 2 == 0
                ? (totals.get(middle - 1) + totals.get(middle)) / 2.0
                : totals.get(middle);

        return new GameStatsResponse(
                games.size(),
                activeDays.size(),
                longestStreak(activeDays),
                favoriteTheme(themeUsage),
                totals.get(totals.size() - 1),
                totals.get(0),
                totalPoints / (double) games.size(),
                median,
                totalScratches / (double) games.size(),
                achievementsUnlocked,
                gamesAtLeast500,
                gamesAtLeast600,
                fiveOfAKinds,
                firstRollFiveOfAKinds,
                firstTopBonuses,
                secondTopBonuses,
                fiveOfAKindBonuses,
                totalPoints
        );
    }

    private static int scored(Map<String, Integer> scores, String category) {
        return scores.getOrDefault(category, 0) > 0 ? 1 : 0;
    }

    private static long longestStreak(SortedSet<LocalDate> activeDays) {
        LocalDate previousDay = null;
        long currentStreak = 0;
        long longestStreak = 0;

        for (LocalDate activeDay : activeDays) {
            currentStreak = previousDay != null && activeDay.equals(previousDay.plusDays(1))
                    ? currentStreak + 1
                    : 1;
            longestStreak = Math.max(longestStreak, currentStreak);
            previousDay = activeDay;
        }
        return longestStreak;
    }

    private static String favoriteTheme(Map<String, ThemeUsage> themeUsage) {
        return themeUsage.entrySet().stream()
                .max(Comparator
                        .<Map.Entry<String, ThemeUsage>>comparingLong(entry -> entry.getValue().gamesPlayed())
                        .thenComparing(
                                entry -> entry.getValue().lastPlayed(),
                                Comparator.nullsFirst(Comparator.naturalOrder())
                        )
                        .thenComparingInt(entry -> -themeOrder(entry.getKey())))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static int themeOrder(String theme) {
        int index = GameCatalog.THEME_IDS.indexOf(theme);
        return index >= 0 ? index : Integer.MAX_VALUE;
    }

    private record ThemeUsage(long gamesPlayed, Instant lastPlayed) {

        private ThemeUsage record(Instant completedAt) {
            Instant latest = completedAt != null && (lastPlayed == null || completedAt.isAfter(lastPlayed))
                    ? completedAt
                    : lastPlayed;
            return new ThemeUsage(gamesPlayed + 1, latest);
        }
    }
}
