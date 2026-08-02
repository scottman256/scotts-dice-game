package com.scottsdicegame.backend.score;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionRequest;
import com.scottsdicegame.backend.user.UserAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScoreServiceTest {

    private GameScoreRepository scoreRepository;
    private AuthenticationService authenticationService;
    private ApplicationEventPublisher eventPublisher;
    private ScoreService scoreService;

    @BeforeEach
    void setUp() {
        scoreRepository = mock(GameScoreRepository.class);
        authenticationService = mock(AuthenticationService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        scoreService = new ScoreService(scoreRepository, authenticationService, eventPublisher);
    }

    @Test
    void marksTheFirstSubmittedScoreAsANewPersonalBest() {
        UUID userId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "encoded-password");
        when(scoreRepository.findByUserIdAndGameId(userId, gameId)).thenReturn(Optional.empty());
        when(authenticationService.requireUser(userId)).thenReturn(user);
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
        verify(eventPublisher).publishEvent(new CompletedGameRecordedEvent(userId));
    }

    @Test
    void returnsAnExistingGameSubmissionWithoutSavingItTwice() {
        UUID userId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "encoded-password");
        GameScore existing = new GameScore(gameId, user, 350, true);
        when(scoreRepository.findByUserIdAndGameId(userId, gameId)).thenReturn(Optional.of(existing));

        var response = scoreService.submit(userId, new ScoreSubmissionRequest(
                gameId,
                350,
                "classic",
                scorecard(Map.of("any", 25, "fiveKind", 75, "firstRollFiveKind", 250))
        ));

        assertThat(response.score()).isEqualTo(350);
        assertThat(response.newHighScore()).isTrue();
        verify(scoreRepository, never()).saveAndFlush(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private static Map<String, Integer> scorecard(Map<String, Integer> scoredCategories) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        ScoreCategories.ALL.forEach(category -> scores.put(category, 0));
        scores.putAll(scoredCategories);
        return scores;
    }
}
