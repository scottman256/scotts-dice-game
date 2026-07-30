package com.scottsdicegame.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_accounts")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 32)
    private String username;

    @Column(name = "normalized_username", length = 32, unique = true)
    private String normalizedUsername;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(length = 254)
    private String email;

    @Column(name = "photo_url", length = 1000)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    private AuthProvider authProvider;

    @Column(name = "external_subject", length = 128)
    private String externalSubject;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAccount() {
    }

    public static UserAccount manual(String username, String normalizedUsername, String passwordHash) {
        UserAccount account = new UserAccount();
        account.username = Objects.requireNonNull(username);
        account.normalizedUsername = Objects.requireNonNull(normalizedUsername);
        account.passwordHash = Objects.requireNonNull(passwordHash);
        account.displayName = username;
        account.authProvider = AuthProvider.MANUAL;
        return account;
    }

    public static UserAccount social(
            AuthProvider provider,
            String externalSubject,
            String displayName,
            String email,
            String photoUrl
    ) {
        if (provider == null || !provider.isSocial()) {
            throw new IllegalArgumentException("A social account requires a social provider.");
        }
        UserAccount account = new UserAccount();
        account.authProvider = Objects.requireNonNull(provider);
        account.externalSubject = Objects.requireNonNull(externalSubject);
        account.updateSocialProfile(displayName, email, photoUrl);
        return account;
    }

    public static UserAccount system(String systemKey, String displayName) {
        UserAccount account = new UserAccount();
        account.authProvider = AuthProvider.SYSTEM;
        account.externalSubject = Objects.requireNonNull(systemKey);
        account.displayName = Objects.requireNonNull(displayName);
        return account;
    }

    public void updateSocialProfile(String displayName, String email, String photoUrl) {
        this.displayName = displayName == null || displayName.isBlank() ? "Player" : displayName.trim();
        this.email = normalizeNullable(email);
        this.photoUrl = normalizeNullable(photoUrl);
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getNormalizedUsername() {
        return normalizedUsername;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public String getExternalSubject() {
        return externalSubject;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
