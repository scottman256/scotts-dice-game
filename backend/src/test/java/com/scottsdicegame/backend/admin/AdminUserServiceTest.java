package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.admin.dto.AdminPasswordChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminEmailChangeRequest;
import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.auth.PasswordPolicy;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminUserServiceTest {

    private UserAccountRepository userRepository;
    private AuthenticationService authenticationService;
    private PasswordPolicy passwordPolicy;
    private PasswordEncoder passwordEncoder;
    private AdminUserService service;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        authenticationService = mock(AuthenticationService.class);
        passwordPolicy = mock(PasswordPolicy.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new AdminUserService(userRepository, authenticationService, passwordPolicy, passwordEncoder);
        adminId = UUID.randomUUID();
    }

    @Test
    void listsRealUsersWithProviderSpecificCapabilities() {
        UserAccount manual = user(UUID.randomUUID(), "Player", AuthProvider.MANUAL, false);
        UserAccount social = user(UUID.randomUUID(), "Social", AuthProvider.GOOGLE, false);
        when(userRepository.findByAuthProviderNotOrderByCreatedAtAsc(AuthProvider.SYSTEM))
                .thenReturn(List.of(manual, social));

        var users = service.listUsers(adminId);

        assertThat(users).hasSize(2);
        assertThat(users.get(0).canChangePassword()).isTrue();
        assertThat(users.get(0).canChangeEmail()).isTrue();
        assertThat(users.get(1).canChangePassword()).isFalse();
        assertThat(users.get(1).canChangeEmail()).isFalse();
        verify(authenticationService).requireAdmin(adminId);
    }

    @Test
    void changesAManualPasswordAfterValidation() {
        UUID userId = UUID.randomUUID();
        UserAccount manual = UserAccount.manual("player", "player", "player@example.com", "old-hash");
        when(userRepository.findById(userId)).thenReturn(Optional.of(manual));
        when(passwordEncoder.encode("BetterPassword!2026")).thenReturn("new-hash");

        service.changePassword(adminId, userId, new AdminPasswordChangeRequest(
                "BetterPassword!2026",
                "BetterPassword!2026"
        ));

        verify(passwordPolicy).validate("BetterPassword!2026");
        verify(userRepository).save(manual);
        assertThat(manual.getPasswordHash()).isEqualTo("new-hash");
    }

    @Test
    void rejectsSocialPasswordsMismatchesAndSelfDeletion() {
        UUID socialId = UUID.randomUUID();
        UserAccount social = UserAccount.social(
                AuthProvider.FACEBOOK,
                "subject",
                "Social",
                "social@example.com",
                null
        );
        when(userRepository.findById(socialId)).thenReturn(Optional.of(social));
        assertCode(() -> service.changePassword(adminId, socialId, new AdminPasswordChangeRequest("Password!2026", "Password!2026")), "PASSWORD_NOT_MANAGED");

        UUID manualId = UUID.randomUUID();
        when(userRepository.findById(manualId)).thenReturn(Optional.of(
                UserAccount.manual("player", "player", "player@example.com", "hash")
        ));
        assertCode(() -> service.changePassword(adminId, manualId, new AdminPasswordChangeRequest("Password!2026", "Different!2026")), "PASSWORDS_DO_NOT_MATCH");
        assertCode(() -> service.deleteUser(adminId, adminId), "ADMIN_SELF_DELETE");
        verify(userRepository, never()).delete(social);
    }

    @Test
    void deletesAnotherUserAndHidesSystemAccounts() {
        UUID userId = UUID.randomUUID();
        UserAccount user = UserAccount.manual("player", "player", "player@example.com", "hash");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        service.deleteUser(adminId, userId);
        verify(userRepository).delete(user);

        UUID systemId = UUID.randomUUID();
        when(userRepository.findById(systemId)).thenReturn(Optional.of(UserAccount.system("key", "System")));
        assertCode(() -> service.deleteUser(adminId, systemId), "USER_NOT_FOUND");
    }

    @Test
    void changesAManualEmailAndEnforcesCaseInsensitiveUniqueness() {
        UUID userId = UUID.randomUUID();
        UserAccount manual = UserAccount.manual("player", "player", "old@example.com", "hash");
        ReflectionTestUtils.setField(manual, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(manual));

        service.changeEmail(adminId, userId, new AdminEmailChangeRequest(" Player@Example.COM "));

        assertThat(manual.getEmail()).isEqualTo("Player@Example.COM");
        assertThat(manual.getNormalizedEmail()).isEqualTo("player@example.com");
        verify(userRepository).saveAndFlush(manual);

        UserAccount other = UserAccount.manual("other", "other", "taken@example.com", "hash");
        ReflectionTestUtils.setField(other, "id", UUID.randomUUID());
        when(userRepository.findByNormalizedEmail("taken@example.com")).thenReturn(Optional.of(other));
        assertCode(
                () -> service.changeEmail(adminId, userId, new AdminEmailChangeRequest("TAKEN@example.com")),
                "EMAIL_TAKEN"
        );
    }

    @Test
    void rejectsInvalidAndProviderManagedEmailChanges() {
        UUID manualId = UUID.randomUUID();
        UserAccount manual = UserAccount.manual("player", "player", "player@example.com", "hash");
        when(userRepository.findById(manualId)).thenReturn(Optional.of(manual));
        assertCode(
                () -> service.changeEmail(adminId, manualId, new AdminEmailChangeRequest("invalid")),
                "INVALID_EMAIL"
        );

        UUID socialId = UUID.randomUUID();
        UserAccount social = UserAccount.social(
                AuthProvider.GOOGLE,
                "subject",
                "Social",
                "social@example.com",
                null
        );
        when(userRepository.findById(socialId)).thenReturn(Optional.of(social));
        assertCode(
                () -> service.changeEmail(adminId, socialId, new AdminEmailChangeRequest("new@example.com")),
                "EMAIL_NOT_MANAGED"
        );
    }

    private static UserAccount user(UUID id, String name, AuthProvider provider, boolean admin) {
        UserAccount user = mock(UserAccount.class);
        when(user.getId()).thenReturn(id);
        when(user.getDisplayName()).thenReturn(name);
        when(user.getUsername()).thenReturn(provider == AuthProvider.MANUAL ? name.toLowerCase() : null);
        when(user.getEmail()).thenReturn(name.toLowerCase() + "@example.com");
        when(user.getAuthProvider()).thenReturn(provider);
        when(user.isAdmin()).thenReturn(admin);
        when(user.getCreatedAt()).thenReturn(Instant.parse("2026-08-03T12:00:00Z"));
        return user;
    }

    private static void assertCode(Runnable operation, String code) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo(code);
    }
}
