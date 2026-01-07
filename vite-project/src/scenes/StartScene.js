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

    this.add
      .text(640, 300, "River Chaos", { fontSize: "64px", color: "#000" })
      .setOrigin(0.5);
    const prompt = this.add
      .text(640, 400, "Press SPACE to start", {
        fontSize: "32px",
        color: "#000",
      })
      .setOrigin(0.5);
    this.add
      .text(640, 355, "Use the Arrow Keys to Play", {
        fontSize: "32px",
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
        this.sound.remove(this.bgm);
      }
      this.scene.start("GameScene");
    });
  }
}
