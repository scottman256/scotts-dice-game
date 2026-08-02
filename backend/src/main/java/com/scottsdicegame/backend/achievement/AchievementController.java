package com.scottsdicegame.backend.achievement;

import com.scottsdicegame.backend.achievement.dto.AchievementCollectionResponse;
import com.scottsdicegame.backend.auth.AuthenticationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService achievementService;

    public AchievementController(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @GetMapping("/me")
    AchievementCollectionResponse getMine(Authentication authentication) {
        return achievementService.reconcileForUser(userId(authentication));
    }

    private static UUID userId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
