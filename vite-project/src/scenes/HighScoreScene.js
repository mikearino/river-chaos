import Phaser from "phaser";
import { saveScore, getHighscore } from "../utils/scoreService";

export default class highScoreScene extends Phaser.Scene {
  constructor() {
    super("HighScoreScene");
  }

  init(data) {
    this.currentScore = data.score || 0;
    this.highScore = getHighscore();

    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      saveScore(this.highScore);
    }
  }

  create() {
    this.add
      .text(640, 150, "Game Over", {
        fontSize: "48px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.add
      .text(640, 220, `Score: ${this.currentScore}`, {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.add
      .text(640, 270, `High Score: ${this.highScore}`, {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(0.5);

    const restartText = this.add
      .text(640, 340, "Press SPACE to Restart", {
        fontSize: "48px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("StartScene");
    });
  }
}
