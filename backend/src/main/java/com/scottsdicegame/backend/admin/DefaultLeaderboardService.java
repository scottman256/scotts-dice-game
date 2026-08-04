package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.score.GameScore;
import com.scottsdicegame.backend.score.GameScoreRepository;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
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
