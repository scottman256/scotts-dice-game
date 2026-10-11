package com.scottsdicegame.backend.score.service;

import com.scottsdicegame.backend.api.exception.ApiException;
import com.scottsdicegame.backend.achievement.service.AchievementService;
import com.scottsdicegame.backend.auth.service.AuthenticationService;
import com.scottsdicegame.backend.game.catalog.GameCatalog;
import com.scottsdicegame.backend.game.service.ThemeAvailabilityService;
import com.scottsdicegame.backend.score.dto.LeaderboardEntry;
import com.scottsdicegame.backend.score.dto.CompletedGameResponse;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionRequest;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionResponse;
import com.scottsdicegame.backend.score.entity.GameScore;
import com.scottsdicegame.backend.score.model.ScoreCategories;
import com.scottsdicegame.backend.score.repository.GameScoreRepository;
import com.scottsdicegame.backend.user.entity.UserAccount;
import com.scottsdicegame.backend.user.repository.UserAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ScoreService {

    private final GameScoreRepository scoreRepository;
    private final AuthenticationService authenticationService;
    private final AchievementService achievementService;
    private final UserAccountRepository userRepository;
    private final ThemeAvailabilityService themeAvailabilityService;

    public ScoreService(
            GameScoreRepository scoreRepository,
            AuthenticationService authenticationService,
            AchievementService achievementService,
            UserAccountRepository userRepository,
            ThemeAvailabilityService themeAvailabilityService
    ) {
        this.scoreRepository = scoreRepository;
        this.authenticationService = authenticationService;
        this.achievementService = achievementService;
        this.userRepository = userRepository;
        this.themeAvailabilityService = themeAvailabilityService;
    }

    @Transactional
    public ScoreSubmissionResponse submit(UUID userId, ScoreSubmissionRequest request) {
        validateCompletedScorecard(request);
        // Serialize submissions for this player, including retries of the same game.
        UserAccount user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "ACCOUNT_NOT_FOUND",
                        "The signed-in account no longer exists."
                ));
        GameScore saved = scoreRepository.findByUserIdAndGameId(userId, request.gameId())
                .orElseGet(() -> saveNewScore(userId, user, request));
        var unlockedAchievements = achievementService.reconcileForGame(userId, saved.getId());
        return ScoreSubmissionResponse.from(
                saved,
                scoreRepository.countByUserIdAndScoreGreaterThan(userId, saved.getScore()) + 1,
                scoreRepository.countByUserId(userId),
                scoreRepository.countByUserIdAndScore(userId, saved.getScore()) > 1,
                unlockedAchievements
        );
    }

    private GameScore saveNewScore(UUID userId, UserAccount user, ScoreSubmissionRequest request) {
        boolean newPersonalBest = scoreRepository
                .findTopByUserIdOrderByScoreDescCompletedAtAsc(userId)
                .map(previousBest -> request.score() > previousBest.getScore())
                .orElse(true);
        return scoreRepository.saveAndFlush(
                new GameScore(
                        request.gameId(),
                        user,
                        request.score(),
                        newPersonalBest,
                        request.categoryScores(),
                        request.theme()
                )
        );
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
    public CompletedGameResponse completedGame(UUID userId, UUID scoreId) {
        authenticationService.requireUser(userId);
        GameScore game = scoreRepository.findByIdAndUserId(scoreId, userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "SCORE_NOT_FOUND",
                        "That completed game could not be found."
                ));
        return CompletedGameResponse.from(game);
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
