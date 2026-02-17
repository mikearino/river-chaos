const LOCAL_KEY = "leaderboard";

export async function saveScore(score, initials) {
  const entry = { score, initials, date: Date.now() };

  const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");

  stored.push(entry);

  const topTen = stored.sort((a, b) => b.score - a.score).slice(0, 10);

  localStorage.setItem(LOCAL_KEY, JSON.stringify(topTen));
}

export async function getHighScores() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
}
