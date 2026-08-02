package com.scottsdicegame.backend.stats;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.score.ScoreCategories;
import com.scottsdicegame.backend.stats.dto.GameStatsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GameStatsService {

    private final GameScoreRepository scoreRepository;
    private final AuthenticationService authenticationService;

    public GameStatsService(
            GameScoreRepository scoreRepository,
            AuthenticationService authenticationService
    ) {
        this.scoreRepository = scoreRepository;
        this.authenticationService = authenticationService;
    }

    @Transactional(readOnly = true)
    public GameStatsResponse getForUser(UUID userId) {
        authenticationService.requireUser(userId);
        List<GameScore> games = scoreRepository.findStatTrackedByUserId(userId);
        if (games.isEmpty()) return GameStatsResponse.empty();

        List<Integer> totals = games.stream().map(GameScore::getScore).sorted().toList();
        long totalPoints = totals.stream().mapToLong(Integer::longValue).sum();
        long fiveOfAKinds = 0;
        long firstRollFiveOfAKinds = 0;
        long firstTopBonuses = 0;
        long secondTopBonuses = 0;
        long fiveOfAKindBonuses = 0;

        for (GameScore game : games) {
            Map<String, Integer> scores = game.getCategoryScores();
            fiveOfAKinds += scored(scores, "fiveKind")
                    + scored(scores, "fiveKindBonus")
                    + scored(scores, "firstRollFiveKind");
            firstRollFiveOfAKinds += scored(scores, "firstRollFiveKind");
            fiveOfAKindBonuses += scored(scores, "fiveKindBonus");
            if (ScoreCategories.earnedFirstTopBonus(scores)) firstTopBonuses++;
            if (ScoreCategories.earnedSecondTopBonus(scores)) secondTopBonuses++;
        }

        int middle = totals.size() / 2;
        double median = totals.size() % 2 == 0
                ? (totals.get(middle - 1) + totals.get(middle)) / 2.0
                : totals.get(middle);

        return new GameStatsResponse(
                games.size(),
                totals.get(totals.size() - 1),
                totals.get(0),
                totalPoints / (double) games.size(),
                median,
                fiveOfAKinds,
                firstRollFiveOfAKinds,
                firstTopBonuses,
                secondTopBonuses,
                fiveOfAKindBonuses,
                totalPoints
        );
    }

    private static int scored(Map<String, Integer> scores, String category) {
        return scores.getOrDefault(category, 0) > 0 ? 1 : 0;
    }
}
