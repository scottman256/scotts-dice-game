package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.achievement.dto.AchievementCollectionResponse;
import com.scottsdicegame.backend.achievement.dto.AchievementHintResponse;
import com.scottsdicegame.backend.achievement.dto.AchievementResponse;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AchievementService {

    private static final String GRAND_MASTER_KEY = "grand-master";
    private static final int GRAND_MASTER_HINT_REVEAL_COUNT = 25;
    private static final String HIDDEN_ACHIEVEMENT_HINT = "?????";

    private final UserAchievementRepository achievementRepository;
    private final GameScoreRepository scoreRepository;
    private final UserAccountRepository userRepository;

    public AchievementService(
            UserAchievementRepository achievementRepository,
            GameScoreRepository scoreRepository,
            UserAccountRepository userRepository
    ) {
        this.achievementRepository = achievementRepository;
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AchievementCollectionResponse reconcileForUser(UUID userId) {
        UserAccount user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "ACCOUNT_NOT_FOUND",
                        "The signed-in account no longer exists."
                ));
        List<UserAchievement> earned = new ArrayList<>(achievementRepository.findByUserId(userId));
        Set<String> earnedKeys = new HashSet<>();
        earned.forEach(achievement -> earnedKeys.add(achievement.getAchievementKey()));

        List<GameScore> history = scoreRepository.findByUserIdOrderByCompletedAtAscIdAsc(userId);
        List<UserAchievement> newlyEarned = AchievementEvaluator.evaluate(history, earnedKeys).stream()
                .map(unlock -> new UserAchievement(user, unlock))
                .toList();
        if (!newlyEarned.isEmpty()) {
            earned.addAll(achievementRepository.saveAll(newlyEarned));
        }

        List<AchievementResponse> responses = earned.stream()
                .filter(achievement -> AchievementCatalog.find(achievement.getAchievementKey()).isPresent())
                .sorted(Comparator
                        .comparing(UserAchievement::getAchievedAt)
                        .thenComparingInt(AchievementService::catalogOrder))
                .map(AchievementService::toResponse)
                .toList();
        return new AchievementCollectionResponse(
                AchievementCatalog.DISPLAY_CAPACITY,
                responses,
                lockedAchievementHints(responses)
        );
    }

    @Transactional
    public void rebuildForUser(UUID userId) {
        UserAccount user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "That user account no longer exists."
                ));
        achievementRepository.deleteByUserId(userId);
        achievementRepository.flush();

        List<GameScore> history = scoreRepository.findByUserIdOrderByCompletedAtAscIdAsc(userId);
        List<UserAchievement> rebuilt = AchievementEvaluator.evaluate(history, Set.of()).stream()
                .map(unlock -> new UserAchievement(user, unlock))
                .toList();
        if (!rebuilt.isEmpty()) {
            achievementRepository.saveAll(rebuilt);
        }
    }

    private static int catalogOrder(UserAchievement achievement) {
        return AchievementCatalog.find(achievement.getAchievementKey())
                .map(AchievementDefinition::catalogOrder)
                .orElse(Integer.MAX_VALUE);
    }

    private static AchievementResponse toResponse(UserAchievement achievement) {
        AchievementDefinition definition = AchievementCatalog.find(achievement.getAchievementKey())
                .orElseThrow();
        return new AchievementResponse(
                definition.key(),
                definition.title(),
                definition.description(),
                achievement.getAchievedAt()
        );
    }

    private static List<AchievementHintResponse> lockedAchievementHints(
            List<AchievementResponse> earnedAchievements
    ) {
        Set<String> earnedKeys = earnedAchievements.stream()
                .map(AchievementResponse::key)
                .collect(java.util.stream.Collectors.toSet());
        int earnedCount = earnedKeys.size();

        return AchievementCatalog.DEFINITIONS.stream()
                .filter(definition -> !earnedKeys.contains(definition.key()))
                .map(definition -> new AchievementHintResponse(
                        unlockDescription(definition, earnedCount)
                ))
                .toList();
    }

    private static String unlockDescription(AchievementDefinition definition, int earnedCount) {
        if (definition.key().equals(GRAND_MASTER_KEY)
                && earnedCount < GRAND_MASTER_HINT_REVEAL_COUNT) {
            return HIDDEN_ACHIEVEMENT_HINT;
        }
        return definition.unlockDescription();
    }
}
