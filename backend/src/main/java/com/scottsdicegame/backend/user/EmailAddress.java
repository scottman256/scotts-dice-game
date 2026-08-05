package com.scottsdicegame.backend.user;

import java.util.Locale;
import java.util.regex.Pattern;

public final class EmailAddress {

    public static final int MAX_LENGTH = 254;
    public static final String VALID_PATTERN =
            "^(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+"
                    + "(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9]"
                    + "(?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
                    + "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$";

    private static final Pattern PATTERN = Pattern.compile(VALID_PATTERN);

    private EmailAddress() {
    }

    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        return !trimmed.isEmpty()
                && trimmed.length() <= MAX_LENGTH
                && PATTERN.matcher(trimmed).matches();
    }

    public static String normalize(String value) {
        if (!isValid(value)) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    public static String clean(String value) {
        if (!isValid(value)) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        return value.trim();
    }
}
