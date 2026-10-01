import Obstacle from "./Obstacle";

export default class Rock extends Obstacle {
  constructor(scene, x, y) {
    super(scene, x, y, `rock${Phaser.Math.Between(1, 12)}`);
    this.setScale(1.25);
    this.scrollSpeed = 0.2;
    this.setImmovable(true);
    this.body.setSize(this.width * 0.7, this.height * 0.7);
    this.body.setOffset(this.width * 0.15, this.height * 0.15);
  }
}
