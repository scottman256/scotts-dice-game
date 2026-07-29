# Scott's Dice Game

React + Vite dice game with a guest entry flow, optional Google/Facebook authentication, held dice, category scoring, bonus rolls, five visual themes, and a complete scorecard.

## Run locally

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Guest mode works immediately. Google and Facebook buttons remain disabled until Firebase is configured.

Use the gear button in the game navbar to switch between Classic, Rainbow, Fire, Beach, and Sky. The active game stays mounted while settings is open, and appearance returns to Classic when the session returns to sign-in.

## Enable Google and Facebook sign-in

The app uses the modular Firebase Authentication SDK. No Java backend is required for this phase.

1. Create a [Firebase project](https://console.firebase.google.com/) and register a Web app.
2. In Firebase Authentication, enable the Google and Facebook sign-in providers.
3. For Facebook, enter the Facebook App ID and App Secret in Firebase—not in this repository—and add Firebase's OAuth redirect URI to the Facebook app.
4. Add `localhost` and each deployed hostname to Firebase Authentication's authorized domains.
5. Copy `.env.example` to `.env.local`, replace the placeholder Firebase Web configuration, and restart Vite.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Only the public Firebase Web configuration belongs in `VITE_FIREBASE_*` variables. Never add a Facebook App Secret or Firebase service-account key to a Vite environment file.

When the Java backend is added, retrieve the signed-in user's Firebase ID token through the auth service, send it to the backend over HTTPS, and verify it with the Firebase Admin SDK before trusting the user identity.

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

`npm run test:ci` runs the complete suite once with enforced coverage thresholds.
