import Phaser from "phaser";
import { getHighScores, saveScore } from "../utils/scoreService";

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
  }

  init(data) {
    this.currentScore = data.score || 0;
  }

  async create() {
    this.add
      .text(640, 100, "Enter Initials", {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(0.5);

    //Create DOM input element

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 3;
    input.placeholder = "AAA";
    input.style.position = "absolute";
    input.style.top = "200px";
    input.style.left = "50%";
    input.style.transform = "translateX(-50%)";
    document.body.appendChild(input);

    input.focus();

    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        const initials = input.value.trim().toUpperCase().slice(0, 3);
        if (initials) {
          await saveScore(this.currentScore, initials);
          input.remove(); // cleanup DOM
          this.showLeaderboard(); // go to leaderboard view
        }
      }
    });
  }

  async showLeaderboard() {
    const scores = await getHighScores();

    this.add
      .text(640, 260, "Leaderboard", {
        fontSize: "36px",
        color: "#fff",
      })
      .setOrigin(0.5);

    scores.slice(0, 5).forEach((entry, index) => {
      this.add
        .text(640, 320 + index * 40, `${entry.initials}: ${entry.score}`, {
          fontSize: "28px",
          color: "#fff",
        })
        .setOrigin(0.5);
    });

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("StartScene");
    });

    this.add
      .text(640, 550, "Press SPACE to Restart", {
        fontSize: "24px",
        color: "#fff",
      })
      .setOrigin(0.5);
  }
}
