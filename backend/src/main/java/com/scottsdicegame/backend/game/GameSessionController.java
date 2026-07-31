package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.dto.GameSessionResponse;
import com.scottsdicegame.backend.game.dto.SavedGameRequest;
import com.scottsdicegame.backend.game.dto.SavedGameResponse;
import com.scottsdicegame.backend.game.dto.ThemePreferenceRequest;
import com.scottsdicegame.backend.game.dto.ThemePreferenceResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/game-session")
public class GameSessionController {

    private final GameSessionService gameSessionService;

    public GameSessionController(GameSessionService gameSessionService) {
        this.gameSessionService = gameSessionService;
    }

    @GetMapping
    GameSessionResponse getSession(Authentication authentication) {
        return gameSessionService.getSession(userId(authentication));
    }

    @PutMapping("/theme")
    ThemePreferenceResponse saveTheme(
            Authentication authentication,
            @Valid @RequestBody ThemePreferenceRequest request
    ) {
        return gameSessionService.saveTheme(userId(authentication), request);
    }

    @PutMapping("/game")
    SavedGameResponse saveGame(
            Authentication authentication,
            @Valid @RequestBody SavedGameRequest request
    ) {
        return gameSessionService.saveGame(userId(authentication), request);
    }

    @DeleteMapping("/game")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteGame(Authentication authentication) {
        gameSessionService.deleteGame(userId(authentication));
    }

    private static UUID userId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
