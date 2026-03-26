// Centralized API client for backend communication
// Abstracts fetch calls away from game scenes.
const API_BASE = import.meta.env.VITE_API_URL;

// Fetch runs sorted by score (descending)
export async function getLeaderboard(limit = 10) {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

// Create a new run entry in the backend.
export async function createRun(data) {
  const res = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to save run");

  return res.json();
}
