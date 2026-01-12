export default class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor (scene, x, y, textureKey, flip = false) {
    super(scene, x, y, textureKey)
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0,0);

    if (flip) {
      this.setFlipX(true);
    }
  }
  update(delta) {
    this.y -= 0.2 * delta
  }
}