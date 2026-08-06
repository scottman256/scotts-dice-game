package com.scottsdicegame.backend.user;

import com.scottsdicegame.backend.auth.dto.UserResponse;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserAccountTest {

    @Test
    void rejectsProvidersThatCannotBackASocialAccount() {
        assertThatThrownBy(() -> UserAccount.social(
                null,
                "subject",
                "Player",
                "player@example.com",
                null
        )).isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> UserAccount.social(
                AuthProvider.MANUAL,
                "subject",
                "Player",
                "player@example.com",
                null
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void enforcesProviderSpecificPasswordAndEmailMutations() {
        UserAccount social = UserAccount.social(
                AuthProvider.GOOGLE,
                "google-subject",
                "Google Player",
                "google@example.com",
                null
        );
        UserAccount system = UserAccount.system("leaderboard-player", "Leaderboard Player");

        assertThatThrownBy(() -> social.changePasswordHash("replacement-hash"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only username accounts have local passwords.");
        assertThatThrownBy(() -> system.changeEmail("system@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("System accounts do not have email addresses.");
    }

    @Test
    void exposesNormalizedManualDataAndSafeSocialProfileDefaults() {
        UserAccount manual = UserAccount.manual(
                "DicePlayer",
                "diceplayer",
                "DicePlayer@example.com",
                "password-hash"
        );
        UserAccount social = UserAccount.social(
                AuthProvider.FACEBOOK,
                "facebook-subject",
                null,
                "facebook@example.com",
                "   "
        );

        assertThat(manual.getNormalizedUsername()).isEqualTo("diceplayer");
        assertThat(social.getDisplayName()).isEqualTo("Player");
        assertThat(social.getPhotoUrl()).isNull();
    }

    @Test
    void mapsEveryProviderToAStablePublicLabel() {
        UserAccount google = UserAccount.social(
                AuthProvider.GOOGLE,
                "google-subject",
                "Google Player",
                "google@example.com",
                null
        );
        UserAccount facebook = UserAccount.social(
                AuthProvider.FACEBOOK,
                "facebook-subject",
                "Facebook Player",
                "facebook@example.com",
                null
        );
        UserAccount system = UserAccount.system(
                UUID.randomUUID(),
                "leaderboard-player",
                "Leaderboard Player"
        );

        assertThat(UserResponse.from(google).providerLabel()).isEqualTo("Google");
        assertThat(UserResponse.from(facebook).providerLabel()).isEqualTo("Facebook");
        assertThat(UserResponse.from(system))
                .extracting(UserResponse::email, UserResponse::providerLabel)
                .containsExactly("", "Leaderboard");
    }
}
