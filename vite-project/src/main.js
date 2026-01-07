import Phaser, { Physics } from "phaser";
import GameScene from "./scenes/GameScene";
import StartScene from "./scenes/StartScene";
import GameOverScene from "./scenes/GameOverScene";

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#a8e518",
  scene: [StartScene, GameScene, GameOverScene],
  physics: {
    default: "arcade",
    arcade: { debug: true },
  },
};

new Phaser.Game(config);
