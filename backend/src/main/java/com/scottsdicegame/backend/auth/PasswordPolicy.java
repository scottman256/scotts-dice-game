package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    public static final String SUMMARY =
            "Use 12–72 characters with uppercase, lowercase, a number, and a symbol.";

    public void validate(String password) {
        boolean valid = password != null
                && password.length() >= 12
                && password.length() <= 72
                && password.chars().anyMatch(Character::isUpperCase)
                && password.chars().anyMatch(Character::isLowerCase)
                && password.chars().anyMatch(Character::isDigit)
                && password.chars().anyMatch(character -> !Character.isLetterOrDigit(character))
                && password.chars().noneMatch(Character::isWhitespace);

        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", SUMMARY);
        }
    }
}
