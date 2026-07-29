# Scott's Dice Game

Scott's Dice Game is a modern, full-featured reimagining of a dice game Scott built himself when he first got into coding. This new version was created with ChatGPT 5.6 (Sol), carrying the original idea into a polished contemporary experience.

## The game

Roll five dice, hold the ones you want to keep, and chase scoring combinations to complete the scorecard, earn bonuses, and build the highest total possible.

## Themes

Open the gear-shaped Settings menu during a game to change its theme without losing your progress. Each theme includes its own background and custom dice artwork; examples include Classic, Vegas, Cosmic Galaxy, 60s Tie-Dye, and World Traveler.

## Project structure

This repository is organized as a monorepo so the React frontend and future Java backend can evolve together.

- `frontend/` — the existing React and Vite application
- `backend/` — reserved for the future Java backend

## Run the frontend

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

See [`frontend/README.md`](frontend/README.md) for authentication setup, tests, and other frontend details.

The backend directory intentionally contains no Java project yet. Its `.gitkeep` placeholder allows Git to preserve the empty directory until the backend is created.
