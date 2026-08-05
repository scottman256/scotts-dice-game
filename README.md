# Scott's Dice Game

Scott's Dice Game is a modern, full-featured reimagining of a dice game Scott built when he first got into coding. This version was created with ChatGPT 5.6 (Sol), carrying the original idea into a polished contemporary experience.

## The Game

Roll five dice, hold the ones you want to keep, and chase scoring combinations to complete the scorecard, earn bonuses, and build the highest total possible. Signed-in players have their theme and current game saved automatically, can resume that game after returning, and can use the Player Hub to view scores, stats, and a 36-slot achievement collection. Guest play remains fully local. A new database starts with ten fictional dice-themed leaderboard players whose scores range from 499 to 250, giving every player an immediate target to beat.

Open the gear-shaped Settings menu during a game to switch themes without losing progress. Every theme has its own background and dice artwork, with choices including Classic, Vegas, Cosmic Galaxy, Candy Kingdom, Frozen Crystal, Deep Sea, Jungle Adventure, and World Traveler.

## Project structure

- `frontend/` — React and Vite web application
- `backend/` — Spring Boot, Spring Security, JPA/Hibernate, Flyway, and H2 service
- `database/` — minimal H2 TCP-server container used by Docker Compose
- `compose.yaml` — complete local container stack

## Run with Docker

[Docker Desktop](https://www.docker.com/products/docker-desktop/) (or another Docker Engine with Compose v2) is the only prerequisite. From the project root, run:

Stop any locally running frontend or backend first so the default host ports `5173` and `8080` are available.

```powershell
docker compose up --build
```

Compose builds and starts the H2 database, waits for it to become healthy, starts the backend and runs its Flyway migrations, then starts the frontend. Open `http://localhost:5173` and sign in with `test` / `test`, use the local administrator `admin` / `admin`, create an account, or play as a guest. The seeded accounts use `test@test.com` and `admin@admin.com`; new username accounts require a valid, unique email address. The backend and H2 console are available at `http://localhost:8080` and `http://localhost:8080/h2-console`; for the Docker H2 console use JDBC URL `jdbc:h2:tcp://database:9092/dicegame`, user `sa`, and a blank password.

Database files survive container restarts in the `h2-data` named volume. Stop the stack with `docker compose down`. Use `docker compose down -v` only when you intentionally want to delete that volume and start with a fresh database.

Docker works without an environment file. To change the host ports, JWT key, or enable social sign-in, copy `.env.docker.example` to `.env`, edit the values, and rebuild:

```powershell
Copy-Item .env.docker.example .env
docker compose up --build
```

## Run without Docker

The backend targets Java 17 and works with the currently installed Java `17.0.10`. Gradle 9.3 is supplied through the project wrapper.
Start the backend from one PowerShell window:

```powershell
cd backend
.\gradlew.bat bootRun
```

On first startup, H2 creates `backend/data/dicegame`, Flyway creates the tables and default leaderboard, and the application seeds `test` / `test` plus the local administrator `admin` / `admin`. The administrator can manage theme availability, user accounts, and leaderboard/game data from admin-only screens. The fictional leaderboard identities are system accounts with no login credentials. Both weak seed passwords are development-only exceptions; every newly registered account and admin-initiated password change must meet the strong-password policy.

Start the frontend from a second PowerShell window:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. `VITE_API_BASE_URL` defaults to `http://localhost:8080` in the example environment file. If the backend is stopped, the frontend automatically offers only Guest mode and does not make authenticated persistence or score requests.

## Optional social sign-in

Enable Google and/or Facebook in Firebase Authentication and use the same Firebase project ID in both services. For Docker, set `FIREBASE_PROJECT_ID` and the public `VITE_FIREBASE_*` values in the root `.env` described above. Without Docker, configure the public values in `frontend/.env.local` and set the backend project ID before starting it:

```powershell
$env:FIREBASE_PROJECT_ID='your-project-id'
.\gradlew.bat bootRun
```

The frontend sends the Firebase ID token to the backend, which verifies its signature, issuer, audience, and provider before creating or updating the linked local user. Keep provider secrets and Firebase service-account keys out of Vite environment files.

## Local H2 console and tests

When running without Docker, the H2 console is at `http://localhost:8080/h2-console`. Use JDBC URL `jdbc:h2:file:./data/dicegame`, user `sa`, and a blank password.

```powershell
# Backend unit and integration tests with the coverage gate
cd backend
.\gradlew.bat check

# Frontend tests with the coverage gate, then a production build
cd ..\frontend
npm run test:ci -- --runInBand
npm run build
```

## Continuous integration

The [pull-request workflow](.github/workflows/ci.yml) runs independent frontend and backend jobs on every pull request. It installs dependencies from the committed lockfiles, runs all unit and integration tests, enforces the configured 90% coverage gates, verifies the frontend production build, and retains the generated test and coverage reports as workflow artifacts for seven days.


See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for configuration and API details.
