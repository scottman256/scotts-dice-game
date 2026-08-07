# Scott's Dice Game frontend

React + Vite dice game with held dice, category scoring, bonus rolls, twenty visual themes, guest play, username accounts, optional Google/Facebook authentication, resumable games, saved high scores, personal/global leaderboards, completed-game player stats, and an illustrated achievement collection.

## Run locally

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Run the Spring Boot service described in the [root README](../README.md) to enable accounts, saved progress, themes, and scores. Signed-in progress is saved after game changes and can be continued on the next sign-in. If the backend is unavailable, the app seamlessly presents Guest mode only; guest games remain local and never call protected APIs.

For Docker, use the root [`compose.yaml`](../compose.yaml) and the concise instructions in the [project README](../README.md). The frontend Dockerfile creates a static production build and serves it from non-root Nginx on container port 8080. Nginx also proxies `/backend` to Spring Boot, so browsers use one origin and never need to resolve Docker service names. Firebase `VITE_*` values are build-time settings, so rebuild the frontend image after changing them.

Use the gear button during a game to switch among themes such as Classic, Vegas, Cosmic Galaxy, Candy Kingdom, Frozen Crystal, Deep Sea, Jungle Adventure, and World Traveler. The active game stays mounted while settings is open, and appearance returns to Classic when the session returns to sign-in. Signed-in players can open the Player Hub for their personal top ten, the overall top ten, completed-game stats, and achievements. Achievement evaluation replays available score history so compatible milestones can be awarded retroactively; older games cannot prove category- or theme-specific accomplishments when that detail was not recorded.

The login page and in-game navigation both link to a themed How to Play guide. It explains the turn flow, fourth-roll reserve, every scoring category, and both top-section bonuses; signed-in players also see their account benefits, while administrators receive an additional admin-tool reference.

The local administrator can sign in with `admin` or `admin@admin.com` and password `admin`, then use a separate Admin menu for enabling themes, resetting game data, and managing user accounts. New username accounts require a valid email address, and either identifier can be used on later sign-ins. The user-management table displays every account email and lets administrators update username-account addresses and passwords; Google and Facebook addresses remain managed by Firebase. Its global leaderboard view can add fictional system scores or remove individual entries. Classic cannot be disabled.

## Google and Facebook sign-in

The app uses the modular Firebase Authentication SDK:

1. Create a Firebase project and register a Web app.
2. Enable the Google and Facebook authentication providers.
3. For Facebook, configure its App ID, App Secret, and Firebase OAuth redirect URI in the provider consoles—not in this repository.
4. Add `localhost` and deployed hostnames to Firebase Authentication's authorized domains.
5. Put the public `VITE_FIREBASE_*` values in `.env.local`, set the matching `FIREBASE_PROJECT_ID` for the backend, and restart both services.

Only public Firebase web configuration belongs in `VITE_FIREBASE_*`. Never add provider secrets or Firebase service-account keys to a frontend environment file.

## Tests

```powershell
npm test
npm run test:watch
npm run test:coverage
npm run build
```

`npm run test:ci` runs the complete test suite once and keeps the enforcement threshold at 90% global statement, branch, function, and line coverage. The maintained suite targets more than 95% in every global metric. The HTML coverage report is written to `frontend/coverage/`.
