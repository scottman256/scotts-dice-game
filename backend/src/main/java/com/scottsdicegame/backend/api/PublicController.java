package com.scottsdicegame.backend.api;

import com.scottsdicegame.backend.auth.FirebaseIdentityVerifier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final FirebaseIdentityVerifier firebaseVerifier;

    public PublicController(FirebaseIdentityVerifier firebaseVerifier) {
        this.firebaseVerifier = firebaseVerifier;
    }

    @GetMapping("/status")
    ServiceStatus status() {
        return new ServiceStatus("UP", true, firebaseVerifier.isConfigured());
    }

    public record ServiceStatus(String status, boolean manualAuthEnabled, boolean socialAuthEnabled) {
    }
}
