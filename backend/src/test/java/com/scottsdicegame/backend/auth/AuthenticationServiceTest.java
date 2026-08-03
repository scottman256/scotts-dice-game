package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.dto.LoginRequest;
import com.scottsdicegame.backend.auth.dto.RegisterRequest;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthenticationServiceTest {

    private UserAccountRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordPolicy passwordPolicy;
    private TokenService tokenService;
    private FirebaseIdentityVerifier firebaseVerifier;
    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        passwordPolicy = mock(PasswordPolicy.class);
        tokenService = mock(TokenService.class);
        firebaseVerifier = mock(FirebaseIdentityVerifier.class);
        authenticationService = new AuthenticationService(
                userRepository,
                passwordEncoder,
                passwordPolicy,
                tokenService,
                firebaseVerifier
        );
    }

    @Test
    void createsAndLinksAUserOnTheFirstFirebaseLogin() {
        FirebaseIdentity identity = new FirebaseIdentity(
                AuthProvider.GOOGLE,
                "firebase-subject",
                "Ada Player",
                "ada@example.com",
                "https://example.com/ada.png"
        );
        when(firebaseVerifier.verify("firebase-token")).thenReturn(identity);
        when(userRepository.findByAuthProviderAndExternalSubject(AuthProvider.GOOGLE, "firebase-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authenticationService.loginWithFirebase("firebase-token");

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount saved = userCaptor.getValue();
        assertThat(saved.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(saved.getExternalSubject()).isEqualTo("firebase-subject");
        assertThat(saved.getDisplayName()).isEqualTo("Ada Player");
        verify(tokenService).issue(saved);
    }

    @Test
    void reusesTheLinkedUserAndRefreshesItsSocialProfile() {
        UserAccount existing = UserAccount.social(
                AuthProvider.FACEBOOK,
                "facebook-subject",
                "Old Name",
                null,
                null
        );
        FirebaseIdentity identity = new FirebaseIdentity(
                AuthProvider.FACEBOOK,
                "facebook-subject",
                "Updated Name",
                "player@example.com",
                "https://example.com/player.png"
        );
        when(firebaseVerifier.verify("firebase-token")).thenReturn(identity);
        when(userRepository.findByAuthProviderAndExternalSubject(AuthProvider.FACEBOOK, "facebook-subject"))
                .thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        authenticationService.loginWithFirebase("firebase-token");

        verify(userRepository).save(existing);
        assertThat(existing.getDisplayName()).isEqualTo("Updated Name");
        assertThat(existing.getEmail()).isEqualTo("player@example.com");
        assertThat(existing.getPhotoUrl()).isEqualTo("https://example.com/player.png");
        verify(tokenService).issue(existing);
    }

    @Test
    void rejectsRegistrationWhenThePasswordsDoNotMatch() {
        RegisterRequest request = new RegisterRequest(
                "player",
                "DiceGame!2026",
                "Different!2026"
        );

        assertApiError(() -> authenticationService.register(request), "PASSWORDS_DO_NOT_MATCH");
    }

    @Test
    void convertsAConcurrentUsernameConflictIntoThePublicApiError() {
        RegisterRequest request = new RegisterRequest(
                "  Player  ",
                "DiceGame!2026",
                "DiceGame!2026"
        );
        when(userRepository.existsByNormalizedUsername("player")).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-password");
        when(userRepository.saveAndFlush(any(UserAccount.class)))
                .thenThrow(new DataIntegrityViolationException("unique constraint"));

        assertApiError(() -> authenticationService.register(request), "USERNAME_TAKEN");
    }

    @Test
    void returnsTheCurrentUserAndRejectsAMissingAccount() {
        UUID existingId = UUID.randomUUID();
        UserAccount existing = UserAccount.manual("player", "player", "encoded-password");
        when(userRepository.findById(existingId)).thenReturn(Optional.of(existing));

        assertThat(authenticationService.getCurrentUser(existingId).name()).isEqualTo("player");
        assertThat(authenticationService.getCurrentUser(existingId).providerLabel()).isEqualTo("Username");

        UUID missingId = UUID.randomUUID();
        when(userRepository.findById(missingId)).thenReturn(Optional.empty());
        assertApiError(() -> authenticationService.requireUser(missingId), "ACCOUNT_NOT_FOUND");
    }

    @Test
    void rejectsInvalidTokenSubjectsAndNullLoginUsernames() {
        assertApiError(() -> AuthenticationService.parseUserId("not-a-uuid"), "INVALID_TOKEN");

        when(userRepository.findByNormalizedUsername("")).thenReturn(Optional.empty());
        assertApiError(
                () -> authenticationService.login(new LoginRequest(null, "password")),
                "INVALID_CREDENTIALS"
        );
    }

    private static void assertApiError(ThrowingOperation operation, String expectedCode) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo(expectedCode);
    }

    @FunctionalInterface
    private interface ThrowingOperation {
        void run();
    }
}
