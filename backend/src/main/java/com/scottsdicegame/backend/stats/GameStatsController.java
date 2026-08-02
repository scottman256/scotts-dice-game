package com.scottsdicegame.backend.stats;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.stats.dto.GameStatsResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/stats")
public class GameStatsController {

    private final GameStatsService gameStatsService;

    public GameStatsController(GameStatsService gameStatsService) {
        this.gameStatsService = gameStatsService;
    }

    @GetMapping("/me")
    GameStatsResponse getMyStats(Authentication authentication) {
        return gameStatsService.getForUser(userId(authentication));
    }

    private static UUID userId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
