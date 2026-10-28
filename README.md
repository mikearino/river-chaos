# River Chaos

A full-stack browser arcade game: steer a rowboat through rocks and logs, survive the current, and submit your score to a persistent leaderboard.

**[Play River Chaos](https://www.riverchaos.com)** · Desktop keyboard controls

The project combines a Phaser game with a Node.js/Express API, MySQL persistence, and an AWS deployment architecture. Backend engineering includes parameterized SQL, input validation, request limits, verified database TLS, and proxy-aware client identification.

## Architecture

```text
Browser
  ├─ HTTPS → CloudFront → S3: Vite-built game and assets
  └─ HTTPS → CloudFront → Elastic Beanstalk (single instance)
                           └─ nginx → Express → MySQL on RDS
                                                verified TLS
```

The frontend uses a configurable API URL. Express separates HTTP routes from database services, while `mysql2` provides connection pooling. The documented backend target is Node.js 24 on Amazon Linux 2023, with nginx forwarding to Express on port 8080. AWS resources are not provisioned by this repository; deployment requirements are documented in [server/DEPLOYMENT.md](server/DEPLOYMENT.md).

## Tech stack

| Layer | Technologies |
| --- | --- |
| Game client | JavaScript ES modules, Phaser 3, Arcade Physics, Vite, HTML/CSS |
| API | Node.js, Express 5, express-rate-limit |
| Persistence | MySQL, mysql2 connection pooling, UUID run identifiers |
| Hosting | Amazon S3, CloudFront, Elastic Beanstalk, RDS MySQL |
| Verification | Node.js test runner, Python unittest, local TLS fixtures, optional nginx integration tests |

## Gameplay and presentation

- **Controls:** Space starts; Left/Right steer and Up rows against the downward drift. Enter submits three-letter initials after a run; Space returns to the start screen afterward.
- **Survival:** Five hearts, collision knockback, flashing damage feedback, and a temporary collision cooldown. Losing all hearts or leaving the screen vertically ends the run.
- **Obstacles:** Random rocks drawn from 12 sprite variations, spinning logs, and occasional bursts. Spawn intervals shorten and burst size increases as the score rises. Each obstacle that passes offscreen adds a point.
- **Animation:** Scrolling water, a rocking boat, slow/fast rowing, and waving grass with randomized animation phases and periodically changing wind speed.
- **Dynamic grass colors:** The banks advance through a tint palette every 50 points, retaining the final color at higher scores.
- **Audio and scores:** Scene-specific music and collision sounds; the start screen cycles between instructions and high scores. Anonymous player UUIDs persist in localStorage, and failed score submissions can be retried.

## API and database

| Endpoint | Behavior |
| --- | --- |
| `POST /api/runs` | Saves a run and returns its generated ID with HTTP `201`. |
| `GET /api/leaderboard?limit=10` | Returns each player's best score, preferring the earliest run on a score tie. Limit defaults to 10 and accepts 1–50. |
| `GET /api/players/:playerId/stats` | Returns run count, best/average score, and total playtime. |
| `GET /health` | Checks HTTP-server availability; does not check database connectivity. |

Run submissions contain `playerId` (UUID v4), `initials` (three ASCII letters), `score` (nonnegative integer), and `durationMs` (positive finite number). Scores and durations are bounded to the signed MySQL INT range; initials are uppercased and fractional durations rounded before storage.

Parameterized queries operate on an existing `runs` table with `id`, `player_id`, `initials`, `score`, `duration_ms`, and `created_at` columns. The repository does not include database creation scripts or migrations.

## Security measures and limits

- Separate per-IP budgets: **10 submissions/minute** and **120 leaderboard/statistics reads/minute**, including invalid requests. Excess requests return `429` with retry information.
- A **2 KiB JSON body limit**, strict field/query validation, explicit client-error responses, and generic server-error responses. Dependency fixes include body-parser 2.4.0 and proxy-addr 2.0.8.
- Remote database connections require **TLS 1.2 or later**, certificate-chain verification against the bundled official AWS RDS CA certificates, and hostname verification, without plaintext fallback.
- Beanstalk prebuild hooks validate official AWS `CLOUDFRONT_ORIGIN_FACING` ranges and generate nginx real-IP configuration. Express trusts only the immediate IPv4 loopback nginx hop; deploy the API and nginx changes together.
- Credentials come from environment variables; `.env*` files are ignored by Git.

Counters are process-local and reset on restart. Anonymous IDs are not authentication, and submitted scores are not server-verified gameplay. CloudFront trust ranges refresh during deployments and require periodic review. These measures describe the implementation, not an independent assessment of the running AWS configuration.

## Local development

Use **Node.js 24**, npm, and local MySQL. Create the application database and `runs` table first; there is no automatic schema setup.

Create an untracked `server/.env` with your local credentials:

```dotenv
DB_HOST=localhost
DB_USER=your_local_database_user
DB_PASSWORD=your_local_database_password
DB_NAME=your_database_name
NODE_ENV=development
PORT=3000
```

Start the API:

```bash
cd server
npm ci
npm start
```

In a second terminal, create `client/.env` containing `VITE_API_URL=http://localhost:3000/api`, then run:

```bash
cd client
npm ci
npm run dev
```

Open the URL printed by Vite. Only non-production loopback database connections may use plaintext; connecting to RDS locally still requires verified TLS. `VITE_*` values are public frontend configuration and must not contain secrets.

## Tests and deployment

Run `cd server && npm test` for API validation, rate limiting, compressed-body regressions, TLS handshakes, and CloudFront configuration generation tests. Python 3 and OpenSSL are required. The native nginx integration test requires Linux with nginx and is skipped elsewhere. Tests use mocked services and local servers, without connecting to RDS.

- **Frontend:** Run `npm run build` in `client/`; publish `client/dist/` to the S3 origin served by CloudFront. The API URL is set at build time.
- **Backend:** Package the contents of `server/` with `package.json` and `index.js` at the ZIP root. Include the complete `.platform/` directory, database modules, and `certs/global-bundle.pem`; exclude `.env`, `node_modules`, tests, and local artifacts. Beanstalk installs dependencies and runs `npm start` using its supplied `PORT`.
- **Configuration:** Set `NODE_ENV=production` and `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Use the exact RDS DNS endpoint. Prebuild hooks require Python 3 and outbound verified HTTPS to AWS's public IP-range feed; download or validation failures abort deployment.

See the [backend deployment guide](server/DEPLOYMENT.md) for proxy assumptions, TLS requirements, range maintenance, and post-deployment checks. Changing GitHub source alone does not deploy the application.
