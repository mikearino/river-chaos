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

// Fetch top runs ordered by highest score
// Use paramaterized query to prevent SQL injection
async function getLeaderboard(limit = 10) {
  const [rows] = await pool.query(
    `
        SELECT initials, score, duration_ms, created_at
        FROM runs
        ORDER BY score DESC
        LIMIT ?
        `,
    [limit],
  );

  return rows;
}

module.exports = {
  createRun,
  getLeaderboard,
};
