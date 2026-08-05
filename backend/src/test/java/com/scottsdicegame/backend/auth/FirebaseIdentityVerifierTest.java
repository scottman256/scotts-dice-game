package com.scottsdicegame.backend.auth;

import com.scottsdicegame.backend.api.ApiException;
import com.scottsdicegame.backend.user.AuthProvider;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FirebaseIdentityVerifierTest {

    @Test
    void reportsConfigurationOnlyForANonBlankProjectId() {
        assertThat(new FirebaseIdentityVerifier(" dice-game ").isConfigured()).isTrue();
        assertThat(new FirebaseIdentityVerifier("   ").isConfigured()).isFalse();
        assertThat(new FirebaseIdentityVerifier(null).isConfigured()).isFalse();
    }

    @Test
    void rejectsSocialLoginWhenFirebaseIsNotConfigured() {
        assertThatThrownBy(() -> new FirebaseIdentityVerifier("").verify("token"))
                .isInstanceOf(ApiException.class)
                .satisfies(exception -> {
                    ApiException apiException = (ApiException) exception;
                    assertThat(apiException.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(apiException.getCode()).isEqualTo("SOCIAL_AUTH_NOT_CONFIGURED");
                });
    }

    @Test
    void mapsAValidGoogleTokenToAnIdentity() {
        NimbusJwtDecoder decoder = mock(NimbusJwtDecoder.class);
        FirebaseIdentityVerifier verifier = verifierUsing(decoder);
        when(decoder.decode("google-token")).thenReturn(jwt(
                "google.com",
                "google-subject",
                "Ada Player",
                "ada@example.com",
                "https://example.com/ada.png"
        ));

        FirebaseIdentity identity = verifier.verify("google-token");

        assertThat(identity).isEqualTo(new FirebaseIdentity(
                AuthProvider.GOOGLE,
                "google-subject",
                "Ada Player",
                "ada@example.com",
                "https://example.com/ada.png"
        ));
    }

    @Test
    void mapsFacebookAndFallsBackToTheEmailPrefixForABlankName() {
        NimbusJwtDecoder decoder = mock(NimbusJwtDecoder.class);
        FirebaseIdentityVerifier verifier = verifierUsing(decoder);
        when(decoder.decode("facebook-token")).thenReturn(jwt(
                "facebook.com",
                "facebook-subject",
                "   ",
                "dice.traveler@example.com",
                null
        ));

        FirebaseIdentity identity = verifier.verify("facebook-token");

        assertThat(identity.provider()).isEqualTo(AuthProvider.FACEBOOK);
        assertThat(identity.displayName()).isEqualTo("dice.traveler");
        assertThat(identity.photoUrl()).isNull();
    }

    @Test
    void rejectsUnsupportedProvidersAndMalformedTokens() {
        NimbusJwtDecoder decoder = mock(NimbusJwtDecoder.class);
        FirebaseIdentityVerifier verifier = verifierUsing(decoder);
        when(decoder.decode("unsupported-token")).thenReturn(jwt(
                "password",
                "password-subject",
                null,
                null,
                null
        ));
        when(decoder.decode("malformed-token")).thenThrow(new JwtException("Malformed token"));

        assertInvalidToken(() -> verifier.verify("unsupported-token"));
        assertInvalidToken(() -> verifier.verify("malformed-token"));
    }

    @Test
    void rejectsSocialTokensWithoutAValidEmailAddress() {
        NimbusJwtDecoder decoder = mock(NimbusJwtDecoder.class);
        FirebaseIdentityVerifier verifier = verifierUsing(decoder);
        when(decoder.decode("missing-email")).thenReturn(jwt(
                "google.com",
                "google-subject",
                "Player",
                null,
                null
        ));
        when(decoder.decode("invalid-email")).thenReturn(jwt(
                "facebook.com",
                "facebook-subject",
                "Player",
                "not-an-email",
                null
        ));

        assertInvalidToken(() -> verifier.verify("missing-email"));
        assertInvalidToken(() -> verifier.verify("invalid-email"));
    }

    private static FirebaseIdentityVerifier verifierUsing(NimbusJwtDecoder decoder) {
        FirebaseIdentityVerifier verifier = new FirebaseIdentityVerifier("dice-game");
        ReflectionTestUtils.setField(verifier, "decoder", decoder);
        return verifier;
    }

    private static Jwt jwt(
            String provider,
            String subject,
            String name,
            String email,
            String picture
    ) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject(subject)
                .claim("firebase", Map.of("sign_in_provider", provider));
        if (name != null) {
            builder.claim("name", name);
        }
        if (email != null) {
            builder.claim("email", email);
        }
        if (picture != null) {
            builder.claim("picture", picture);
        }
        return builder.build();
    }

    private static void assertInvalidToken(ThrowingOperation operation) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(ApiException.class)
                .satisfies(exception -> {
                    ApiException apiException = (ApiException) exception;
                    assertThat(apiException.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiException.getCode()).isEqualTo("INVALID_FIREBASE_TOKEN");
                });
    }

    @FunctionalInterface
    private interface ThrowingOperation {
        void run();
    }
}
