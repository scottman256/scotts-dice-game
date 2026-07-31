# Scott's Dice Game frontend

React + Vite dice game with held dice, category scoring, bonus rolls, sixteen visual themes, guest play, username accounts, optional Google/Facebook authentication, resumable games, saved high scores, and personal/global leaderboards.

## Run locally

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Run the Spring Boot service described in the [root README](../README.md) to enable accounts, saved progress, themes, and scores. Signed-in progress is saved after game changes and can be continued on the next sign-in. If the backend is unavailable, the app seamlessly presents Guest mode only; guest games remain local and never call protected APIs.

Use the gear button during a game to switch among themes such as Classic, Vegas, Cosmic Galaxy, Clockwork, Baseball, and World Traveler. The active game stays mounted while settings is open, and appearance returns to Classic when the session returns to sign-in.

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

`npm run test:ci` runs the complete test suite once with coverage thresholds enforced.
