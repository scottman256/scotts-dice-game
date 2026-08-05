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
    private final boolean seedAdminUser;
    private final String adminPassword;

    public LocalDataInitializer(
            UserAccountRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${dice.seed-test-user:true}") boolean seedTestUser,
            @Value("${dice.seed-admin-user:true}") boolean seedAdminUser,
            @Value("${dice.admin-password:admin}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedTestUser = seedTestUser;
        this.seedAdminUser = seedAdminUser;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (seedTestUser && !userRepository.existsByNormalizedUsername("test")) {
            // Deliberate local-only password-policy exception requested for development and integration testing.
            userRepository.save(UserAccount.manual(
                    "test",
                    "test",
                    "test@test.com",
                    passwordEncoder.encode("test")
            ));
        }
        if (seedAdminUser && !userRepository.existsByNormalizedUsername("admin")) {
            // Deliberate local/H2 bootstrap exception. Production must supply a secure DICE_ADMIN_PASSWORD.
            userRepository.save(UserAccount.admin(
                    "admin",
                    "admin",
                    "admin@admin.com",
                    passwordEncoder.encode(adminPassword)
            ));
        }
    }
}
