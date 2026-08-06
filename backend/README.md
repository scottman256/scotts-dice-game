# Scott's Dice Game backend

Spring Boot service for local/manual authentication, verified Firebase identities, users, resumable games, theme preferences, completed-game high scores, player statistics, and achievements. It uses a conventional controller/service/repository split, stateless signed access tokens, Spring Data JPA/Hibernate, Flyway migrations, and an automatically started H2 database. Flyway also installs ten non-login system players with initial leaderboard scores from 499 down to 250.

## Run without Docker

```powershell
cd backend
.\gradlew.bat bootRun
```

The service listens on `http://localhost:8080`. Local data persists under `backend/data/`; delete that directory only when you intentionally want a fresh local database. The local seed accounts are `test` / `test` with `test@test.com` and administrator `admin` / `admin` with `admin@admin.com`.

New username accounts require a valid email address and can subsequently sign in with either their username or email. Both identifiers are matched case-insensitively. Email uniqueness is case-insensitive across username, Google, and Facebook accounts. Firebase email claims are validated and refreshed from the identity provider at sign-in; an administrator can update username-account emails, while provider-managed addresses remain read-only.

For the complete Docker deployment, use the root [`compose.yaml`](../compose.yaml) as documented in the [project README](../README.md). It builds this service as a non-root Java 17 container, connects it to the private H2 TCP service, and waits for database health before Spring Boot starts. The backend image is intentionally orchestrated through Compose rather than run alone because its Docker database hostname is provided there.

Important optional environment variables:

- `FIREBASE_PROJECT_ID` — enables verified Google/Facebook login for the matching Firebase project.
- `DICE_ALLOWED_ORIGINS` — comma-separated frontend origins; defaults to the local Vite origins.
- `DICE_JWT_SECRET` — Base64-encoded secret that decodes to at least 32 bytes. Always replace the development default outside local use.
- `DICE_ADMIN_PASSWORD` — password used only when bootstrapping the local administrator; defaults to `admin`. Set a strong value outside local H2 development.
- `DICE_DATABASE_URL`, `DICE_DATABASE_USERNAME`, `DICE_DATABASE_PASSWORD` — override H2 for another JDBC deployment.
- `DICE_SEED_TEST_USER=false`, `DICE_SEED_ADMIN_USER=false`, and `DICE_H2_CONSOLE_ENABLED=false` — disable local-only conveniences outside development. Disable admin seeding after provisioning production administration through your deployment process.

The H2 console uses `jdbc:h2:file:./data/dicegame` when the backend runs directly. In Docker it uses `jdbc:h2:tcp://database:9092/dicegame`; both use user `sa` with a blank local-development password.

## API

Public endpoints:

- `GET /api/public/status`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/firebase`

`POST /api/auth/login` accepts `identifier` (a username or email address) and `password`. The legacy `username` request property remains accepted for existing clients.

Bearer-token endpoints:

- `GET /api/auth/me`
- `POST /api/scores`
- `GET /api/scores/me`
- `GET /api/scores/leaderboard`
- `GET /api/stats/me`
- `GET /api/achievements/me`
- `GET /api/game-session`
- `PUT /api/game-session/theme`
- `PUT /api/game-session/game`
- `DELETE /api/game-session/game`

Administrator-role endpoints:

- `GET /api/admin/themes` and `PUT /api/admin/themes/{themeId}`
- `GET /api/admin/users`, `PUT /api/admin/users/{userId}/password`, `PUT /api/admin/users/{userId}/email`, and `DELETE /api/admin/users/{userId}`
- `POST /api/admin/scores`, `DELETE /api/admin/scores/{scoreId}`, and `POST /api/admin/game-data/reset`

Each user can have one resumable game. Dice and in-progress category scores are stored in normalized child tables, while theme preferences remain available after a saved game is completed or deleted. New score submissions preserve their completed scorecard and completion theme. Stats exclude older score-only games, while the achievement engine replays all available history and can retroactively award milestones supported by the stored facts. Earned achievement keys and their qualifying games are persisted; definitions remain in a versionable catalog so future achievements can evaluate old data without one-off database backfills.

Classic is permanently available. Disabling another theme changes affected saved preferences to Classic and prevents new saves or completed games from using the disabled theme. Deleting a player's score rebuilds that player's achievements from the remaining completed-game history. A full game-data reset removes player scores, stats, achievements, and saved games without deleting accounts, then restores any missing original fictional leaderboard entries.

## Tests and package

Run all unit and real HTTP/H2 integration tests with:

```powershell
.\gradlew.bat test
```

Run the same suite and enforce the 90% line-coverage requirement with:

```powershell
.\gradlew.bat check
```

JaCoCo writes its HTML report to `backend/build/reports/jacoco/test/html/`. The pull-request CI workflow uses `check`, so a test or coverage failure fails the backend status check.

Create the executable Spring Boot JAR with:

```powershell
.\gradlew.bat build
```

The packaged service is written under `backend/build/libs/`.
