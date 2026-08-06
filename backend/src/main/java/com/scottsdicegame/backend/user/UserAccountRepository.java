package com.scottsdicegame.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByNormalizedUsername(String normalizedUsername);

    Optional<UserAccount> findByNormalizedUsernameOrNormalizedEmail(
            String normalizedUsername,
            String normalizedEmail
    );

    boolean existsByNormalizedUsername(String normalizedUsername);

    Optional<UserAccount> findByNormalizedEmail(String normalizedEmail);

    boolean existsByNormalizedEmail(String normalizedEmail);

    Optional<UserAccount> findByAuthProviderAndExternalSubject(AuthProvider authProvider, String externalSubject);

    List<UserAccount> findByAuthProviderNotOrderByCreatedAtAsc(AuthProvider authProvider);

    long deleteByAuthProviderAndExternalSubjectStartingWith(AuthProvider authProvider, String prefix);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT user FROM UserAccount user WHERE user.id = :userId")
    Optional<UserAccount> findByIdForUpdate(@Param("userId") UUID userId);
}
