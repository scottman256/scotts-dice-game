package com.scottsdicegame.backend.admin.service;

import com.scottsdicegame.backend.admin.dto.AdminEmailChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminPasswordChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminUserResponse;
import com.scottsdicegame.backend.admin.dto.AdminRoleChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminScoreHistoryResponse;
import com.scottsdicegame.backend.score.repository.GameScoreRepository;
import com.scottsdicegame.backend.score.repository.PlayerActivity;
import com.scottsdicegame.backend.game.repository.SavedGameRepository;
import com.scottsdicegame.backend.game.repository.SavedGameActivity;
import com.scottsdicegame.backend.api.exception.ApiException;
import com.scottsdicegame.backend.auth.service.AuthenticationService;
import com.scottsdicegame.backend.auth.validation.PasswordPolicy;
import com.scottsdicegame.backend.user.entity.UserAccount;
import com.scottsdicegame.backend.user.model.AuthProvider;
import com.scottsdicegame.backend.user.repository.UserAccountRepository;
import com.scottsdicegame.backend.user.validation.EmailAddress;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.time.Instant;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class AdminUserService {

    private final UserAccountRepository userRepository;
    private final AuthenticationService authenticationService;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final GameScoreRepository scoreRepository;
    private final SavedGameRepository savedGameRepository;

    public AdminUserService(
            UserAccountRepository userRepository,
            AuthenticationService authenticationService,
            PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder,
            GameScoreRepository scoreRepository,
            SavedGameRepository savedGameRepository
    ) {
        this.userRepository = userRepository;
        this.authenticationService = authenticationService;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
        this.scoreRepository = scoreRepository;
        this.savedGameRepository = savedGameRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(UUID adminId) {
        authenticationService.requireAdmin(adminId);
        var activity = scoreRepository.findPlayerActivity().stream()
                .collect(Collectors.toMap(PlayerActivity::getUserId, Function.identity()));
        var savedGames = savedGameRepository.findPlayerActivity().stream()
                .collect(Collectors.toMap(SavedGameActivity::getUserId, Function.identity()));
        return userRepository.findByAuthProviderNotOrderByCreatedAtAsc(AuthProvider.SYSTEM).stream()
                .map(user -> {
                    var completed = activity.get(user.getId());
                    var saved = savedGames.get(user.getId());
                    Instant lastPlayed = completed == null ? null : completed.getLastPlayed();
                    if (saved != null && (lastPlayed == null || saved.getLastPlayed().isAfter(lastPlayed))) {
                        lastPlayed = saved.getLastPlayed();
                    }
                    return AdminUserResponse.from(user, adminId, completed == null ? 0 : completed.getGamesPlayed(),
                            lastPlayed, saved != null);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminScoreHistoryResponse scoreHistory(UUID adminId, UUID userId, int page, String order) {
        authenticationService.requireAdmin(adminId);
        findManagedUser(userId);
        if (page < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "Page must be zero or greater.");
        Sort sort = switch (order) {
            case "newest" -> Sort.by(Sort.Direction.DESC, "completedAt", "id");
            case "oldest" -> Sort.by(Sort.Direction.ASC, "completedAt", "id");
            case "highest" -> Sort.by(Sort.Order.desc("score"), Sort.Order.desc("completedAt"), Sort.Order.desc("id"));
            case "lowest" -> Sort.by(Sort.Order.asc("score"), Sort.Order.desc("completedAt"), Sort.Order.desc("id"));
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Choose newest, oldest, highest, or lowest.");
        };
        var result = scoreRepository.findByUserId(userId, PageRequest.of(page, 50, sort));
        return new AdminScoreHistoryResponse(result.stream().map(score -> new AdminScoreHistoryResponse.Entry(
                score.getId(), score.getScore(), score.getCompletedAt())).toList(),
                result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }

    @Transactional
    public void changeRole(UUID adminId, UUID userId, AdminRoleChangeRequest request) {
        lockAccountPair(adminId, userId);
        authenticationService.requireAdmin(adminId);
        if (adminId.equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ADMIN_SELF_ROLE_CHANGE", "You cannot change your own administrator role.");
        }
        UserAccount user = findManagedUser(userId);
        user.changeAdminRole(request.admin());
        userRepository.save(user);
    }

    // Lock both accounts in a consistent order. Concurrent admins cannot remove each other's
    // access (or delete each other) after authorization was checked against an older role.
    private void lockAccountPair(UUID adminId, UUID userId) {
        Stream.of(adminId, userId).distinct().sorted()
                .forEach(userRepository::findByIdForUpdate);
    }

    @Transactional
    public void deleteUser(UUID adminId, UUID userId) {
        lockAccountPair(adminId, userId);
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
