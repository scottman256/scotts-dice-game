package com.scottsdicegame.backend.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailAddressTest {

    @Test
    void validatesCleansAndNormalizesEmailAddresses() {
        assertThat(EmailAddress.isValid("  Player.Name+scores@Example.COM  ")).isTrue();
        assertThat(EmailAddress.clean("  Player.Name+scores@Example.COM  "))
                .isEqualTo("Player.Name+scores@Example.COM");
        assertThat(EmailAddress.normalize("  Player.Name+scores@Example.COM  "))
                .isEqualTo("player.name+scores@example.com");
    }

    @Test
    void rejectsMissingMalformedAndOversizedEmailAddresses() {
        assertThat(EmailAddress.isValid(null)).isFalse();
        assertThat(EmailAddress.isValid("   ")).isFalse();
        assertThat(EmailAddress.isValid("player@example")).isFalse();
        assertThat(EmailAddress.isValid("player @example.com")).isFalse();
        assertThat(EmailAddress.isValid(".player@example.com")).isFalse();
        assertThat(EmailAddress.isValid("player..name@example.com")).isFalse();
        assertThat(EmailAddress.isValid("x".repeat(65) + "@example.com")).isFalse();
        assertThatThrownBy(() -> EmailAddress.normalize("not-an-email"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
