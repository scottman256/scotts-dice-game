package com.scottsdicegame.backend.admin.service;

import com.scottsdicegame.backend.admin.catalog.DefaultLeaderboardCatalog;
import com.scottsdicegame.backend.score.entity.GameScore;
import com.scottsdicegame.backend.score.repository.GameScoreRepository;
import com.scottsdicegame.backend.user.entity.UserAccount;
import com.scottsdicegame.backend.user.model.AuthProvider;
import com.scottsdicegame.backend.user.repository.UserAccountRepository;
import org.springframework.stereotype.Service;

@Service
class DefaultLeaderboardService {

    private final UserAccountRepository userRepository;
    private final GameScoreRepository scoreRepository;

    DefaultLeaderboardService(UserAccountRepository userRepository, GameScoreRepository scoreRepository) {
        this.userRepository = userRepository;
        this.scoreRepository = scoreRepository;
    }

    int restoreMissingScores() {
        int restored = 0;
        for (DefaultLeaderboardCatalog.DefaultScore defaultScore : DefaultLeaderboardCatalog.SCORES) {
            UserAccount user = userRepository
                    .findByAuthProviderAndExternalSubject(AuthProvider.SYSTEM, defaultScore.systemKey())
                    .orElseGet(() -> userRepository.saveAndFlush(UserAccount.system(
                            defaultScore.userId(),
                            defaultScore.systemKey(),
                            defaultScore.playerName()
                    )));
            if (scoreRepository.existsByUserId(user.getId())) continue;

            scoreRepository.saveAndFlush(GameScore.systemScore(
                    null,
                    defaultScore.gameId(),
                    user,
                    defaultScore.score(),
                    true
            ));
            restored++;
        }
        return restored;
    }
}
