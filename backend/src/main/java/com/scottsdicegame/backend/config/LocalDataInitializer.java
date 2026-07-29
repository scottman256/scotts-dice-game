package com.scottsdicegame.backend.config;

import com.scottsdicegame.backend.user.UserAccount;
import com.scottsdicegame.backend.user.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class LocalDataInitializer implements CommandLineRunner {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedTestUser;

    public LocalDataInitializer(
            UserAccountRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${dice.seed-test-user:true}") boolean seedTestUser
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedTestUser = seedTestUser;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (seedTestUser && !userRepository.existsByNormalizedUsername("test")) {
            // Deliberate local-only password-policy exception requested for development and integration testing.
            userRepository.save(UserAccount.manual("test", "test", passwordEncoder.encode("test")));
        }
    }
}
