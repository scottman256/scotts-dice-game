package com.scottsdicegame.backend.score;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.game.GameCatalog;
import com.scottsdicegame.backend.game.ThemeAvailabilityService;
import com.scottsdicegame.backend.score.dto.LeaderboardEntry;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionRequest;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionResponse;
import com.scottsdicegame.backend.user.UserAccount;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ScoreService {

    private final GameScoreRepository scoreRepository;
    private final AuthenticationService authenticationService;
    private final ApplicationEventPublisher eventPublisher;
    private final ThemeAvailabilityService themeAvailabilityService;

    public ScoreService(
            GameScoreRepository scoreRepository,
            AuthenticationService authenticationService,
            ApplicationEventPublisher eventPublisher,
            ThemeAvailabilityService themeAvailabilityService
    ) {
        this.scoreRepository = scoreRepository;
        this.authenticationService = authenticationService;
        this.eventPublisher = eventPublisher;
        this.themeAvailabilityService = themeAvailabilityService;
    }

    @Transactional
    public ScoreSubmissionResponse submit(UUID userId, ScoreSubmissionRequest request) {
        validateCompletedScorecard(request);
        return scoreRepository.findByUserIdAndGameId(userId, request.gameId())
                .map(ScoreSubmissionResponse::from)
                .orElseGet(() -> saveNewScore(userId, request));
    }

    private ScoreSubmissionResponse saveNewScore(UUID userId, ScoreSubmissionRequest request) {
        UserAccount user = authenticationService.requireUser(userId);
        boolean newPersonalBest = scoreRepository
                .findTopByUserIdOrderByScoreDescCompletedAtAsc(userId)
                .map(previousBest -> request.score() > previousBest.getScore())
                .orElse(true);
        GameScore saved = scoreRepository.saveAndFlush(
                new GameScore(
                        request.gameId(),
                        user,
                        request.score(),
                        newPersonalBest,
                        request.categoryScores(),
                        request.theme()
                )
        );
        eventPublisher.publishEvent(new CompletedGameRecordedEvent(userId));
        return ScoreSubmissionResponse.from(saved);
    }

    private void validateCompletedScorecard(ScoreSubmissionRequest request) {
        if (!GameCatalog.isSupportedTheme(request.theme()) || !themeAvailabilityService.isEnabled(request.theme())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_GAME_THEME",
                    "The completed game's theme is not supported."
            );
        }
        if (!ScoreCategories.isCompleteScorecard(request.categoryScores())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_SCORECARD",
                    "The completed game must include every score category."
            );
        }
        if (ScoreCategories.grandTotal(request.categoryScores()) != request.score()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "SCORE_TOTAL_MISMATCH",
                    "The final score does not match the completed scorecard."
            );
        }
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> personalTopTen(UUID userId) {
        authenticationService.requireUser(userId);
        return ranked(scoreRepository.findTop10ByUserIdOrderByScoreDescCompletedAtAsc(userId));
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> globalTopTen(UUID userId) {
        authenticationService.requireUser(userId);
        return ranked(scoreRepository.findTop10ByOrderByScoreDescCompletedAtAsc());
    }

    private static List<LeaderboardEntry> ranked(List<GameScore> scores) {
        List<LeaderboardEntry> entries = new ArrayList<>(scores.size());
        for (int index = 0; index < scores.size(); index++) {
            GameScore score = scores.get(index);
            entries.add(new LeaderboardEntry(
                    index + 1,
                    score.getId(),
                    score.getScore(),
                    score.getCompletedAt(),
                    score.getUser().getDisplayName()
            ));
        }
        return List.copyOf(entries);
    }
}
