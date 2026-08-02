package com.scottsdicegame.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByNormalizedUsername(String normalizedUsername);

    boolean existsByNormalizedUsername(String normalizedUsername);

    Optional<UserAccount> findByAuthProviderAndExternalSubject(AuthProvider authProvider, String externalSubject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT user FROM UserAccount user WHERE user.id = :userId")
    Optional<UserAccount> findByIdForUpdate(@Param("userId") UUID userId);
}
