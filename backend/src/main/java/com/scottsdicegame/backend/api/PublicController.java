package com.scottsdicegame.backend.api;

import com.scottsdicegame.backend.auth.FirebaseIdentityVerifier;
import com.scottsdicegame.backend.game.ThemeAvailabilityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final FirebaseIdentityVerifier firebaseVerifier;
    private final ThemeAvailabilityService themeAvailabilityService;

    public PublicController(
            FirebaseIdentityVerifier firebaseVerifier,
            ThemeAvailabilityService themeAvailabilityService
    ) {
        this.firebaseVerifier = firebaseVerifier;
        this.themeAvailabilityService = themeAvailabilityService;
    }

    @GetMapping("/status")
    ServiceStatus status() {
        return new ServiceStatus(
                "UP",
                true,
                firebaseVerifier.isConfigured(),
                themeAvailabilityService.enabledThemeIds()
        );
    }

    public record ServiceStatus(
            String status,
            boolean manualAuthEnabled,
            boolean socialAuthEnabled,
            List<String> enabledThemes
    ) {
    }
}
