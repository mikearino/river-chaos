//Ensures anonymous player has a persistent id in localStorage

export function getOrCreatePlayerId() {
  let playerId = localStorage.getItem("playerId");

  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem("playerId", playerId);
  }

  return playerId;
}
