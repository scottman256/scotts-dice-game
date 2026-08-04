package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.game.ThemeAvailabilityService;
import com.scottsdicegame.backend.game.dto.ThemeAvailabilityResponse;
import com.scottsdicegame.backend.game.dto.ThemeAvailabilityUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/themes")
public class AdminThemeController {

    private final ThemeAvailabilityService themeAvailabilityService;
    private final AuthenticationService authenticationService;

    public AdminThemeController(
            ThemeAvailabilityService themeAvailabilityService,
            AuthenticationService authenticationService
    ) {
        this.themeAvailabilityService = themeAvailabilityService;
        this.authenticationService = authenticationService;
    }

    @GetMapping
    ThemeAvailabilityResponse getThemes(Authentication authentication) {
        authenticationService.requireAdmin(AuthenticationService.parseUserId(authentication.getName()));
        return themeAvailabilityService.getSettings();
    }

    @PutMapping("/{themeId}")
    ThemeAvailabilityResponse updateTheme(
            Authentication authentication,
            @PathVariable String themeId,
            @Valid @RequestBody ThemeAvailabilityUpdateRequest request
    ) {
        authenticationService.requireAdmin(AuthenticationService.parseUserId(authentication.getName()));
        return themeAvailabilityService.update(themeId, request.enabled());
    }
}
