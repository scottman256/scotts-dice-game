package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.dto.GameSessionResponse;
import com.scottsdicegame.backend.game.dto.SavedGameRequest;
import com.scottsdicegame.backend.game.dto.SavedGameResponse;
import com.scottsdicegame.backend.game.dto.ThemePreferenceRequest;
import com.scottsdicegame.backend.user.UserAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class GameSessionServiceTest {

    @Mock
    private SavedGameRepository savedGameRepository;

    @Mock
    private UserGamePreferencesRepository preferencesRepository;

    @Mock
    private AuthenticationService authenticationService;

    @Mock
    private ThemeAvailabilityService themeAvailabilityService;

    private GameSessionService service;
    private UUID userId;
    private UserAccount user;

    @BeforeEach
    void setUp() {
        service = new GameSessionService(
                savedGameRepository,
                preferencesRepository,
                authenticationService,
                themeAvailabilityService
        );
        lenient().when(themeAvailabilityService.isEnabled(any())).thenReturn(true);
        userId = UUID.randomUUID();
        user = UserAccount.manual("player", "player", "encoded-password");
    }

    @Test
    void returnsClassicAndNoGameWhenTheUserHasNoPersistenceRows() {
        when(authenticationService.requireUser(userId)).thenReturn(user);
        when(preferencesRepository.findById(userId)).thenReturn(Optional.empty());
        when(savedGameRepository.findByUserId(userId)).thenReturn(Optional.empty());

        GameSessionResponse response = service.getSession(userId);

        assertThat(response.theme()).isEqualTo("classic");
        assertThat(response.savedGame()).isNull();
    }

    @Test
    void savesAValidatedGameSnapshotWithAllDiceHoldsAndScores() {
        SavedGameRequest request = validRequest();
        when(authenticationService.requireUser(userId)).thenReturn(user);
        when(savedGameRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(savedGameRepository.saveAndFlush(any(SavedGame.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SavedGameResponse response = service.saveGame(userId, request);

        assertThat(response.gameId()).isEqualTo(request.gameId());
        assertThat(response.dice()).containsExactly(6, 6, 3, 2, 1);
        assertThat(response.heldDice()).containsExactly(true, true, false, false, false);
        assertThat(response.scores()).containsEntry("ones", 2);
        verify(savedGameRepository).saveAndFlush(any(SavedGame.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"candy-kingdom", "frozen-crystal"})
    void savesEachNewThemeAsAUserPreference(String theme) {
        when(authenticationService.requireUser(userId)).thenReturn(user);
        when(preferencesRepository.findById(userId)).thenReturn(Optional.empty());

        var response = service.saveTheme(userId, new ThemePreferenceRequest(theme));

        assertThat(response.theme()).isEqualTo(theme);
        verify(preferencesRepository).save(any(UserGamePreferences.class));
    }

    @Test
    void rejectsUnsupportedThemesAndUnknownScoreCategories() {
        assertThatThrownBy(() -> service.saveTheme(userId, new ThemePreferenceRequest("plain-purple")))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo("INVALID_GAME_STATE");

        Map<String, Integer> invalidScores = new LinkedHashMap<>(validRequest().scores());
        invalidScores.put("madeUpCategory", 50);
        SavedGameRequest invalidGame = new SavedGameRequest(
                UUID.randomUUID(),
                List.of(1, 2, 3, 4, 5),
                List.of(false, false, false, false, false),
                1,
                invalidScores,
                0,
                "Roll 1 of 3.",
                "normal"
        );

        assertThatThrownBy(() -> service.saveGame(userId, invalidGame))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo("INVALID_GAME_STATE");
    }

    private static SavedGameRequest validRequest() {
        return new SavedGameRequest(
                UUID.randomUUID(),
                List.of(6, 6, 3, 2, 1),
                List.of(true, true, false, false, false),
                2,
                Map.of("ones", 2),
                1,
                "Roll 2 of 3. Hold dice or cash in.",
                "normal"
        );
    }
}
