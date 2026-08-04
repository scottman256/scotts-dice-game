package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.admin.dto.AdminGameDataResetResponse;
import com.scottsdicegame.backend.admin.dto.AdminSystemScoreRequest;
import com.scottsdicegame.backend.admin.dto.AdminSystemScoreResponse;
import com.scottsdicegame.backend.auth.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminGameDataController {

    private final AdminGameDataService adminGameDataService;

    public AdminGameDataController(AdminGameDataService adminGameDataService) {
        this.adminGameDataService = adminGameDataService;
    }

    @PostMapping("/scores")
    @ResponseStatus(HttpStatus.CREATED)
    AdminSystemScoreResponse addSystemScore(
            Authentication authentication,
            @Valid @RequestBody AdminSystemScoreRequest request
    ) {
        return adminGameDataService.addSystemScore(adminId(authentication), request);
    }

    @DeleteMapping("/scores/{scoreId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteScore(Authentication authentication, @PathVariable UUID scoreId) {
        adminGameDataService.deleteScore(adminId(authentication), scoreId);
    }

    @PostMapping("/game-data/reset")
    AdminGameDataResetResponse resetGameData(Authentication authentication) {
        return adminGameDataService.resetGameData(adminId(authentication));
    }

    private static UUID adminId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
