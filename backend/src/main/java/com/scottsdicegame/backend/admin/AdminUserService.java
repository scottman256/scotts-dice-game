package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.admin.dto.AdminEmailChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminPasswordChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminUserResponse;
import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.auth.AuthenticationService;
import com.scottsdicegame.backend.auth.PasswordPolicy;
import com.scottsdicegame.backend.user.AuthProvider;
import com.scottsdicegame.backend.user.EmailAddress;
import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AdminUserService {

    private final UserAccountRepository userRepository;
    private final AuthenticationService authenticationService;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(
            UserAccountRepository userRepository,
            AuthenticationService authenticationService,
            PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.authenticationService = authenticationService;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(UUID adminId) {
        authenticationService.requireAdmin(adminId);
        return userRepository.findByAuthProviderNotOrderByCreatedAtAsc(AuthProvider.SYSTEM).stream()
                .map(user -> AdminUserResponse.from(user, adminId))
                .toList();
    }

    @Transactional
    public void deleteUser(UUID adminId, UUID userId) {
        authenticationService.requireAdmin(adminId);
        if (adminId.equals(userId)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "ADMIN_SELF_DELETE",
                    "You cannot delete the administrator account you are currently using."
            );
        }
        UserAccount user = findManagedUser(userId);
        userRepository.delete(user);
    }

    @Transactional
    public void changePassword(UUID adminId, UUID userId, AdminPasswordChangeRequest request) {
        authenticationService.requireAdmin(adminId);
        UserAccount user = findManagedUser(userId);
        if (user.getAuthProvider() != AuthProvider.MANUAL) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PASSWORD_NOT_MANAGED",
                    "Google and Facebook passwords are managed by their identity provider."
            );
        }
        if (!request.password().equals(request.passwordConfirmation())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORDS_DO_NOT_MATCH", "The two passwords do not match.");
        }
        passwordPolicy.validate(request.password());
        user.changePasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
    }

    @Transactional
    public void changeEmail(UUID adminId, UUID userId, AdminEmailChangeRequest request) {
        authenticationService.requireAdmin(adminId);
        UserAccount user = findManagedUser(userId);
        if (user.getAuthProvider() != AuthProvider.MANUAL) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "EMAIL_NOT_MANAGED",
                    "Google and Facebook email addresses are managed by their identity provider."
            );
        }
        if (!EmailAddress.isValid(request.email())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EMAIL", "Enter a valid email address.");
        }
        String normalizedEmail = EmailAddress.normalize(request.email());
        userRepository.findByNormalizedEmail(normalizedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw emailTaken();
                });

        user.changeEmail(request.email());
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw emailTaken();
        }
    }

    private UserAccount findManagedUser(UUID userId) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "That user account does not exist."));
        if (user.getAuthProvider() == AuthProvider.SYSTEM) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "That user account does not exist.");
        }
        return user;
    }

    private static ApiException emailTaken() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "EMAIL_TAKEN",
                "An account already exists for that email address."
        );
    }
}
