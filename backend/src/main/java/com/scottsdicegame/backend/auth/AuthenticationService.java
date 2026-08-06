package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.dto.AuthResponse;
import com.scottsdicegame.backend.auth.dto.LoginRequest;
import com.scottsdicegame.backend.auth.dto.RegisterRequest;
import com.scottsdicegame.backend.auth.dto.UserResponse;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.EmailAddress;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class AuthenticationService {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TokenService tokenService;
    private final FirebaseIdentityVerifier firebaseVerifier;

    public AuthenticationService(
            UserAccountRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            TokenService tokenService,
            FirebaseIdentityVerifier firebaseVerifier
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.tokenService = tokenService;
        this.firebaseVerifier = firebaseVerifier;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String normalizedUsername = normalizeUsername(username);
        String email = EmailAddress.clean(request.email());
        String normalizedEmail = EmailAddress.normalize(email);
        if (!request.password().equals(request.passwordConfirmation())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PASSWORDS_DO_NOT_MATCH",
                    "The two passwords do not match."
            );
        }
        passwordPolicy.validate(request.password());
        if (userRepository.existsByNormalizedUsername(normalizedUsername)) {
            throw usernameTaken();
        }
        if (userRepository.existsByNormalizedEmail(normalizedEmail)) {
            throw emailTaken();
        }

        UserAccount user = UserAccount.manual(
                username,
                normalizedUsername,
                email,
                passwordEncoder.encode(request.password())
        );
        try {
            return tokenService.issue(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw accountAlreadyExists();
        }
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedIdentifier = normalizeUsername(request.identifier());
        UserAccount user = userRepository.findByNormalizedUsernameOrNormalizedEmail(
                        normalizedIdentifier,
                        normalizedIdentifier
                )
                .filter(candidate -> candidate.getAuthProvider() == AuthProvider.MANUAL)
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(AuthenticationService::invalidCredentials);
        return tokenService.issue(user);
    }

    @Transactional
    public AuthResponse loginWithFirebase(String idToken) {
        FirebaseIdentity identity = firebaseVerifier.verify(idToken);
        String normalizedEmail = EmailAddress.normalize(identity.email());
        UserAccount user = userRepository
                .findByAuthProviderAndExternalSubject(identity.provider(), identity.subject())
                .map(existing -> {
                    requireAvailableEmail(normalizedEmail, existing);
                    existing.updateSocialProfile(identity.displayName(), identity.email(), identity.photoUrl());
                    return existing;
                })
                .orElseGet(() -> {
                    requireAvailableEmail(normalizedEmail, null);
                    return UserAccount.social(
                            identity.provider(),
                            identity.subject(),
                            identity.displayName(),
                            identity.email(),
                            identity.photoUrl()
                    );
                });
        try {
            return tokenService.issue(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw accountAlreadyExists();
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return UserResponse.from(requireUser(userId));
    }

    @Transactional(readOnly = true)
    public UserAccount requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "ACCOUNT_NOT_FOUND",
                        "The signed-in account no longer exists."
                ));
    }

    @Transactional(readOnly = true)
    public UserAccount requireAdmin(UUID userId) {
        UserAccount user = requireUser(userId);
        if (!user.isAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Administrator access is required.");
        }
        return user;
    }

    public static UUID parseUserId(String subject) {
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "The access token is invalid.");
        }
    }

    private static String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException usernameTaken() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "USERNAME_TAKEN",
                "That username is already taken. Please choose another one."
        );
    }

    private void requireAvailableEmail(String normalizedEmail, UserAccount currentUser) {
        userRepository.findByNormalizedEmail(normalizedEmail)
                .filter(existing -> existing != currentUser)
                .filter(existing -> currentUser == null
                        || existing.getId() == null
                        || !existing.getId().equals(currentUser.getId()))
                .ifPresent(existing -> {
                    throw emailTaken();
                });
    }

    private static ApiException emailTaken() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "EMAIL_TAKEN",
                "An account already exists for that email address."
        );
    }

    private static ApiException accountAlreadyExists() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "ACCOUNT_ALREADY_EXISTS",
                "An account already exists for that username or email address."
        );
    }

    private static ApiException invalidCredentials() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "The username, email address, or password is incorrect."
        );
    }
}
