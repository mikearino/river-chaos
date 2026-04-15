import { getLeaderboard } from "../api/api";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.audio("startMusic", "/assets/audio/start-screen.mp3");
  }

  create() {
    //stop leftover music (safety)
    const mainMusic = this.sound.get("mainBgm");
    if (mainMusic) {
      mainMusic.stop();
      this.sound.remove(mainMusic);
    }

    const gameOverMusic = this.sound.get("gameOverMusic");
    if (gameOverMusic) {
      gameOverMusic.stop();
      this.sound.remove(gameOverMusic);
    }

    // remove existing start music to avoid overlap
    const existingStart = this.sound.get("startMusic");
    if (existingStart) {
      this.sound.remove(existingStart);
    }

    // play start screen music
    this.bgm = this.sound.add("startMusic", { loop: true, volume: 0.5 });
    this.bgm.play();

    // store objects to hide them later
    this.titleText = this.add
      .text(640, 300, "River Chaos", { fontSize: "64px", color: "#000" })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(640, 400, "Press SPACE to start", {
        fontSize: "32px",
        color: "#000",
      })
      .setOrigin(0.5);
    this.insructionsText = this.add
      .text(640, 355, "Use the Arrow Keys to Play", {
        fontSize: "32px",
        color: "#000",
      })
      .setOrigin(0.5);

    //toggle vis every 500ms
    this.blinkEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.promptText.visible = !this.promptText.visible;
      },
    });

    this.startTexts = [this.titleText, this.promptText, this.insructionsText];

    this.input.keyboard.once("keydown-SPACE", () => {
      if (this.bgm) {
        this.bgm.stop();
        this.sound.remove(this.bgm);
      }
      this.scene.start("GameScene");
    });

    this.time.delayedCall(2000, () => {
      this.hideStartText();
      this.loadAndCycle();
    });

    getLeaderboard()
      .then((data) => {
        console.log("Leaderboard:", data);
      })
      .catch((err) => {
        console.error("API error:", err);
      });
  }

  hideStartText() {
    this.startTexts.forEach((t) => t.setVisible(false));
    this.blinkEvent.paused = true;
  }

  showStartText() {
    this.startTexts.forEach((t) => t.setVisible(true));
    this.blinkEvent.paused = false;
  }

  hideScoreText() {
    if (!this.scoreTexts) return;
    this.scoreTexts.forEach((t) => t.destroy());
    this.scoreTexts = [];
  }

  showScoreText() {
    this.scoreTexts.forEach((t) => t.setVisible(true));
  }

  async showHighScores() {
    const scores = await getLeaderboard();

    //clear when toggled
    this.scoreTexts = [];

    this.scoreTexts.push(
      this.add
        .text(640, 260, "High Scores", {
          fontSize: "36px",
          color: "#fff",
        })
        .setOrigin(0.5),
    );

    scores.slice(0, 5).forEach((entry, index) => {
      const scoreText = this.add
        .text(640, 320 + index * 40, `${entry.initials}: ${entry.score}`, {
          fontSize: "28px",
          color: "#fff",
        })
        .setOrigin(0.5);
      this.scoreTexts.push(scoreText);
    });

    this.showScoreText();

    //schedule back to the start
    this.time.delayedCall(3000, () => {
      this.hideScoreText();
      this.showStartText();
    });
  }

  async loadAndCycle() {
    await this.showHighScores();

    //wait 3 secs, go back to start text
    this.time.delayedCall(3000, () => {
      this.hideScoreText();
      this.showStartText();

      //wait another 3 secs and cycle again
      this.time.delayedCall(3000, () => {
        this.hideStartText();
        this.loadAndCycle();
      });
    });
  }
}
