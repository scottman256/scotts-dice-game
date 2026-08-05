package com.scottsdicegame.backend.admin.dto;

import com.scottsdicegame.backend.user.EmailAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminEmailChangeRequest(
        @NotBlank(message = "Enter an email address.")
        @Size(max = EmailAddress.MAX_LENGTH, message = "Email address cannot exceed 254 characters.")
        @Pattern(regexp = EmailAddress.VALID_PATTERN, message = "Enter a valid email address.")
        String email
) {
}
