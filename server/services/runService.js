const pool = require("../db/connection");
const { v4: uuidv4 } = require("uuid");

//Create a new run and return its generated id
async function createRun({ playerId, initials, score, durationMs }) {
  const id = uuidv4();

  await pool.query(
    `
    INSERT INTO runs (id, player_id, initials, score, duration_ms)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, playerId, initials, score, durationMs],
  );

  return id;
}

// Fetch leaderboard of best run per player.
// If multiple runs share the same top score, the earliest run wins.
// Results ordered by highest score.
// Use paramaterized query to prevent SQL injection
async function getLeaderboard(limit = 10) {
  const [rows] = await pool.query(
    `
    SELECT r.initials, r.score, r.player_id, r.created_at
    FROM runs r
    JOIN (
      SELECT player_id, MAX(score) AS best_score
      FROM runs
      GROUP BY player_id
    ) best
      ON r.player_id = best.player_id
        AND r.score = best.best_score
    WHERE r.created_at = (
      SELECT MIN(created_at)
        FROM runs
        WHERE player_id = r.player_id
        AND score = r.score
    )
    ORDER BY r.score DESC
    LIMIT ?;
    `,
    [limit],
  );

  return rows;
}

async function getPlayerStats(playerId) {
  const [rows] = await pool.query(
    `
    SELECT
        COUNT(*) AS total_runs,
        MAX(score) AS best_score,
        AVG(score) AS average_score,
        SUM(duration_ms) AS total_playtime
    FROM runs
    WHERE player_id = ?
    `,
    [playerId],
  );

  return rows[0];
}

module.exports = {
  createRun,
  getLeaderboard,
  getPlayerStats,
};
