const LOCAL_KEY = "highScore";

export async function saveScore(score) {
  const current = parseInt(localStorage.getItem(LOCAL_KEY) || "0", 10);
  if (score > current) {
    localStorage.setItem(LOCAL_KEY, score);
  }
}

export async function getHighscore(params) {
  return parseInt(localStorage.getItem(LOCAL_KEY) || "0", 10);
}
