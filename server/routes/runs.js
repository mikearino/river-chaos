const express = require("express");
const router = express.Router();
const runService = require("../services/runService");

// GET /api/leaderboard
// Returns top runs sorted by score (highest first).
router.get("/leaderboard", async (req, res) => {
  try {
    // Parse limit from query and cap it to prevent large leaderboard queries
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(limit, 50);

    const leaderboard = await runService.getLeaderboard(limit);

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//GET /api/playerstats
//Returns stats for a specific player
router.get("/players/:playerId/stats", async (req, res) => {
  try {
    const { playerId } = req.params;

    const playerstats = await runService.getPlayerStas(playerId);

    res.json(playerstats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/runs
// Creates a new run entry
router.post("/runs", async (req, res) => {
  try {
    const { playerId, initials, score, durationMs } = req.body;

    //Basic Validation
    if (
      !playerId ||
      typeof initials !== "string" ||
      initials.length !== 3 ||
      typeof score !== "number" ||
      score < 0 ||
      typeof durationMs !== "number" ||
      durationMs <= 0
    ) {
      return res.status(400).json({ error: "Invalid run data" });
    }

    const id = await runService.createRun({
      playerId,
      initials,
      score,
      durationMs,
    });

    return res.status(201).json({ id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
