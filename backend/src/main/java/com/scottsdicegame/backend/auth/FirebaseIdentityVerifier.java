package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.user.AuthProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class FirebaseIdentityVerifier {

    private static final String FIREBASE_JWK_SET =
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

    private final String projectId;
    private volatile NimbusJwtDecoder decoder;

    public FirebaseIdentityVerifier(@Value("${dice.firebase.project-id:}") String projectId) {
        this.projectId = projectId == null ? "" : projectId.trim();
    }

    public boolean isConfigured() {
        return !projectId.isBlank();
    }

    public FirebaseIdentity verify(String idToken) {
        if (!isConfigured()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "SOCIAL_AUTH_NOT_CONFIGURED",
                    "Social sign-in is not configured on the backend."
            );
        }

        try {
            Jwt jwt = getDecoder().decode(idToken);
            Map<String, Object> firebaseClaims = jwt.getClaimAsMap("firebase");
            String signInProvider = firebaseClaims == null
                    ? null
                    : String.valueOf(firebaseClaims.get("sign_in_provider"));
            AuthProvider provider = switch (signInProvider) {
                case "google.com" -> AuthProvider.GOOGLE;
                case "facebook.com" -> AuthProvider.FACEBOOK;
                default -> throw invalidToken();
            };

            String email = jwt.getClaimAsString("email");
            String name = jwt.getClaimAsString("name");
            if (name == null || name.isBlank()) {
                name = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : "Player";
            }
            return new FirebaseIdentity(
                    provider,
                    jwt.getSubject(),
                    name,
                    email,
                    jwt.getClaimAsString("picture")
            );
        } catch (JwtException | IllegalArgumentException exception) {
            throw invalidToken();
        }
    }

    private NimbusJwtDecoder getDecoder() {
        NimbusJwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                current = decoder;
                if (current == null) {
                    current = NimbusJwtDecoder.withJwkSetUri(FIREBASE_JWK_SET).build();
                    String issuer = "https://securetoken.google.com/" + projectId;
                    OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
                    OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
                            "aud",
                            audiences -> audiences != null && audiences.contains(projectId)
                    );
                    current.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuerValidator, audienceValidator));
                    decoder = current;
                }
            }
        }
        return current;
    }

    private static ApiException invalidToken() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_FIREBASE_TOKEN",
                "The social sign-in could not be verified. Please sign in again."
        );
    }
}
