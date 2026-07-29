package com.scottsdicegame.backend.score;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.score.dto.LeaderboardEntry;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionRequest;
import com.scottsdicegame.backend.score.dto.ScoreSubmissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    private final ScoreService scoreService;

    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ScoreSubmissionResponse submit(
            Authentication authentication,
            @Valid @RequestBody ScoreSubmissionRequest request
    ) {
        return scoreService.submit(userId(authentication), request);
    }

    @GetMapping("/me")
    List<LeaderboardEntry> personalTopTen(Authentication authentication) {
        return scoreService.personalTopTen(userId(authentication));
    }

    @GetMapping("/leaderboard")
    List<LeaderboardEntry> globalTopTen(Authentication authentication) {
        return scoreService.globalTopTen(userId(authentication));
    }

    private static UUID userId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
