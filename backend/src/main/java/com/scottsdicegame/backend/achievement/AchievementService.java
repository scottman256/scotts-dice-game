package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.achievement.dto.AchievementCollectionResponse;
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
        return new AchievementCollectionResponse(AchievementCatalog.DISPLAY_CAPACITY, responses);
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
}
