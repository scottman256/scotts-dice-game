package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthenticationServiceTest {

    private UserAccountRepository userRepository;
    private TokenService tokenService;
    private FirebaseIdentityVerifier firebaseVerifier;
    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        tokenService = mock(TokenService.class);
        firebaseVerifier = mock(FirebaseIdentityVerifier.class);
        authenticationService = new AuthenticationService(
                userRepository,
                mock(PasswordEncoder.class),
                mock(PasswordPolicy.class),
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
}
