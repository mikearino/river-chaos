const express = require("express");
const { rateLimit } = require("express-rate-limit");

// Existing database columns are signed INTs. Durations from Phaser can be fractional.
const MAX_INT = 2147483647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isPlayerId = (value) => typeof value === "string" && value.length === 36 && UUID.test(value);

function createRouter(runService, { windowMs = 60_000, submissionLimit = 10, readLimit = 120 } = {}) {
  const router = express.Router();
  const makeLimiter = (limit) => rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
  const submissionLimiter = makeLimiter(submissionLimit);
  const readLimiter = makeLimiter(readLimit);

  router.get("/leaderboard", readLimiter, async (req, res) => {
    const rawLimit = req.query.limit;
    if (Object.keys(req.query).some((key) => key !== "limit") ||
        (rawLimit !== undefined &&
          (typeof rawLimit !== "string" || !/^[1-9][0-9]?$/.test(rawLimit) ||
            String(Number(rawLimit)) !== rawLimit || Number(rawLimit) > 50))) {
      return res.status(400).json({ error: "limit must be an integer from 1 to 50" });
    }
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);
    try {
      res.json(await runService.getLeaderboard(limit));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Stats share the read budget so this database read cannot bypass it.
  router.get("/players/:playerId/stats", readLimiter, async (req, res) => {
    const { playerId } = req.params;
    if (!isPlayerId(playerId)) {
      return res.status(400).json({ error: "Invalid player ID" });
    }
    try {
      res.json(await runService.getPlayerStats(playerId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Limit before parsing so malformed submissions also consume the write budget.
  router.post("/runs", submissionLimiter, express.json({ limit: "2kb" }), async (req, res) => {
    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid run data" });
    }
    const { playerId, initials, score, durationMs } = req.body;
    if (!isPlayerId(playerId) ||
        !Number.isSafeInteger(score) || score < 0 || score > MAX_INT ||
        !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_INT) {
      return res.status(400).json({ error: "Invalid run data" });
    }
    if (typeof initials !== "string" || initials.length !== 3 || !/^[a-zA-Z]{3}$/.test(initials)) {
      return res.status(400).json({ error: "Invalid initials format" });
    }
    try {
      const id = await runService.createRun({
        playerId,
        initials: initials.toUpperCase(),
        score,
        durationMs: Math.max(1, Math.round(durationMs)),
      });
      return res.status(201).json({ id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = createRouter;
