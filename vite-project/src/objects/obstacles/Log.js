import Obstacle from "./Obstacle";

export default class Log extends Obstacle {
  constructor(scene, x, y) {
    super(scene, x, y, "log");

    this.scrollSpeed = Phaser.Math.FloatBetween(0.15, 0.3);

    if (Math.random() < 0.5) {
      this.setFlipX(true);
    }

    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.setScale(2);
    this.body.setSize(this.width * 0.6, this.height * 0.6);
    this.body.setOffset(this.width * 0.15, this.height * 0.25);
    this.play("logSpin");
  }

  update(delta) {
    this.y -= this.scrollSpeed * delta;
  }
}
