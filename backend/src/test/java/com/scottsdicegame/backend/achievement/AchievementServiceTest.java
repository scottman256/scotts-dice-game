package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.achievement.dto.AchievementCollectionResponse;
import com.scottsdicegame.backend.achievement.dto.AchievementHintResponse;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AchievementServiceTest {

    private UserAchievementRepository achievementRepository;
    private GameScoreRepository scoreRepository;
    private UserAccountRepository userRepository;
    private AchievementService achievementService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        achievementRepository = mock(UserAchievementRepository.class);
        scoreRepository = mock(GameScoreRepository.class);
        userRepository = mock(UserAccountRepository.class);
        achievementService = new AchievementService(achievementRepository, scoreRepository, userRepository);
        userId = UUID.randomUUID();

        UserAccount user = UserAccount.manual(
                "player",
                "player",
                "player@example.com",
                "encoded-password"
        );
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(scoreRepository.findByUserIdOrderByCompletedAtAscIdAsc(userId)).thenReturn(List.of());
    }

    @Test
    void returnsEveryUnearnedHintInCatalogOrderWithoutLockedTitlesOrImages() {
        AchievementCollectionResponse response = responseForKeys(List.of("first-game", "golden-game"));

        assertThat(response.capacity()).isEqualTo(36);
        assertThat(response.achievements()).extracting(achievement -> achievement.key())
                .containsExactly("first-game", "golden-game");
        assertThat(response.lockedAchievements()).hasSize(34);
        assertThat(response.lockedAchievements())
                .extracting(AchievementHintResponse::unlockDescription)
                .startsWith(
                        "Complete 10 games.",
                        "Complete 100 games.",
                        "Complete 500 games.",
                        "Score your first 5 of a kind."
                )
                .contains(
                        "Score 500 total 5 of a kinds.",
                        "Complete games with both the Halloween and Christmas dice."
                )
                .doesNotContain(
                        "Complete your first game.",
                        "Complete a game with the Golden dice."
                );
        assertThat(response.lockedAchievements()).allSatisfy(hint ->
                assertThat(hint.unlockDescription()).isNotBlank());
    }

    @Test
    void revealsTheGrandMasterHintAfterTwentyFiveAchievements() {
        List<String> firstTwentyFiveKeys = AchievementCatalog.DEFINITIONS.stream()
                .limit(25)
                .map(AchievementDefinition::key)
                .toList();

        AchievementCollectionResponse beforeReveal = responseForKeys(firstTwentyFiveKeys.subList(0, 24));
        AchievementCollectionResponse afterReveal = responseForKeys(firstTwentyFiveKeys);

        assertLastHint(beforeReveal, "?????");
        assertLastHint(afterReveal, "Unlocked all 35 other achievements.");
    }

    @Test
    void definesExplicitUnlockCopyForEveryCatalogEntry() {
        assertThat(AchievementCatalog.DEFINITIONS)
                .hasSize(AchievementCatalog.DISPLAY_CAPACITY)
                .allSatisfy(definition -> assertThat(definition.unlockDescription()).isNotBlank());
    }

    private AchievementCollectionResponse responseForKeys(List<String> keys) {
        List<UserAchievement> achievements = java.util.stream.IntStream.range(0, keys.size())
                .mapToObj(index -> earnedAchievement(keys.get(index), index))
                .toList();
        when(achievementRepository.findByUserId(userId)).thenReturn(achievements);
        return achievementService.reconcileForUser(userId);
    }

    private static UserAchievement earnedAchievement(String key, int index) {
        UserAchievement achievement = mock(UserAchievement.class);
        when(achievement.getAchievementKey()).thenReturn(key);
        when(achievement.getAchievedAt()).thenReturn(Instant.EPOCH.plusSeconds(index));
        return achievement;
    }

    private static void assertLastHint(
            AchievementCollectionResponse response,
            String expectedUnlockDescription
    ) {
        List<AchievementHintResponse> hints = response.lockedAchievements();
        assertThat(hints.get(hints.size() - 1).unlockDescription())
                .isEqualTo(expectedUnlockDescription);
    }
}
