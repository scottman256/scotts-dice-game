package com.scottsdicegame.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:h2-console-security-${random.uuid}",
                "spring.h2.console.enabled=true",
                "dice.seed-test-user=false",
                "dice.seed-admin-user=false",
                "dice.firebase.project-id="
        }
)
class H2ConsoleSecurityIntegrationTest {

    @Value("${local.server.port}")
    private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void exposesTheEnabledH2ConsoleWithoutOpeningProtectedApiEndpoints() throws Exception {
        HttpResponse<String> consoleResponse = get("/h2-console/");
        HttpResponse<String> protectedApiResponse = get("/api/stats/me");

        assertThat(consoleResponse.statusCode()).isEqualTo(200);
        assertThat(consoleResponse.body()).containsIgnoringCase("H2 Console");
        assertThat(consoleResponse.headers().firstValue("X-Frame-Options"))
                .contains("SAMEORIGIN");
        assertThat(protectedApiResponse.statusCode()).isEqualTo(401);
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
