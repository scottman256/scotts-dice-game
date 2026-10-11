package com.scottsdicegame.backend.score.service;

import com.scottsdicegame.backend.auth.service.AuthenticationService;
import com.scottsdicegame.backend.achievement.service.AchievementService;
import com.scottsdicegame.backend.achievement.dto.AchievementResponse;
import com.scottsdicegame.backend.api.exception.ApiException;
import com.scottsdicegame.backend.game.service.ThemeAvailabilityService;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionRequest;
import com.scottsdicegame.backend.score.entity.GameScore;
import com.scottsdicegame.backend.score.model.ScoreCategories;
import com.scottsdicegame.backend.score.repository.GameScoreRepository;
import com.scottsdicegame.backend.user.entity.UserAccount;
import com.scottsdicegame.backend.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ScoreServiceTest {

    private GameScoreRepository scoreRepository;
    private AuthenticationService authenticationService;
    private AchievementService achievementService;
    private UserAccountRepository userRepository;
    private ScoreService scoreService;
    private ThemeAvailabilityService themeAvailabilityService;

    @BeforeEach
    void setUp() {
        scoreRepository = mock(GameScoreRepository.class);
        authenticationService = mock(AuthenticationService.class);
        achievementService = mock(AchievementService.class);
        userRepository = mock(UserAccountRepository.class);
        themeAvailabilityService = mock(ThemeAvailabilityService.class);
        when(themeAvailabilityService.isEnabled(any())).thenReturn(true);
        scoreService = new ScoreService(
                scoreRepository,
                authenticationService,
                achievementService,
                userRepository,
                themeAvailabilityService
        );
    }

    @Test
    void readsSavedCategoryScoresWithoutChangingTheGameOrRequiringAnEnabledTheme() {
        UUID userId = UUID.randomUUID();
        UUID scoreId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        Map<String, Integer> categories = scorecard(Map.of("fiveKind", 75));
        GameScore game = new GameScore(UUID.randomUUID(), user, 75, false, categories, "vegas");
        when(scoreRepository.findByIdAndUserId(scoreId, userId)).thenReturn(Optional.of(game));

        var response = scoreService.completedGame(userId, scoreId);

        assertThat(response.categoryScores()).isEqualTo(categories);
        assertThat(response.categoryScores()).hasSize(19).containsEntry("fiveKindBonus", 0);
        assertThat(response.score()).isEqualTo(75);
        assertThat(response.theme()).isEqualTo("vegas");
        assertThat(response.scorecardAvailable()).isTrue();
        game.getCategoryScores().clear();
        assertThat(response.categoryScores()).hasSize(19);
        verify(authenticationService).requireUser(userId);
        verify(scoreRepository, never()).saveAndFlush(any());
        verifyNoInteractions(achievementService, themeAvailabilityService, userRepository);
    }

    @Test
    void reportsMissingHistoricalScorecardsWithoutFillingInZeros() {
        UUID userId = UUID.randomUUID();
        UUID scoreId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        when(scoreRepository.findByIdAndUserId(scoreId, userId))
                .thenReturn(Optional.of(new GameScore(UUID.randomUUID(), user, 500, true)));

        var response = scoreService.completedGame(userId, scoreId);

        assertThat(response.score()).isEqualTo(500);
        assertThat(response.theme()).isNull();
        assertThat(response.categoryScores()).isEmpty();
        assertThat(response.scorecardAvailable()).isFalse();
    }

    @Test
    void refusesToReturnAScoreThatDoesNotBelongToThePlayer() {
        UUID userId = UUID.randomUUID();
        UUID scoreId = UUID.randomUUID();
        when(scoreRepository.findByIdAndUserId(scoreId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scoreService.completedGame(userId, scoreId))
                .isInstanceOf(ApiException.class).hasMessage("That completed game could not be found.");
        verify(authenticationService).requireUser(userId);
        verifyNoInteractions(achievementService, themeAvailabilityService, userRepository);
    }

    @Test
    void marksTheFirstSubmittedScoreAsANewPersonalBest() {
        UUID userId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        when(scoreRepository.findByUserIdAndGameId(userId, gameId)).thenReturn(Optional.empty());
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(scoreRepository.countByUserId(userId)).thenReturn(1L);
        when(scoreRepository.countByUserIdAndScore(userId, 425)).thenReturn(1L);
        var achievement = new AchievementResponse("first-game", "First Finish", "Completed your first game.", Instant.EPOCH);
        when(achievementService.reconcileForGame(userId, null)).thenReturn(List.of(achievement));
        when(scoreRepository.findTopByUserIdOrderByScoreDescCompletedAtAsc(userId)).thenReturn(Optional.empty());
        when(scoreRepository.saveAndFlush(any(GameScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = scoreService.submit(userId, new ScoreSubmissionRequest(
                gameId,
                425,
                "golden",
                scorecard(Map.of("any", 25, "fiveKindBonus", 150, "firstRollFiveKind", 250))
        ));

        assertThat(response.newHighScore()).isTrue();
        assertThat(response.score()).isEqualTo(425);
        ArgumentCaptor<GameScore> scoreCaptor = ArgumentCaptor.forClass(GameScore.class);
        verify(scoreRepository).saveAndFlush(scoreCaptor.capture());
        assertThat(scoreCaptor.getValue().isNewPersonalBest()).isTrue();
        assertThat(scoreCaptor.getValue().getTheme()).isEqualTo("golden");
        assertThat(response.personalRank()).isEqualTo(1);
        assertThat(response.totalGames()).isEqualTo(1);
        assertThat(response.tiedRank()).isFalse();
        assertThat(response.unlockedAchievements()).containsExactly(achievement);
        var order = inOrder(userRepository, scoreRepository, achievementService);
        order.verify(userRepository).findByIdForUpdate(userId);
        order.verify(scoreRepository).findByUserIdAndGameId(userId, gameId);
        order.verify(scoreRepository).saveAndFlush(any(GameScore.class));
        order.verify(achievementService).reconcileForGame(userId, null);
    }

    @Test
    void returnsAnExistingGameSubmissionWithoutSavingItTwice() {
        UUID userId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "encoded-password");
        GameScore existing = new GameScore(gameId, user, 350, true);
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(scoreRepository.findByUserIdAndGameId(userId, gameId)).thenReturn(Optional.of(existing));
        when(scoreRepository.countByUserIdAndScoreGreaterThan(userId, 350)).thenReturn(2L);
        when(scoreRepository.countByUserId(userId)).thenReturn(47L);
        when(scoreRepository.countByUserIdAndScore(userId, 350)).thenReturn(3L);

        var response = scoreService.submit(userId, new ScoreSubmissionRequest(
                gameId,
                350,
                "classic",
                scorecard(Map.of("any", 25, "fiveKind", 75, "firstRollFiveKind", 250))
        ));

        assertThat(response.score()).isEqualTo(350);
        assertThat(response.newHighScore()).isTrue();
        verify(scoreRepository, never()).saveAndFlush(any());
        assertThat(response.personalRank()).isEqualTo(3);
        assertThat(response.totalGames()).isEqualTo(47);
        assertThat(response.tiedRank()).isTrue();
        assertThat(response.unlockedAchievements()).isEmpty();
        verify(achievementService).reconcileForGame(userId, existing.getId());
    }

    @Test
    void rejectsSubmissionsForAnAccountThatNoLongerExists() {
        assertThatThrownBy(() -> scoreService.submit(UUID.randomUUID(), new ScoreSubmissionRequest(
                UUID.randomUUID(), 0, "classic", scorecard(Map.of())
        ))).isInstanceOf(ApiException.class).hasMessage("The signed-in account no longer exists.");
        verify(scoreRepository, never()).saveAndFlush(any());
        verify(achievementService, never()).reconcileForGame(any(), any());
    }

    private static Map<String, Integer> scorecard(Map<String, Integer> scoredCategories) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        ScoreCategories.ALL.forEach(category -> scores.put(category, 0));
        scores.putAll(scoredCategories);
        return scores;
    }
}
