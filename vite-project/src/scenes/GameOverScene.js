export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  preload() {
    this.load.audio("gameOverMusic", "/assets/audio/game-over.mp3");
  }

  init(data) {
    this.finalScore = data.score;
  }

  create() {
    // stop and remove main music if it exists
    const existingMainMusic = this.sound.get("mainBgm");
    if (existingMainMusic) {
      existingMainMusic.stop();
      this.sound.remove(existingMainMusic);
    }

    // remove old game over music if it exists
    const existingGameOverMusic = this.sound.get("gameOverMusic");
    if (existingGameOverMusic) {
      this.sound.remove(existingGameOverMusic);
    }

    // play game over music
    this.bgm = this.sound.add("gameOverMusic", {
      loop: true,
      volume: 0.5,
    });
    this.bgm.play();

    this.add
      .text(640, 300, "Game Over", { fontSize: "64px", color: "#000" })
      .setOrigin(0.5);
    this.add
      .text(640, 400, `Score: ${this.finalScore}`, {
        fontSize: "32px",
        color: "#000",
      })
      .setOrigin(0.5);
    const prompt = this.add
      .text(640, 500, "Press SPACE to restart", {
        fontSize: "24px",
        color: "#000",
      })
      .setOrigin(0.5);

    //toggle vis every 500ms
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        prompt.visible = !prompt.visible;
      },
    });

    this.input.keyboard.once("keydown-SPACE", () => {
      if (this.bgm) {
        this.bgm.stop();
      }
      this.scene.start("GameScene");
    });
  }
}
