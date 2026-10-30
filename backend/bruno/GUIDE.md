# Bruno API testing guide

This collection covers all 26 application API endpoints. It includes editable JSON bodies, query parameters, response tests, and request-specific **Docs** tabs with prerequisites and validation rules. It uses the existing public health endpoint; no backend behavior changes are required.

## Open and sign in

1. Start the backend from the repository root:

   ```cmd
   cd backend
   gradlew.bat bootRun
   ```

2. In another terminal, copy the example credentials once:

   ```cmd
   cd backend\bruno
   copy .env.example .env
   ```

   If `.env` already exists, edit it rather than overwriting it. The template uses the documented local `test` and `admin` seed accounts. Change their credentials here if your database uses different ones.

3. In Bruno, choose **Open Collection**, select `backend/bruno`, and select the **Local** environment. The URL defaults to `http://localhost:8080`.
4. Send **01 Public / Health check**.
5. Send **02 Authentication / Login player** for player requests and **Login admin** for admin requests. The response scripts capture the tokens automatically; requests inherit authentication from their folders.

Bruno 3.0.2 and its default Safe Mode were used to validate the collection. Opening it in the desktop application does not require Node.js or the CLI.

## Authentication and local secrets

| Requests | Minimum access | Shared authentication |
| --- | --- | --- |
| Health, registration, manual login, Firebase exchange | Anonymous | Explicit no-auth |
| Profile, games, scores, statistics, achievements | Signed-in player | Player folder bearer `{{playerToken}}` |
| User management, score history, theme availability, score administration | Administrator | Admin folder bearer `{{adminToken}}` |
| Access checks | Intentionally missing/insufficient access | No token for the 401 check; player token for the 403 check |

Google and Facebook are sign-in providers, not additional permission roles. Their returned application token is assigned to the player or admin variable according to the account's current role. System leaderboard identities cannot sign in.

Credentials and optional manually supplied tokens belong in **`.env`**, which is Git-ignored. The tracked `environments/Local.bru` contains only references to those secrets and non-secret settings. Additional private environment files can use the ignored `*.local.bru` naming convention. Reports belong under the ignored `reports/` directory; response bodies from login can contain tokens.

Login scripts use `bru.setVar`, so generated tokens stay in memory and are shared within the collection. They do not call `setEnvVar` or write token values into tracked files. Sign in again after restarting Bruno or when a token expires (eight hours by default). Optionally set `DICE_PLAYER_TOKEN` and `DICE_ADMIN_TOKEN` in `.env` to use existing tokens without logging in. If checking the current-profile assertion with an existing token, also set `playerUserId` in Local.

Runtime values take precedence over environment values. To switch to another target account or backend, clear the collection's runtime variables (or reopen Bruno), update the environment, and sign in again. Do not paste real credentials into request bodies or tracked environment files.

Bruno documents the underlying [runtime variable](https://docs.usebruno.com/variables/runtime-variables) and [local dotenv](https://docs.usebruno.com/secrets-management/dotenv-file) behavior.

## Edit and send individual requests

- **Body**: edit the example JSON. Passwords remain references to `.env` values.
- **Params**: edit query parameters; Score History has separate examples for all four sorts, with `historyPage` starting at `0`.
- **Local environment**: set `baseUrl`, `themeId`, or explicit IDs. Do not add bearer tokens here.
- **Docs**: read each request's prerequisites, expected status, and validation criteria.
- **Tests**: checks run after sending. State-dependent checks explain the prerequisite request in Docs.

Useful IDs are captured automatically:

| Variable | Supplied by | Used for |
| --- | --- | --- |
| `playerUserId` | Player login or registration | Profile checks and admin score history |
| `adminUserId` | Admin login | Identifying the acting administrator |
| `managedUserId` | Registration, or explicitly set in Local | Admin role/email/password changes and deletion |
| `gameId` | Save game pre-request script | Saving and reading resumable progress |
| `scoreId` | Submit completed game | Opening that player's completed scorecard |
| `systemScoreId` | Add system leaderboard score | Deleting that example leaderboard entry |

Registration generates a unique username/email when `registrationUsername` and `registrationEmail` are blank. Fill those settings to supply your own data. It signs in the newly created player, replacing `playerToken`, and captures `managedUserId`. The separate admin token is unchanged.

The completed-game example has all 19 category keys and a valid total of **385**: category sum **345**, plus the **40** point bonus for a top subtotal of **118**. A top subtotal of at least 125 also adds 25. Recalculate `score` if you edit the category values. The second example scratches every category for a valid zero-point completed game. These two games let history tests compare different scores and dates.

Submission generates a fresh game UUID each send. To test idempotency, replace the body's `gameId` with a fixed UUID and resend the same body. The saved-game endpoint accepts only incomplete cards (at most 18 categories); completed cards go to `POST /api/scores`.

## Run the complete scenario

Run the collection in numbered order, sequentially, with **Stop on error** enabled. It performs these steps:

1. Checks health and signs in both seed roles.
2. Registers a disposable player for the remaining player requests.
3. Saves/reads/deletes progress, submits two finished games, and reads scorecards, stats, and achievements.
4. Checks 401, 403, and missing-score responses.
5. Reads admin activity/history, updates theme availability, adds/deletes an example leaderboard entry, promotes/demotes the disposable user, changes its email/password, and deletes it.

The workflow writes data and changes a global theme setting. Use a disposable backend for full collection runs. A failed run may leave its test account/data behind; the captured IDs identify them. Individual requests remain available for normal local API work.

**Reset all game data** is skipped unless `allowGameDataReset` is exactly `true`. It clears scores, achievements, and saves for every player, so enable it only against a disposable database. The ordinary scenario does not need it.

**Firebase sign in** is skipped until `.env` has `DICE_FIREBASE_ID_TOKEN`. Successful verification requires a real, fresh Firebase ID token from the configured project and `FIREBASE_PROJECT_ID` on the backend. Local manual-auth testing cannot simulate a successful Google/Facebook identity exchange.

### Optional CLI verification

With Node.js/npm installed, run from `backend/bruno`:

```cmd
npx --yes --package=@usebruno/cli@3.0.2 bru run --env Local --bail
```

For an isolated test backend, use a separate terminal from `backend`:

```cmd
gradlew.bat bootJar
java -jar build\libs\dice-game-backend-1.0.0-SNAPSHOT.jar --server.port=8092 "--spring.datasource.url=jdbc:h2:mem:bruno;DB_CLOSE_DELAY=-1" --spring.h2.console.enabled=false --dice.firebase.project-id=
```

This process uses an in-memory database and does not open `backend/data`. Stop it with Ctrl+C after testing. In another terminal from `backend/bruno`, override only the URL:

```cmd
npx --yes --package=@usebruno/cli@3.0.2 bru run --env Local --env-var baseUrl=http://localhost:8092 --bail
```

To also exercise reset on this disposable instance, add `--env-var allowGameDataReset=true`. Tokens still come from login responses in memory; do not put secrets in command-line arguments. The same collection can run in Bruno by changing Local's `baseUrl` to `http://localhost:8092`, then restoring it afterwards.

## Endpoint inventory

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| GET | `/api/public/status` | Public | 200 |
| POST | `/api/auth/register` | Public | 201 |
| POST | `/api/auth/login` | Public | 200 |
| POST | `/api/auth/firebase` | Public | 200; requires Firebase configuration/token |
| GET | `/api/auth/me` | Player | 200 |
| GET | `/api/game-session` | Player | 200 |
| PUT | `/api/game-session/theme` | Player | 200 |
| PUT | `/api/game-session/game` | Player | 200 |
| DELETE | `/api/game-session/game` | Player | 204 |
| POST | `/api/scores` | Player | 201 |
| GET | `/api/scores/me` | Player | 200 |
| GET | `/api/scores/me/{scoreId}` | Owning player | 200 |
| GET | `/api/scores/leaderboard` | Player | 200 |
| GET | `/api/stats/me` | Player | 200 |
| GET | `/api/achievements/me` | Player | 200 |
| GET | `/api/admin/users` | Admin | 200 |
| GET | `/api/admin/users/{userId}/scores?page=0&sort=newest` | Admin | 200 |
| PUT | `/api/admin/users/{userId}/role` | Admin | 204 |
| PUT | `/api/admin/users/{userId}/email` | Admin | 204 |
| PUT | `/api/admin/users/{userId}/password` | Admin | 204 |
| DELETE | `/api/admin/users/{userId}` | Admin | 204 |
| GET | `/api/admin/themes` | Admin | 200 |
| PUT | `/api/admin/themes/{themeId}` | Admin | 200 |
| POST | `/api/admin/scores` | Admin | 201 |
| DELETE | `/api/admin/scores/{scoreId}` | Admin | 204 |
| POST | `/api/admin/game-data/reset` | Admin | 200; explicit opt-in |

OPTIONS/CORS handling and the development-only H2 console are infrastructure rather than game API requests. Validation errors generally return a problem response with `code` and `detail`; field validation also returns `errors`. Security-filter 401/403 responses may have no JSON body.
