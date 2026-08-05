package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.api.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ThemeAvailabilityServiceTest {

    private GameThemeSettingRepository themeRepository;
    private UserGamePreferencesRepository preferencesRepository;
    private ThemeAvailabilityService service;

    @BeforeEach
    void setUp() {
        themeRepository = mock(GameThemeSettingRepository.class);
        preferencesRepository = mock(UserGamePreferencesRepository.class);
        service = new ThemeAvailabilityService(themeRepository, preferencesRepository);
    }

    @Test
    void returnsEnabledThemesInGameCatalogOrder() {
        List<GameThemeSetting> settings = GameCatalog.THEME_IDS.stream()
                .map(id -> new GameThemeSetting(id, !id.equals("fire")))
                .toList();
        when(themeRepository.findAll()).thenReturn(settings);

        assertThat(service.enabledThemeIds())
                .startsWith("classic", "rainbow")
                .doesNotContain("fire")
                .contains("frozen-crystal", "deep-sea", "jungle-adventure");
        assertThat(service.getSettings().themes()).hasSize(GameCatalog.THEME_IDS.size());
    }

    @Test
    void disablingAThemeResetsExistingPreferencesToClassic() {
        GameThemeSetting fire = new GameThemeSetting("fire", true);
        when(themeRepository.findById("fire")).thenReturn(Optional.of(fire));
        when(themeRepository.findAll()).thenReturn(GameCatalog.THEME_IDS.stream()
                .map(id -> id.equals("fire") ? fire : new GameThemeSetting(id, true))
                .toList());

        var response = service.update("fire", false);

        assertThat(fire.isEnabled()).isFalse();
        assertThat(response.themes()).contains(new com.scottsdicegame.backend.game.dto.ThemeSettingResponse("fire", false));
        verify(themeRepository).save(fire);
        verify(preferencesRepository).resetThemeToClassic("fire", "classic");
    }

    @Test
    void protectsClassicAndRejectsUnknownOrIncompleteConfiguration() {
        assertCode(() -> service.update("classic", false), "CLASSIC_THEME_REQUIRED");
        assertCode(() -> service.update("missing", true), "THEME_NOT_FOUND");

        when(themeRepository.findAll()).thenReturn(List.of(new GameThemeSetting("classic", true)));
        assertCode(service::getSettings, "THEME_CONFIGURATION_MISSING");
        assertThat(service.isEnabled("missing")).isFalse();
    }

    private static void assertCode(Runnable operation, String code) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo(code);
    }
}
