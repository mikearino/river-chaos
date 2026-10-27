# River Chaos

River Chaos is a fast-paced browser arcade game built with Phaser.js.

🕹️ **Play Now:** [riverchaos.com](https://www.riverchaos.com)

---

## Overview

River Chaos is a full-stack web application where player runs are persisted to a backend and displayed on a global leaderboard.

The project focuses on integrating a real-time game with a production-style backend and cloud deployment.

---

## Tech Stack

### Frontend

- Phaser 3
- Vite
- JavaScript (ES6)
- HTML / CSS

### Backend

- Node.js
- Express
- REST API
- MySQL (RDS)

### Infrastructure

- AWS S3 (static hosting)
- AWS CloudFront (CDN + HTTPS)
- AWS Elastic Beanstalk (API hosting)
- AWS RDS (MySQL database)

---

## Architecture

```txt
Browser (CloudFront)
→ Frontend (S3)
→ API (CloudFront)
→ Express Server (Elastic Beanstalk)
→ MySQL (RDS)
```

---

## Gameplay

- Use arrow keys to steer the rowboat
- Survive as long as possible
- Score increases as obstacles pass
- Submit initials to the leaderboard at the end of a run
- Leaderboard is persisted via backend API

---

## API Overview

### GET `/api/leaderboard`

Returns top runs sorted by score.

Optional:

```txt
/api/leaderboard?limit=10
```

---

### POST `/api/runs`

Creates a new run entry.

```json
{
  "playerId": "uuid",
  "initials": "AAA",
  "score": 25,
  "durationMs": 14763
}
```

---

## Database Schema

**Table: `runs`**

- `id` UUID, primary key
- `player_id` string
- `initials` char(3)
- `score` int
- `duration_ms` int
- `created_at` timestamp

---

## Challenges & Learnings

- Resolving HTTPS / mixed content issues between frontend and backend
- Configuring CloudFront to proxy API requests correctly
- Managing environment variables across development and production
- Designing a leaderboard system based on best score per player

---

## Local Development

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
node index.js
```

Server runs on:

```txt
http://localhost:3000
```


## API request protections

- `POST /api/runs`: 10 requests per minute per IP, including invalid submissions.
- `GET /api/leaderboard` and `GET /api/players/:playerId/stats`: share a budget of 120 requests per minute per IP.
- Excess requests return JSON with HTTP `429`, `Retry-After`, and rate-limit headers. Read and write budgets are independent.
- Runs require a UUID v4 player ID (matching the game's `crypto.randomUUID()`), exactly three ASCII letters for initials, an integer score from 0–2,147,483,647, and a finite duration greater than zero and no greater than 2,147,483,647 milliseconds. Fractional durations are accepted and rounded to the nearest millisecond, with a minimum stored value of 1. Initials are uppercased.
- Leaderboard `limit` defaults to 10 when omitted. If supplied, it must be a decimal integer from 1–50 without leading zeros. Duplicate, bracket-style, and unknown query parameters are rejected.
- Invalid fields or malformed JSON return `400`; JSON bodies over 2 KiB return `413`; unsupported content types/encodings return `415`. Unexpected server failures return a generic `500`.

The limiter uses process-local memory. Restarting resets counters; multiple processes or instances each have independent budgets. Use a shared limiter store for deployment-wide enforcement. IPv6 clients are grouped using the library's default /56 subnet policy.

Express trusts only its immediate IPv4 loopback nginx hop. Beanstalk prebuild hooks generate nginx real-IP configuration from validated official CloudFront origin-facing ranges. Deploy the application and proxy configuration together; see [deployment instructions](server/DEPLOYMENT.md). Clients sharing a public IP share a budget, and distributed attackers can evade per-IP limits.

Validation and rate limiting do not authenticate players or prove scores were earned. Plausible fabricated scores and player impersonation remain possible.

Run API integration tests with `cd server && npm test`. Tests use temporary localhost servers and a mocked service; they do not connect to MySQL or production.

Database TLS behavior, required environment variables, and deployment bundle requirements are documented in [server/DEPLOYMENT.md](server/DEPLOYMENT.md).
