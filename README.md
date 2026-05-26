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
