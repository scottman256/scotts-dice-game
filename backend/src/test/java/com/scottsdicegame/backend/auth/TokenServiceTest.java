package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.user.UserAccount;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtEncoder;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class TokenServiceTest {

    @Test
    void refusesToIssueAccessTokensForSystemLeaderboardAccounts() {
        JwtEncoder jwtEncoder = mock(JwtEncoder.class);
        TokenService tokenService = new TokenService(jwtEncoder, Duration.ofHours(1));
        UserAccount systemAccount = UserAccount.system("default-leaderboard-01", "Sir Rolls-a-Lot");

        assertThatThrownBy(() -> tokenService.issue(systemAccount))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("System leaderboard accounts cannot receive access tokens.");
        verifyNoInteractions(jwtEncoder);
    }
}
