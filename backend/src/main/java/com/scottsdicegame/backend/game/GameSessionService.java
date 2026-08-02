package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.dto.GameSessionResponse;
import com.scottsdicegame.backend.game.dto.SavedGameRequest;
import com.scottsdicegame.backend.game.dto.SavedGameResponse;
import com.scottsdicegame.backend.game.dto.ThemePreferenceRequest;
import com.scottsdicegame.backend.game.dto.ThemePreferenceResponse;
import com.scottsdicegame.backend.user.UserAccount;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class GameSessionService {

    private final SavedGameRepository savedGameRepository;
    private final UserGamePreferencesRepository preferencesRepository;
    private final AuthenticationService authenticationService;

    public GameSessionService(
            SavedGameRepository savedGameRepository,
            UserGamePreferencesRepository preferencesRepository,
            AuthenticationService authenticationService
    ) {
        this.savedGameRepository = savedGameRepository;
        this.preferencesRepository = preferencesRepository;
        this.authenticationService = authenticationService;
    }

    @Transactional(readOnly = true)
    public GameSessionResponse getSession(UUID userId) {
        authenticationService.requireUser(userId);
        String theme = preferencesRepository.findById(userId)
                .map(UserGamePreferences::getTheme)
                .orElse(GameCatalog.DEFAULT_THEME);
        SavedGameResponse savedGame = savedGameRepository.findByUserId(userId)
                .map(SavedGameResponse::from)
                .orElse(null);
        return new GameSessionResponse(theme, savedGame);
    }

    @Transactional
    public ThemePreferenceResponse saveTheme(UUID userId, ThemePreferenceRequest request) {
        validateTheme(request.theme());
        UserAccount user = authenticationService.requireUser(userId);
        UserGamePreferences preferences = preferencesRepository.findById(userId)
                .orElseGet(() -> new UserGamePreferences(user, request.theme()));
        preferences.setTheme(request.theme());
        preferencesRepository.save(preferences);
        return new ThemePreferenceResponse(preferences.getTheme());
    }

    @Transactional
    public SavedGameResponse saveGame(UUID userId, SavedGameRequest request) {
        validateGameState(request);
        UserAccount user = authenticationService.requireUser(userId);
        SavedGame savedGame = savedGameRepository.findByUserId(userId)
                .map(existing -> {
                    existing.update(request);
                    return existing;
                })
                .orElseGet(() -> new SavedGame(user, request));
        return SavedGameResponse.from(savedGameRepository.saveAndFlush(savedGame));
    }

    @Transactional
    public void deleteGame(UUID userId) {
        authenticationService.requireUser(userId);
        savedGameRepository.deleteByUserId(userId);
    }

    private static void validateTheme(String theme) {
        if (!GameCatalog.isSupportedTheme(theme)) {
            throw invalidState("The selected game theme is not supported.");
        }
    }

    private static void validateGameState(SavedGameRequest request) {
        if (!GameCatalog.STATUS_TONES.contains(request.statusTone())) {
            throw invalidState("The game status tone is invalid.");
        }
        if (!GameCatalog.containsOnlyScoreCategories(request.scores().keySet())) {
            throw invalidState("The saved game contains an unknown score category.");
        }

        boolean hasRolled = request.rollCount() > 0;
        for (int index = 0; index < request.dice().size(); index++) {
            Integer face = request.dice().get(index);
            if (hasRolled && face == null) {
                throw invalidState("All dice need a face after a roll.");
            }
            if (!hasRolled && face != null) {
                throw invalidState("Dice must be cleared between turns.");
            }
            if (face == null && request.heldDice().get(index)) {
                throw invalidState("An empty die cannot be held.");
            }
        }
        if (request.rollCount() == 4 && request.extraRollsUsed() == 0) {
            throw invalidState("A fourth roll must consume an extra-roll chance.");
        }
    }

    private static ApiException invalidState(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GAME_STATE", message);
    }
}
