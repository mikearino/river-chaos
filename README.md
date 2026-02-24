# River Chaos

**River Chaos** is a fast paced browser arcade game built with Phaser.js.  
Navigate a treacherous river, dodge obstacles and survive as long as possible.

🕹️ **Play Now:**  
https://d1vskmi94pi261.cloudfront.net

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
- MySQL (connection pooling with mysql2)

### Infrastructure

- AWS S3 (static hosting)
- AWS CloudFront (CDN)
- Local MySQL (planned migration to AWS RDS)

---

## Gameplay

- Use arrow keys to steer the rowboat.
- Survive as long as possible.
- Score increases as obstacles pass.
- Submit your initials to the leaderboard when the run ends.
- Persistent leaderboard powered by a backend API and MySQL.

---

## API Overview

### GET `/api/leaderboard`

Returns the top runs sorted by score (highest first).

Optional query parameter:

`/api/leaderboard?limit=10`

---

### POST `/api/runs`

Creates a new run entry.

Example payload:

```json
{
  "playerId": "uuid",
  "initials": "AAA",
  "score": 25,
  "durationMs": 14763
}
```

---

### Database Schema

Table: runs

id (UUID, primary key)

player_id (string)

initials (char(3))

score (int)

duration_ms (int)

created_at (timestamp)

### Local Development

#### Client

    cd client
    npm install
    npm run dev

#### Server

    cd server
    npm install
    node index.js

Server runs on:

http://localhost:3000
