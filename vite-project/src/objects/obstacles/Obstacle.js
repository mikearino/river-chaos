export default class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, flip = false) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0, 0);

    this.scrollSpeed = Phaser.Math.FloatBetween(0.15, 0.3);
    this.attachedTo = null;

    if (flip) {
      this.setFlipX(true);
    }
  }

  update(delta) {
    if (this.attachedTo && this.attachedTo.active) {
      //follow the rock
      this.y = this.attachedTo.y;
    } else {
      //move independently
      this.y -= this.scrollSpeed * delta;
    }
  }
}
