package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.achievement.AchievementService;
import com.scottsdicegame.backend.achievement.UserAchievementRepository;
import com.scottsdicegame.backend.admin.dto.AdminSystemScoreRequest;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.SavedGameRepository;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminGameDataServiceTest {

    private AuthenticationService authenticationService;
    private UserAccountRepository userRepository;
    private GameScoreRepository scoreRepository;
    private UserAchievementRepository achievementRepository;
    private SavedGameRepository savedGameRepository;
    private AchievementService achievementService;
    private DefaultLeaderboardService defaultLeaderboardService;
    private AdminGameDataService service;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        authenticationService = mock(AuthenticationService.class);
        userRepository = mock(UserAccountRepository.class);
        scoreRepository = mock(GameScoreRepository.class);
        achievementRepository = mock(UserAchievementRepository.class);
        savedGameRepository = mock(SavedGameRepository.class);
        achievementService = mock(AchievementService.class);
        defaultLeaderboardService = mock(DefaultLeaderboardService.class);
        service = new AdminGameDataService(
                authenticationService,
                userRepository,
                scoreRepository,
                achievementRepository,
                savedGameRepository,
                achievementService,
                defaultLeaderboardService
        );
        adminId = UUID.randomUUID();
    }

    @Test
    void addsANonLoginSystemScore() {
        UserAccount user = UserAccount.system("admin-key", "Fishman");
        UUID scoreId = UUID.randomUUID();
        GameScore savedScore = mock(GameScore.class);
        when(savedScore.getId()).thenReturn(scoreId);
        when(savedScore.getScore()).thenReturn(999);
        when(userRepository.saveAndFlush(any(UserAccount.class))).thenReturn(user);
        when(scoreRepository.saveAndFlush(any(GameScore.class))).thenReturn(savedScore);

        var response = service.addSystemScore(adminId, new AdminSystemScoreRequest(" Fishman ", 999));

        assertThat(response.scoreId()).isEqualTo(scoreId);
        assertThat(response.playerName()).isEqualTo("Fishman");
        verify(authenticationService).requireAdmin(adminId);
    }

    @Test
    void deletingAPlayerScoreRebuildsAchievementsFromRemainingHistory() {
        UUID scoreId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UserAccount owner = owner(ownerId, AuthProvider.MANUAL);
        GameScore score = score(owner, false);
        when(scoreRepository.findById(scoreId)).thenReturn(Optional.of(score));

        service.deleteScore(adminId, scoreId);

        verify(scoreRepository).delete(score);
        verify(scoreRepository).flush();
        verify(achievementService).rebuildForUser(ownerId);
    }

    @Test
    void deletingACustomSystemScoreRemovesItsOrphanAccountButKeepsDefaultAccounts() {
        UUID customId = UUID.randomUUID();
        UserAccount customOwner = owner(UUID.randomUUID(), AuthProvider.SYSTEM);
        GameScore customScore = score(customOwner, false);
        when(scoreRepository.findById(customId)).thenReturn(Optional.of(customScore));
        when(scoreRepository.existsByUserId(customOwner.getId())).thenReturn(false);
        service.deleteScore(adminId, customId);
        verify(userRepository).delete(customOwner);

        UUID defaultId = UUID.randomUUID();
        UserAccount defaultOwner = owner(UUID.randomUUID(), AuthProvider.SYSTEM);
        GameScore defaultScore = score(defaultOwner, true);
        when(scoreRepository.findById(defaultId)).thenReturn(Optional.of(defaultScore));
        service.deleteScore(adminId, defaultId);
        verify(userRepository, never()).delete(defaultOwner);
    }

    @Test
    void resetRemovesDerivedDataAndRestoresMissingDefaults() {
        when(achievementRepository.count()).thenReturn(12L);
        when(savedGameRepository.count()).thenReturn(3L);
        when(scoreRepository.deleteAllNonDefaultScores()).thenReturn(7);
        when(defaultLeaderboardService.restoreMissingScores()).thenReturn(2);

        var response = service.resetGameData(adminId);

        assertThat(response.scoresDeleted()).isEqualTo(7);
        assertThat(response.achievementsDeleted()).isEqualTo(12);
        assertThat(response.savedGamesDeleted()).isEqualTo(3);
        assertThat(response.defaultsRestored()).isEqualTo(2);
        verify(achievementRepository).deleteAllInBatch();
        verify(savedGameRepository).deleteAllInBatch();
        verify(userRepository).deleteByAuthProviderAndExternalSubjectStartingWith(
                AuthProvider.SYSTEM,
                "admin-leaderboard-"
        );
    }

    private static UserAccount owner(UUID id, AuthProvider provider) {
        UserAccount owner = mock(UserAccount.class);
        when(owner.getId()).thenReturn(id);
        when(owner.getAuthProvider()).thenReturn(provider);
        return owner;
    }

    private static GameScore score(UserAccount owner, boolean defaultSeed) {
        GameScore score = mock(GameScore.class);
        when(score.getUser()).thenReturn(owner);
        when(score.isDefaultSeed()).thenReturn(defaultSeed);
        return score;
    }
}
