package com.scottsdicegame.backend.admin;

import com.scottsdicegame.backend.admin.dto.AdminPasswordChangeRequest;
import com.scottsdicegame.backend.admin.dto.AdminUserResponse;
import com.scottsdicegame.backend.auth.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    List<AdminUserResponse> listUsers(Authentication authentication) {
        return adminUserService.listUsers(adminId(authentication));
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteUser(Authentication authentication, @PathVariable UUID userId) {
        adminUserService.deleteUser(adminId(authentication), userId);
    }

    @PutMapping("/{userId}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(
            Authentication authentication,
            @PathVariable UUID userId,
            @Valid @RequestBody AdminPasswordChangeRequest request
    ) {
        adminUserService.changePassword(adminId(authentication), userId, request);
    }

    private static UUID adminId(Authentication authentication) {
        return AuthenticationService.parseUserId(authentication.getName());
    }
}
