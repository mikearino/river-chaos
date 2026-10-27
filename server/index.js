require("dotenv").config();
const express = require("express");
const cors = require("cors");
const createRouter = require("./routes/runs");

function createApp({ runService, rateLimits } = {}) {
  const app = express();
  // nginx resolves CloudFront real-IP and appends it as the rightmost XFF entry.
  app.set("trust proxy", (ip, hop) => hop === 0 &&
    (ip === "127.0.0.1" || ip === "::ffff:127.0.0.1"));
  app.use(cors());
  app.use("/api", createRouter(runService || require("./services/runService"), rateLimits));
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use((error, req, res, next) => {
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large" });
    }
    if (error.type === "entity.parse.failed" ||
        (error.status === 400 && ["Z_DATA_ERROR", "Z_BUF_ERROR"].includes(error.code))) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
      return res.status(415).json({ error: "Unsupported JSON encoding" });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  });
  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  createApp().listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { createApp };
