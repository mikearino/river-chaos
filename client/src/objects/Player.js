export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, flip = false) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.body.setSize(this.width * 0.5, this.height * 0.5);
    this.body.setOffset(this.width * 0.25, this.height * 0.25);
    this.health = 5;
    this.hitCoolDown = false;

    if (flip) {
      this.setFlipX(true);
    }
  }

  update(cursors, delta) {
    const pull = 200;
    const speed = 0.3 * delta;

    //always drift down
    this.y += pull * (delta / 1000);

    if (cursors.left.isDown) {
      this.x -= speed;
    } else if (cursors.right.isDown) {
      this.x += speed;
    }

    if (cursors.up.isDown) {
      this.y -= speed;
    }
  }
}
