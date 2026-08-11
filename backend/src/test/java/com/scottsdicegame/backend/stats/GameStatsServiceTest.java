package com.scottsdicegame.backend.stats;

import com.scottsdicegame.backend.achievement.UserAchievementRepository;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.score.ScoreCategories;
import com.scottsdicegame.backend.stats.dto.GameStatsResponse;
import com.scottsdicegame.backend.user.UserAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GameStatsServiceTest {

    private GameScoreRepository scoreRepository;
    private AuthenticationService authenticationService;
    private UserAchievementRepository achievementRepository;
    private GameStatsService gameStatsService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        scoreRepository = mock(GameScoreRepository.class);
        authenticationService = mock(AuthenticationService.class);
        achievementRepository = mock(UserAchievementRepository.class);
        gameStatsService = new GameStatsService(
                scoreRepository,
                authenticationService,
                achievementRepository
        );
        userId = UUID.randomUUID();
    }

    @Test
    void returnsAnEmptyRecordWhenNoNewDetailedGamesHaveBeenCompleted() {
        when(scoreRepository.findStatTrackedByUserId(userId)).thenReturn(List.of());

        GameStatsResponse response = gameStatsService.getForUser(userId);

        assertThat(response).isEqualTo(GameStatsResponse.empty());
        verify(authenticationService).requireUser(userId);
    }

    @Test
    void calculatesScoreDistributionBonusesAndFiveOfAKindCounts() {
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        Map<String, Integer> firstScores = scorecard(Map.ofEntries(
                Map.entry("ones", 5),
                Map.entry("twos", 10),
                Map.entry("threes", 15),
                Map.entry("fours", 20),
                Map.entry("fives", 25),
                Map.entry("sixes", 30),
                Map.entry("any", 20),
                Map.entry("twoPair", 20),
                Map.entry("largeStraight", 50),
                Map.entry("fiveKindBonus", 150),
                Map.entry("firstRollFiveKind", 250)
        ));
        Map<String, Integer> secondScores = scorecard(Map.ofEntries(
                Map.entry("ones", 5),
                Map.entry("twos", 10),
                Map.entry("threes", 15),
                Map.entry("fours", 20),
                Map.entry("fives", 25),
                Map.entry("any", 25),
                Map.entry("twoPair", 10),
                Map.entry("largeStraight", 50),
                Map.entry("fiveKind", 75)
        ));
        when(scoreRepository.findStatTrackedByUserId(userId)).thenReturn(List.of(
                new GameScore(UUID.randomUUID(), user, 660, true, firstScores),
                new GameScore(UUID.randomUUID(), user, 275, false, secondScores)
        ));

        GameStatsResponse response = gameStatsService.getForUser(userId);

        assertThat(response.gamesPlayed()).isEqualTo(2);
        assertThat(response.highScore()).isEqualTo(660);
        assertThat(response.lowScore()).isEqualTo(275);
        assertThat(response.averageScore()).isEqualTo(467.5);
        assertThat(response.medianScore()).isEqualTo(467.5);
        assertThat(response.fiveOfAKindsScored()).isEqualTo(3);
        assertThat(response.firstRollFiveOfAKinds()).isOne();
        assertThat(response.firstTopBonuses()).isEqualTo(2);
        assertThat(response.secondTopBonuses()).isEqualTo(1);
        assertThat(response.fiveOfAKindBonuses()).isEqualTo(1);
        assertThat(response.totalPoints()).isEqualTo(935);
    }

    @Test
    void calculatesActivityFavoriteThemeScratchesMilestonesAndAchievementCount() {
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        Map<String, Integer> scores = scorecard(Map.of("ones", 5));
        when(achievementRepository.countByUserId(userId)).thenReturn(7L);
        when(scoreRepository.findStatTrackedByUserId(userId)).thenReturn(List.of(
                game(user, 499, scores, "classic", "2026-08-01T12:00:00Z"),
                game(user, 500, scores, "golden", "2026-08-02T12:00:00Z"),
                game(user, 600, scores, "classic", "2026-08-02T18:00:00Z"),
                game(user, 601, scores, "golden", "2026-08-04T12:00:00Z")
        ));

        GameStatsResponse response = gameStatsService.getForUser(userId);

        assertThat(response.activeDays()).isEqualTo(3);
        assertThat(response.longestPlayStreak()).isEqualTo(2);
        assertThat(response.favoriteTheme()).isEqualTo("golden");
        assertThat(response.averageScratchesPerGame()).isEqualTo(18.0);
        assertThat(response.achievementsUnlocked()).isEqualTo(7);
        assertThat(response.gamesAtLeast500()).isEqualTo(3);
        assertThat(response.gamesAtLeast600()).isEqualTo(2);
    }

    @Test
    void keepsUnlockedAchievementCountWhenThereAreNoTrackedGames() {
        when(achievementRepository.countByUserId(userId)).thenReturn(3L);
        when(scoreRepository.findStatTrackedByUserId(userId)).thenReturn(List.of());

        GameStatsResponse response = gameStatsService.getForUser(userId);

        assertThat(response).isEqualTo(GameStatsResponse.empty(3));
    }

    private static GameScore game(
            UserAccount user,
            int total,
            Map<String, Integer> scores,
            String theme,
            String completedAt
    ) {
        GameScore game = new GameScore(UUID.randomUUID(), user, total, false, scores, theme);
        ReflectionTestUtils.setField(game, "completedAt", Instant.parse(completedAt));
        return game;
    }

    private static Map<String, Integer> scorecard(Map<String, Integer> scoredCategories) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        ScoreCategories.ALL.forEach(category -> scores.put(category, 0));
        scores.putAll(scoredCategories);
        return scores;
    }
}
