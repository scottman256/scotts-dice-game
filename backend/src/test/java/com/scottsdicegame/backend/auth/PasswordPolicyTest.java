package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy passwordPolicy = new PasswordPolicy();

    @Test
    void acceptsAPasswordWithEveryRequiredCharacterClass() {
        assertThatCode(() -> passwordPolicy.validate("DiceGame!2026"))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "Short!2A",
            "alllowercase!2",
            "ALLUPPERCASE!2",
            "NoNumbersHere!",
            "NoSymbolsHere22",
            "Spaces AreBad!2"
    })
    void rejectsWeakPasswords(String password) {
        assertThatThrownBy(() -> passwordPolicy.validate(password))
                .isInstanceOf(ApiException.class)
                .hasMessage(PasswordPolicy.SUMMARY)
                .extracting(exception -> ((ApiException) exception).getCode())
                .isEqualTo("WEAK_PASSWORD");
    }
}
