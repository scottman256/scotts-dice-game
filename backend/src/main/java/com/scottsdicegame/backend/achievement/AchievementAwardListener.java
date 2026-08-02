package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.score.CompletedGameRecordedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class AchievementAwardListener {

    private final AchievementService achievementService;

    public AchievementAwardListener(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void completedGameRecorded(CompletedGameRecordedEvent event) {
        achievementService.reconcileForUser(event.userId());
    }
}
