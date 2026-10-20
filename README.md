# Oddwise Out

**Think odd. Stand out.**

Oddwise Out is a fast, competitive word game for **3–10 players**. Everyone answers the same randomly selected prompt, such as “Name an animal that starts with F.” Familiar answers score less; clever, uncommon answers score more. The host chooses **3–12 questions** before the match.

## Play

1. The host creates a room, chooses the number of questions, and picks a device mode.
2. In **many-device mode**, friends join with a six-character room code or invite link and answer at the same time. In **one-device mode**, the host adds players and passes the device from person to person.
3. Answer before the timer runs out. Answers stay hidden until the reveal.
4. The game automatically scores answers in its curated list. The host reviews valid answers that are not listed and assigns a rarity tier or marks them invalid.
5. The host advances through the randomly shuffled prompts. The highest total score wins.

## Scoring

| Rarity | Base points |
| --- | ---: |
| Common | 20 |
| Unusual | 40 |
| Rare | 65 |
| Legendary | 90 |

A valid answer that no other player gave earns **20 bonus points**. Players can use **Double Down once per match** to double an answer’s base points. An invalid Double Down costs 15 points. Answers are matched without case or punctuation differences. The host makes the final call on unlisted answers.

## Technology

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Neon Postgres for shared room state across devices
- Vercel for the web app and API
- Optimistic version updates to prevent simultaneous submissions from overwriting each other

The support button opens a GCash QR card for optional donations to the creator, Shinpaydoodles.

## Run locally

Use Node.js 20.9 or newer and a Postgres database. Create the room table:

```sql
CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to your pooled Postgres connection string. Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To verify a running local server, run `npm run smoke`; set `GAME_URL` first if it is not on port 3000.

## Deploy

Import this repository into Vercel as a Next.js project. Set the server-side `DATABASE_URL` environment variable, create the table above in your Postgres database, and deploy. Do not expose the database URL as a `NEXT_PUBLIC_` variable.

## Notes

Rarity tiers are a curated party-game mechanic, not a live measure of global answer frequency. Players do not need accounts. Room access uses per-player tokens stored on each device; share invite links only with people you want in the match.
