package com.scottsdicegame.backend.admin.dto;

import jakarta.validation.constraints.NotNull;

public record AdminRoleChangeRequest(@NotNull Boolean admin) {
}
