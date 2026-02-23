// Fetch top runs ordered by highest score
// Use paramaterized query to prevent SQL injection

const pool = require("../db/connection");

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
  getLeaderboard,
};
