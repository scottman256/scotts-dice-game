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
import static org.mockito.Mockito.times;
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
        when(userRepository.saveAndFlush(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authenticationService.loginWithFirebase("firebase-token");

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        UserAccount saved = userCaptor.getValue();
        assertThat(saved.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(saved.getExternalSubject()).isEqualTo("firebase-subject");
        assertThat(saved.getDisplayName()).isEqualTo("Ada Player");
        assertThat(saved.getEmail()).isEqualTo("ada@example.com");
        assertThat(saved.getNormalizedEmail()).isEqualTo("ada@example.com");
        verify(tokenService).issue(saved);
    }

    @Test
    void reusesTheLinkedUserAndRefreshesItsSocialProfile() {
        UserAccount existing = UserAccount.social(
                AuthProvider.FACEBOOK,
                "facebook-subject",
                "Old Name",
                "old@example.com",
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
        when(userRepository.saveAndFlush(existing)).thenReturn(existing);

        authenticationService.loginWithFirebase("firebase-token");

        verify(userRepository).saveAndFlush(existing);
        assertThat(existing.getDisplayName()).isEqualTo("Updated Name");
        assertThat(existing.getEmail()).isEqualTo("player@example.com");
        assertThat(existing.getPhotoUrl()).isEqualTo("https://example.com/player.png");
        verify(tokenService).issue(existing);
    }

    @Test
    void rejectsRegistrationWhenThePasswordsDoNotMatch() {
        RegisterRequest request = new RegisterRequest(
                "player",
                "player@example.com",
                "DiceGame!2026",
                "Different!2026"
        );

        assertApiError(() -> authenticationService.register(request), "PASSWORDS_DO_NOT_MATCH");
    }

    @Test
    void convertsAConcurrentRegistrationConflictIntoThePublicApiError() {
        RegisterRequest request = new RegisterRequest(
                "  Player  ",
                "player@example.com",
                "DiceGame!2026",
                "DiceGame!2026"
        );
        when(userRepository.existsByNormalizedUsername("player")).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-password");
        when(userRepository.saveAndFlush(any(UserAccount.class)))
                .thenThrow(new DataIntegrityViolationException("unique constraint"));

        assertApiError(() -> authenticationService.register(request), "ACCOUNT_ALREADY_EXISTS");
    }

    @Test
    void registersTrimmedEmailAndRejectsAnEmailUsedByAnotherAccount() {
        RegisterRequest request = new RegisterRequest(
                "Player",
                "  Player@Example.com  ",
                "DiceGame!2026",
                "DiceGame!2026"
        );
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-password");
        when(userRepository.saveAndFlush(any(UserAccount.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        authenticationService.register(request);

        ArgumentCaptor<UserAccount> captor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).existsByNormalizedEmail("player@example.com");
        verify(userRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("Player@Example.com");
        assertThat(captor.getValue().getNormalizedEmail()).isEqualTo("player@example.com");

        when(userRepository.existsByNormalizedEmail("player@example.com")).thenReturn(true);
        assertApiError(() -> authenticationService.register(request), "EMAIL_TAKEN");
    }

    @Test
    void rejectsAFirebaseEmailAlreadyUsedByAnotherAccount() {
        FirebaseIdentity identity = new FirebaseIdentity(
                AuthProvider.GOOGLE,
                "firebase-subject",
                "Ada Player",
                "ada@example.com",
                null
        );
        UserAccount manual = UserAccount.manual("ada", "ada", "ada@example.com", "hash");
        when(firebaseVerifier.verify("firebase-token")).thenReturn(identity);
        when(userRepository.findByAuthProviderAndExternalSubject(AuthProvider.GOOGLE, "firebase-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.findByNormalizedEmail("ada@example.com")).thenReturn(Optional.of(manual));

        assertApiError(() -> authenticationService.loginWithFirebase("firebase-token"), "EMAIL_TAKEN");
    }

    @Test
    void convertsAConcurrentFirebaseAccountConflictIntoThePublicApiError() {
        FirebaseIdentity identity = new FirebaseIdentity(
                AuthProvider.GOOGLE,
                "firebase-subject",
                "Ada Player",
                "ada@example.com",
                null
        );
        when(firebaseVerifier.verify("firebase-token")).thenReturn(identity);
        when(userRepository.findByAuthProviderAndExternalSubject(AuthProvider.GOOGLE, "firebase-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(UserAccount.class)))
                .thenThrow(new DataIntegrityViolationException("unique constraint"));

        assertApiError(
                () -> authenticationService.loginWithFirebase("firebase-token"),
                "ACCOUNT_ALREADY_EXISTS"
        );
    }

    @Test
    void returnsTheCurrentUserAndRejectsAMissingAccount() {
        UUID existingId = UUID.randomUUID();
        UserAccount existing = UserAccount.manual(
                "player",
                "player",
                "player@example.com",
                "encoded-password"
        );
        when(userRepository.findById(existingId)).thenReturn(Optional.of(existing));

        assertThat(authenticationService.getCurrentUser(existingId).name()).isEqualTo("player");
        assertThat(authenticationService.getCurrentUser(existingId).email()).isEqualTo("player@example.com");
        assertThat(authenticationService.getCurrentUser(existingId).providerLabel()).isEqualTo("Username");

        UUID missingId = UUID.randomUUID();
        when(userRepository.findById(missingId)).thenReturn(Optional.empty());
        assertApiError(() -> authenticationService.requireUser(missingId), "ACCOUNT_NOT_FOUND");
    }

    @Test
    void requiresAnAdministratorForAdministrativeOperations() {
        UUID userId = UUID.randomUUID();
        UserAccount user = UserAccount.manual(
                "player",
                "player",
                "player@example.com",
                "encoded-password"
        );
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertApiError(() -> authenticationService.requireAdmin(userId), "ADMIN_REQUIRED");
    }

    @Test
    void logsInWithEitherANormalizedUsernameOrEmailAddress() {
        UserAccount manual = UserAccount.manual(
                "DicePlayer",
                "diceplayer",
                "DicePlayer@Example.com",
                "encoded-password"
        );
        when(userRepository.findByNormalizedUsernameOrNormalizedEmail("diceplayer", "diceplayer"))
                .thenReturn(Optional.of(manual));
        when(userRepository.findByNormalizedUsernameOrNormalizedEmail(
                "diceplayer@example.com",
                "diceplayer@example.com"
        )).thenReturn(Optional.of(manual));
        when(passwordEncoder.matches("correct-password", "encoded-password")).thenReturn(true);

        authenticationService.login(new LoginRequest("  DicePlayer  ", "correct-password"));
        authenticationService.login(new LoginRequest("  DICEPLAYER@EXAMPLE.COM  ", "correct-password"));

        verify(tokenService, times(2)).issue(manual);
    }

    @Test
    void rejectsSocialAccountsAndBadPasswordsWithTheSameGenericLoginError() {
        UserAccount social = UserAccount.social(
                AuthProvider.GOOGLE,
                "google-subject",
                "Social Player",
                "social@example.com",
                null
        );
        UserAccount manual = UserAccount.manual(
                "player",
                "player",
                "player@example.com",
                "encoded-password"
        );
        when(userRepository.findByNormalizedUsernameOrNormalizedEmail(
                "social@example.com",
                "social@example.com"
        )).thenReturn(Optional.of(social));
        when(userRepository.findByNormalizedUsernameOrNormalizedEmail("player", "player"))
                .thenReturn(Optional.of(manual));

        assertApiError(
                () -> authenticationService.login(new LoginRequest("social@example.com", "password")),
                "INVALID_CREDENTIALS"
        );
        assertApiError(
                () -> authenticationService.login(new LoginRequest("player", "wrong-password")),
                "INVALID_CREDENTIALS"
        );
    }

    @Test
    void rejectsInvalidTokenSubjectsAndNullLoginIdentifiers() {
        assertApiError(() -> AuthenticationService.parseUserId("not-a-uuid"), "INVALID_TOKEN");

        when(userRepository.findByNormalizedUsernameOrNormalizedEmail("", ""))
                .thenReturn(Optional.empty());
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
