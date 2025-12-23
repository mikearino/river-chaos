import Obstacle from "./Obstacle";

export default class Rock extends Obstacle {
    constructor(scene, x, y) {
        super(scene, x, y, 'rock')
    
    scene.physics.add.existing(this);
    this.setImmovable(true);
    }
}