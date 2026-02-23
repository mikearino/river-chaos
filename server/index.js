require("dotenv").config();
const express = require("express");
const cors = require("cors");
const runRoutes = require("./routes/runs");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", runRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
