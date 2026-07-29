package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.auth.dto.AuthResponse;
import com.scottsdicegame.backend.auth.dto.FirebaseLoginRequest;
import com.scottsdicegame.backend.auth.dto.LoginRequest;
import com.scottsdicegame.backend.auth.dto.RegisterRequest;
import com.scottsdicegame.backend.auth.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationService authenticationService;

    public AuthController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authenticationService.register(request);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authenticationService.login(request);
    }

    @PostMapping("/firebase")
    AuthResponse loginWithFirebase(@Valid @RequestBody FirebaseLoginRequest request) {
        return authenticationService.loginWithFirebase(request.idToken());
    }

    @GetMapping("/me")
    UserResponse currentUser(Authentication authentication) {
        return authenticationService.getCurrentUser(AuthenticationService.parseUserId(authentication.getName()));
    }
}
