import Obstacle from "./Obstacle";

export default class Rock extends Obstacle {
  constructor(scene, x, y) {
    super(scene, x, y, "rock");

    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.body.setSize(this.width * 0.7, this.height * 0.7);
    this.body.setOffset(this.width * 0.15, this.height * 0.15);
  }
}
