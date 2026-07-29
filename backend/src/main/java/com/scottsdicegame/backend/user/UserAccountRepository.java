package com.scottsdicegame.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByNormalizedUsername(String normalizedUsername);

    boolean existsByNormalizedUsername(String normalizedUsername);

    Optional<UserAccount> findByAuthProviderAndExternalSubject(AuthProvider authProvider, String externalSubject);
}
