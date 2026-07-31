# Scott's Dice Game backend

Spring Boot service for local/manual authentication, verified Firebase identities, users, resumable games, theme preferences, and completed-game high scores. It uses a conventional controller/service/repository split, stateless signed access tokens, Spring Data JPA/Hibernate, Flyway migrations, and an automatically started H2 database. Flyway also installs ten non-login system players with initial leaderboard scores from 499 down to 250.

## Run

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The service listens on `http://localhost:8080`. Local data persists under `backend/data/`; delete that directory only when you intentionally want a fresh local database. The seed account is `test` / `test`.

Important optional environment variables:

- `FIREBASE_PROJECT_ID` — enables verified Google/Facebook login for the matching Firebase project.
- `DICE_ALLOWED_ORIGINS` — comma-separated frontend origins; defaults to the local Vite origins.
- `DICE_JWT_SECRET` — Base64-encoded secret that decodes to at least 32 bytes. Always replace the development default outside local use.
- `DICE_DATABASE_URL`, `DICE_DATABASE_USERNAME`, `DICE_DATABASE_PASSWORD` — override H2 for another JDBC deployment.
- `DICE_SEED_TEST_USER=false` and `DICE_H2_CONSOLE_ENABLED=false` — disable local-only conveniences outside development.

## API

Public endpoints:

- `GET /api/public/status`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/firebase`

Bearer-token endpoints:

- `GET /api/auth/me`
- `POST /api/scores`
- `GET /api/scores/me`
- `GET /api/scores/leaderboard`
- `GET /api/game-session`
- `PUT /api/game-session/theme`
- `PUT /api/game-session/game`
- `DELETE /api/game-session/game`

Each user can have one resumable game. Dice and category scores are stored in normalized child tables, while theme preferences remain available after a saved game is completed or deleted.

Run all unit and real HTTP/H2 integration tests with:

```powershell
.\mvnw.cmd test
```
