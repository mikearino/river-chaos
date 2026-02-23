const express = require("express");
const router = express.Router();
const runService = require("../services/runService");

// GET /api/leaderboard
// Returns top runs sorted by score (highest first).

router.get("/leaderboard", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await runService.getLeaderboard(limit);

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/runs
// Creates a new run entry
router.post("/runs", async (req, res) => {
  try {
    const { playerId, initials, score, durationMS } = req.body;

    //Basic Validation
    if (
      !playerId ||
      typeof initials !== "string" ||
      initials.length !== 3 ||
      typeof score !== "number" ||
      score < 0 ||
      typeof durationMs !== "number" ||
      durationMS <= 0
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
    return res.status(500).jsone({ error: "Internal server error" });
  }
});

module.exports = router;
