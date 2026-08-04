package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.achievement.AchievementService;
import com.scottsdicegame.backend.achievement.UserAchievementRepository;
import com.scottsdicegame.backend.admin.dto.AdminGameDataResetResponse;
import com.scottsdicegame.backend.admin.dto.AdminSystemScoreRequest;
import com.scottsdicegame.backend.admin.dto.AdminSystemScoreResponse;
import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.SavedGameRepository;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminGameDataService {

    private static final String ADMIN_SYSTEM_KEY_PREFIX = "admin-leaderboard-";

    private final AuthenticationService authenticationService;
    private final UserAccountRepository userRepository;
    private final GameScoreRepository scoreRepository;
    private final UserAchievementRepository achievementRepository;
    private final SavedGameRepository savedGameRepository;
    private final AchievementService achievementService;
    private final DefaultLeaderboardService defaultLeaderboardService;

    public AdminGameDataService(
            AuthenticationService authenticationService,
            UserAccountRepository userRepository,
            GameScoreRepository scoreRepository,
            UserAchievementRepository achievementRepository,
            SavedGameRepository savedGameRepository,
            AchievementService achievementService,
            DefaultLeaderboardService defaultLeaderboardService
    ) {
        this.authenticationService = authenticationService;
        this.userRepository = userRepository;
        this.scoreRepository = scoreRepository;
        this.achievementRepository = achievementRepository;
        this.savedGameRepository = savedGameRepository;
        this.achievementService = achievementService;
        this.defaultLeaderboardService = defaultLeaderboardService;
    }

    @Transactional
    public AdminSystemScoreResponse addSystemScore(UUID adminId, AdminSystemScoreRequest request) {
        authenticationService.requireAdmin(adminId);
        String playerName = request.playerName().trim();
        UUID identity = UUID.randomUUID();
        UserAccount user = userRepository.saveAndFlush(UserAccount.system(
                ADMIN_SYSTEM_KEY_PREFIX + identity,
                playerName
        ));
        GameScore score = scoreRepository.saveAndFlush(GameScore.systemScore(
                null,
                UUID.randomUUID(),
                user,
                request.score(),
                false
        ));
        return new AdminSystemScoreResponse(score.getId(), playerName, score.getScore());
    }

    @Transactional
    public void deleteScore(UUID adminId, UUID scoreId) {
        authenticationService.requireAdmin(adminId);
        GameScore score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SCORE_NOT_FOUND", "That score no longer exists."));
        UserAccount owner = score.getUser();
        UUID ownerId = owner.getId();
        boolean systemScore = owner.getAuthProvider() == AuthProvider.SYSTEM;

        scoreRepository.delete(score);
        scoreRepository.flush();

        if (systemScore) {
            if (!score.isDefaultSeed() && !scoreRepository.existsByUserId(ownerId)) {
                userRepository.delete(owner);
            }
            return;
        }
        achievementService.rebuildForUser(ownerId);
    }

    @Transactional
    public AdminGameDataResetResponse resetGameData(UUID adminId) {
        authenticationService.requireAdmin(adminId);
        long achievementsDeleted = achievementRepository.count();
        long savedGamesDeleted = savedGameRepository.count();
        achievementRepository.deleteAllInBatch();
        savedGameRepository.deleteAllInBatch();
        int scoresDeleted = scoreRepository.deleteAllNonDefaultScores();
        userRepository.deleteByAuthProviderAndExternalSubjectStartingWith(
                AuthProvider.SYSTEM,
                ADMIN_SYSTEM_KEY_PREFIX
        );
        int defaultsRestored = defaultLeaderboardService.restoreMissingScores();
        return new AdminGameDataResetResponse(
                scoresDeleted,
                achievementsDeleted,
                savedGamesDeleted,
                defaultsRestored
        );
    }
}
