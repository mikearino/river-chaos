import Obstacle from "./Obstacle";

export default class Log extends Obstacle {
  constructor(scene, x, y) {
    super(scene, x, y, "log");

    // logs move slower than rocks
    this.scrollSpeed = Phaser.Math.FloatBetween(0.12, 0.18);

    if (Math.random() < 0.5) {
      this.setFlipX(true);
    }

    this.setScale(2);
    this.body.setSize(this.width * 0.6, this.height * 0.6);
    this.body.setOffset(this.width * 0.15, this.height * 0.25);

    this.play("logSpin");
    this.setDepth(1);
  }
}
