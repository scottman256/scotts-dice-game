package com.scottsdicegame.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
