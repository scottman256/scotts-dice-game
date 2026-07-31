# Scott's Dice Game

Scott's Dice Game is a modern, full-featured reimagining of a dice game Scott built when he first got into coding. This version was created with ChatGPT 5.6 (Sol), carrying the original idea into a polished contemporary experience.

## The game

Roll five dice, hold the ones you want to keep, and chase scoring combinations to complete the scorecard, earn bonuses, and build the highest total possible. Signed-in players have their theme and current game saved automatically, can resume that game after returning, and can compare their personal top ten with the overall leaderboard. Guest play remains fully local. A new database starts with ten fictional dice-themed leaderboard players whose scores range from 499 to 250, giving every player an immediate target to beat.

Open the gear-shaped Settings menu during a game to switch themes without losing progress. Every theme has its own background and dice artwork, with choices including Classic, Vegas, Cosmic Galaxy, Clockwork, Baseball, and World Traveler.

## Project structure

- `frontend/` — React and Vite web application
- `backend/` — Spring Boot, Spring Security, JPA/Hibernate, Flyway, and H2 service

## Run both services locally

The backend targets Java 17 and works with the currently installed Java `17.0.10`. Gradle 9.3 is supplied through the project wrapper, following the same wrapper-based approach as the `st-hellfire2/api` project, so a separate Gradle installation is not required.

Start the backend from one PowerShell window:

```powershell
cd backend
.\gradlew.bat bootRun
```

On first startup, H2 creates `backend/data/dicegame`, Flyway creates the tables and default leaderboard, and the application seeds the local account `test` / `test`. The fictional leaderboard identities are system accounts with no login credentials. The deliberately weak test password is a development-only exception; every newly registered account must meet the strong-password policy.

Start the frontend from a second PowerShell window:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. `VITE_API_BASE_URL` defaults to `http://localhost:8080` in the example environment file. If the backend is stopped, the frontend automatically offers only Guest mode and does not make authenticated persistence or score requests.

## Optional social sign-in

Configure the Firebase web values in `frontend/.env.local`, enable Google and/or Facebook in Firebase Authentication, and give the backend the same project ID before starting it:

```powershell
$env:FIREBASE_PROJECT_ID='your-project-id'
.\gradlew.bat bootRun
```

The frontend sends the Firebase ID token to the backend, which verifies its signature, issuer, audience, and provider before creating or updating the linked local user. Keep provider secrets and Firebase service-account keys out of Vite environment files.

## H2 console and tests

While the backend is running, the local H2 console is at `http://localhost:8080/h2-console`. Use JDBC URL `jdbc:h2:file:./data/dicegame`, user `sa`, and a blank password.

```powershell
# Backend unit and integration tests
cd backend
.\gradlew.bat test

# Frontend tests and production build
cd ..\frontend
npm test -- --runInBand
npm run build
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for configuration and API details.
