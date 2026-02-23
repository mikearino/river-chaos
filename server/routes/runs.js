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

module.exports = router;
