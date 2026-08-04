package com.scottsdicegame.backend.game;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.game.dto.ThemeAvailabilityResponse;
import com.scottsdicegame.backend.game.dto.ThemeSettingResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ThemeAvailabilityService {

    private final GameThemeSettingRepository themeRepository;
    private final UserGamePreferencesRepository preferencesRepository;

    public ThemeAvailabilityService(
            GameThemeSettingRepository themeRepository,
            UserGamePreferencesRepository preferencesRepository
    ) {
        this.themeRepository = themeRepository;
        this.preferencesRepository = preferencesRepository;
    }

    @Transactional(readOnly = true)
    public List<String> enabledThemeIds() {
        Map<String, GameThemeSetting> settings = settingsById();
        return GameCatalog.THEME_IDS.stream()
                .filter(themeId -> settings.get(themeId).isEnabled())
                .toList();
    }

    @Transactional(readOnly = true)
    public ThemeAvailabilityResponse getSettings() {
        Map<String, GameThemeSetting> settings = settingsById();
        return new ThemeAvailabilityResponse(GameCatalog.THEME_IDS.stream()
                .map(themeId -> new ThemeSettingResponse(themeId, settings.get(themeId).isEnabled()))
                .toList());
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(String themeId) {
        return GameCatalog.isSupportedTheme(themeId)
                && themeRepository.findById(themeId).map(GameThemeSetting::isEnabled).orElse(false);
    }

    @Transactional
    public ThemeAvailabilityResponse update(String themeId, boolean enabled) {
        if (!GameCatalog.isSupportedTheme(themeId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "THEME_NOT_FOUND", "That game theme does not exist.");
        }
        if (GameCatalog.DEFAULT_THEME.equals(themeId) && !enabled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CLASSIC_THEME_REQUIRED", "Classic mode cannot be disabled.");
        }

        GameThemeSetting setting = themeRepository.findById(themeId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.CONFLICT,
                        "THEME_CONFIGURATION_MISSING",
                        "The game theme configuration is incomplete."
                ));
        setting.setEnabled(enabled);
        themeRepository.save(setting);
        if (!enabled) {
            preferencesRepository.resetThemeToClassic(themeId, GameCatalog.DEFAULT_THEME);
        }
        return getSettings();
    }

    private Map<String, GameThemeSetting> settingsById() {
        Map<String, GameThemeSetting> settings = themeRepository.findAll().stream()
                .collect(Collectors.toMap(GameThemeSetting::getThemeId, Function.identity()));
        if (!settings.keySet().containsAll(GameCatalog.THEME_IDS)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "THEME_CONFIGURATION_MISSING",
                    "The game theme configuration is incomplete."
            );
        }
        return settings;
    }
}
