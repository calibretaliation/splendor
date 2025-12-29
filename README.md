<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1wbuDwG9gX_gh4bRFn073Zo1ZLNoVNkHC

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Add `VITE_NEON_DATABASE_URL` to [.env.local](.env.local) with your Neon connection string (e.g. `postgres://<user>:<password>@<host>/<db>?sslmode=require`).
4. Run the app:
   `npm run dev`

## Multiplayer storage (Neon)

Cosmic Splendor now uses Neon/Postgres to synchronize lobbies and live games. Provision a Neon database and run the table bootstrap once:

```sql
CREATE TABLE IF NOT EXISTS cosmic_rooms (
  room_code TEXT PRIMARY KEY,
  lobby_snapshot JSONB NOT NULL,
  game_state JSONB,
  status TEXT NOT NULL DEFAULT 'LOBBY',
  host_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Every client shares the same `VITE_NEON_DATABASE_URL`. Host devices initialize rooms and push game updates; other devices subscribe via periodic fetches. If the environment variable is missing, the lobby stays offline-only.
