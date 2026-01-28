import Phaser, { Physics } from "phaser";
import GameScene from "./scenes/GameScene";
import StartScene from "./scenes/StartScene";
import GameOverScene from "./scenes/GameOverScene";
import HighScoreScene from "./scenes/HighScoreScene";

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#a8e518",
  scene: [StartScene, GameScene, GameOverScene, HighScoreScene],
  physics: {
    default: "arcade",
    // arcade: { debug: true },
  },
};

new Phaser.Game(config);
