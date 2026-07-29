package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.auth.dto.AuthResponse;
import com.scottsdicegame.backend.auth.dto.UserResponse;
import com.scottsdicegame.backend.user.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class TokenService {

    private static final String ISSUER = "scotts-dice-game";

    private final JwtEncoder jwtEncoder;
    private final Duration tokenTtl;
    private final Clock clock;

    public TokenService(
            JwtEncoder jwtEncoder,
            @Value("${dice.security.access-token-ttl}") Duration tokenTtl
    ) {
        this.jwtEncoder = jwtEncoder;
        this.tokenTtl = tokenTtl;
        this.clock = Clock.systemUTC();
    }

    public AuthResponse issue(UserAccount user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(tokenTtl);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("provider", user.getAuthProvider().name())
                .claim("name", user.getDisplayName())
                .build();
        JwsHeader headers = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
        return new AuthResponse(token, expiresAt, UserResponse.from(user));
    }
}
