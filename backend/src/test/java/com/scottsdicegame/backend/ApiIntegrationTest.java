package com.scottsdicegame.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:file:./target/test-data/dice-integration-${random.uuid}",
                "spring.h2.console.enabled=false",
                "dice.seed-test-user=true",
                "dice.firebase.project-id="
        }
)
class ApiIntegrationTest {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("\\\"accessToken\\\":\\\"([^\\\"]+)\\\"");

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void statusEndpointIsPublicAndReportsAvailableManualAuthentication() throws Exception {
        HttpResponse<String> response = get("/api/public/status", null);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
        assertThat(response.body()).contains("\"manualAuthEnabled\":true");
        assertThat(response.body()).contains("\"socialAuthEnabled\":false");
    }

    @Test
    void migrationsSeedTenNonLoginLeaderboardPlayersWithTheRequestedScores() throws Exception {
        List<String> names = jdbcTemplate.queryForList("""
                SELECT u.display_name
                FROM game_scores s
                JOIN user_accounts u ON u.id = s.user_id
                WHERE u.auth_provider = 'SYSTEM'
                ORDER BY s.score DESC
                """, String.class);
        List<Integer> scores = jdbcTemplate.queryForList("""
                SELECT s.score
                FROM game_scores s
                JOIN user_accounts u ON u.id = s.user_id
                WHERE u.auth_provider = 'SYSTEM'
                ORDER BY s.score DESC
                """, Integer.class);

        assertThat(names).containsExactly(
                "Sir Rolls-a-Lot",
                "Dicey McDiceface",
                "Pip Zeppelin",
                "Count Rollula",
                "Snake Eyes Malone",
                "Cubert von Chance",
                "The Rolling Scone",
                "Lady Luckbeard",
                "Rollbert Einstein",
                "Pipsqueak Prime"
        );
        assertThat(scores).containsExactly(499, 475, 450, 425, 400, 375, 350, 325, 300, 250);

        Integer credentialCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM user_accounts
                WHERE auth_provider = 'SYSTEM'
                  AND (username IS NOT NULL OR normalized_username IS NOT NULL OR password_hash IS NOT NULL)
                """, Integer.class);
        assertThat(credentialCount).isZero();

        HttpResponse<String> login = post("/api/auth/login", """
                {"username":"Sir Rolls-a-Lot","password":"anything"}
                """, null);
        assertThat(login.statusCode()).isEqualTo(401);
    }

    @Test
    void seededTestAccountCanLoginAndUseProtectedScoreEndpoints() throws Exception {
        HttpResponse<String> login = post("/api/auth/login", """
                {"username":"test","password":"test"}
                """, null);
        assertThat(login.statusCode()).isEqualTo(200);
        String token = extractToken(login.body());

        HttpResponse<String> firstScore = post("/api/scores", """
                {"gameId":"%s","score":410}
                """.formatted(UUID.randomUUID()), token);
        assertThat(firstScore.statusCode()).isEqualTo(201);
        assertThat(firstScore.body()).contains("\"newHighScore\":true");

        HttpResponse<String> lowerScore = post("/api/scores", """
                {"gameId":"%s","score":275}
                """.formatted(UUID.randomUUID()), token);
        assertThat(lowerScore.statusCode()).isEqualTo(201);
        assertThat(lowerScore.body()).contains("\"newHighScore\":false");

        HttpResponse<String> personalScores = get("/api/scores/me", token);
        assertThat(personalScores.statusCode()).isEqualTo(200);
        assertThat(personalScores.body()).contains("\"rank\":1", "\"score\":410", "\"playerName\":\"test\"");
        assertThat(personalScores.body().indexOf("\"score\":410"))
                .isLessThan(personalScores.body().indexOf("\"score\":275"));

        HttpResponse<String> leaderboard = get("/api/scores/leaderboard", token);
        assertThat(leaderboard.statusCode()).isEqualTo(200);
        assertThat(leaderboard.body()).contains("\"score\":410");
        assertThat(leaderboard.body().indexOf("\"score\":425"))
                .isLessThan(leaderboard.body().indexOf("\"score\":410"));
        assertThat(leaderboard.body().indexOf("\"score\":410"))
                .isLessThan(leaderboard.body().indexOf("\"score\":400"));
    }

    @Test
    void authenticatedUsersCanPersistOneGameAndThemeThenDeleteOnlyTheGame() throws Exception {
        HttpResponse<String> login = post("/api/auth/login", """
                {"username":"test","password":"test"}
                """, null);
        String token = extractToken(login.body());

        HttpResponse<String> theme = put("/api/game-session/theme", """
                {"theme":"cosmic-galaxy"}
                """, token);
        assertThat(theme.statusCode()).isEqualTo(200);
        assertThat(theme.body()).contains("\"theme\":\"cosmic-galaxy\"");

        UUID firstGameId = UUID.randomUUID();
        HttpResponse<String> firstSave = put("/api/game-session/game", """
                {
                  "gameId":"%s",
                  "dice":[6,6,3,2,1],
                  "heldDice":[true,true,false,false,false],
                  "rollCount":2,
                  "scores":{"ones":2},
                  "extraRollsUsed":1,
                  "status":"Roll 2 of 3. Hold dice or cash in.",
                  "statusTone":"normal"
                }
                """.formatted(firstGameId), token);
        assertThat(firstSave.statusCode()).isEqualTo(200);
        assertThat(firstSave.body()).contains(
                "\"gameId\":\"" + firstGameId + "\"",
                "\"dice\":[6,6,3,2,1]",
                "\"heldDice\":[true,true,false,false,false]",
                "\"scores\":{\"ones\":2}"
        );

        HttpResponse<String> restored = get("/api/game-session", token);
        assertThat(restored.statusCode()).isEqualTo(200);
        assertThat(restored.body()).contains(
                "\"theme\":\"cosmic-galaxy\"",
                "\"savedGame\":{",
                "\"gameId\":\"" + firstGameId + "\""
        );

        UUID replacementGameId = UUID.randomUUID();
        HttpResponse<String> replacement = put("/api/game-session/game", """
                {
                  "gameId":"%s",
                  "dice":[1,2,3,4,5],
                  "heldDice":[false,false,false,false,false],
                  "rollCount":1,
                  "scores":{},
                  "extraRollsUsed":0,
                  "status":"Roll 1 of 3.",
                  "statusTone":"normal"
                }
                """.formatted(replacementGameId), token);
        assertThat(replacement.statusCode()).isEqualTo(200);

        Integer savedGameCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM saved_games g
                JOIN user_accounts u ON u.id = g.user_id
                WHERE u.normalized_username = 'test'
                """, Integer.class);
        assertThat(savedGameCount).isEqualTo(1);
        assertThat(get("/api/game-session", token).body())
                .contains("\"gameId\":\"" + replacementGameId + "\"")
                .doesNotContain("\"gameId\":\"" + firstGameId + "\"");

        HttpResponse<String> deleted = delete("/api/game-session/game", token);
        assertThat(deleted.statusCode()).isEqualTo(204);
        assertThat(get("/api/game-session", token).body())
                .contains("\"theme\":\"cosmic-galaxy\"", "\"savedGame\":null");
    }

    @Test
    void registrationEnforcesPasswordStrengthAndCaseInsensitiveUsernameUniqueness() throws Exception {
        String username = "Player_" + UUID.randomUUID().toString().substring(0, 8);
        HttpResponse<String> weakPassword = post("/api/auth/register", """
                {"username":"%s","password":"weak","passwordConfirmation":"weak"}
                """.formatted(username), null);
        assertThat(weakPassword.statusCode()).isEqualTo(400);
        assertThat(weakPassword.body()).contains("\"code\":\"WEAK_PASSWORD\"");

        String registrationBody = """
                {"username":"%s","password":"DiceGame!2026","passwordConfirmation":"DiceGame!2026"}
                """.formatted(username);
        HttpResponse<String> registered = post("/api/auth/register", registrationBody, null);
        assertThat(registered.statusCode()).isEqualTo(201);
        assertThat(registered.body()).contains("\"username\":\"" + username + "\"");

        HttpResponse<String> duplicate = post("/api/auth/register", """
                {"username":"%s","password":"Another!Pass2026","passwordConfirmation":"Another!Pass2026"}
                """.formatted(username.toUpperCase()), null);
        assertThat(duplicate.statusCode()).isEqualTo(409);
        assertThat(duplicate.body()).contains("\"code\":\"USERNAME_TAKEN\"");
        assertThat(duplicate.body()).contains("That username is already taken");
    }

    @Test
    void protectedEndpointsRejectGuestRequests() throws Exception {
        HttpResponse<String> response = get("/api/scores/me", null);

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(get("/api/game-session", null).statusCode()).isEqualTo(401);
    }

    private HttpResponse<String> get(String path, String token) throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path)).GET();
        authorize(request, token);
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body, String token)
            throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        authorize(request, token);
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> put(String path, String body, String token)
            throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body));
        authorize(request, token);
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> delete(String path, String token)
            throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path)).DELETE();
        authorize(request, token);
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void authorize(HttpRequest.Builder request, String token) {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    private static String extractToken(String body) {
        Matcher matcher = TOKEN_PATTERN.matcher(body);
        assertThat(matcher.find()).as("access token in response: %s", body).isTrue();
        return matcher.group(1);
    }
}
