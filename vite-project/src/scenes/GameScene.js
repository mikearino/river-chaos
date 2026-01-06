import Phaser from 'phaser'
import Obstacle from '../objects/Obstacle'
import Rock from '../objects/Rock'
import Player from '../objects/Player'

const SCREEN_WIDTH = 1280
const SCREEN_HEIGHT = 720

const RIVER_WIDTH = 800
const SHORE_TILE_WIDTH = 32

const SHORE_WIDTH = (SCREEN_WIDTH - RIVER_WIDTH ) / 2

const RIGHT_SHORE_X = SHORE_WIDTH + RIVER_WIDTH
const LEFT_SHORE_X = SHORE_WIDTH - SHORE_TILE_WIDTH

const WATER_X = SCREEN_WIDTH / 2
const WATER_Y = SCREEN_HEIGHT / 2

const WATER_SCROLL_SPEED = 0.2 //pix per ms

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  preload() {
    this.load.image('water', '/assets/images/water.png')
    this.load.image('shore', '/assets/images/shore.png')
    this.load.image('rock', '/assets/images/rock.png')
    this.load.image('tube', '/assets/images/tube.png')
    }
    
  create(){

    //sand/grass bg
    this.cameras.main.setBackgroundColor(0xa8e518);
    //water layer
    this.water = this.add.tileSprite(
        WATER_X,
        WATER_Y,
        800,
        720,
        'water'
    ).setOrigin(0.5, 0.5);

    this.leftshore = this.add.tileSprite(
        LEFT_SHORE_X,
        0,
        SHORE_TILE_WIDTH,
        SCREEN_HEIGHT,
        'shore'
    ).setOrigin(0,0);


     this.rightshore = this.add.tileSprite(
        RIGHT_SHORE_X,
        0,
        SHORE_TILE_WIDTH,
        SCREEN_HEIGHT,
        'shore'
    ).setOrigin(0,0)
    .setFlipX(true);

    //setup inputs
    this.cursors = this.input.keyboard.createCursorKeys();

    // add player
     this.player = new Player(this, 400, 500, 'tube')
     this.player.setScale(1.5)

    // scoring
    this.score = 0;

    // scoring display text
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '32px',
      color: '#000'
    });

    // rock group🤘
    this.rocks = this.physics.add.group();

    // random rock spawner
    this.spawnDelay = 1000;
    this.minSpawnDelay = 300;

    this.spawnRocks = () => {
      const x = Phaser.Math.Between(300, 900);
      const y = 900;
      const rock = new Rock(this, x, y);
      this.rocks.add(rock);
    };

    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: this.spawnRocks
    })

    // collision detection
    this.physics.add.collider(this.player, this.rocks, () =>{
      console.log('hit a rock!');
      this.scene.restart();
    })
  }

  update(time, delta) {
    //update player
    this.player.update(this.cursors, delta)


    // scroll water upward
    this.water.tilePositionY += WATER_SCROLL_SPEED * delta;
    
    // scroll rocks upward
    for (let i = this.rocks.getChildren().length - 1; i >= 0; i--) {
      const rock = this.rocks.getChildren()[i];
      rock.update(delta)
        if (rock.y + rock.height < 0) {
        this.score += 1;
        this.scoreText.setText('Score: ' + this.score);

        if (this.score % 5 === 0 && this.spawnDelay > this.minSpawnDelay) {
          this.spawnDelay -= 100;

          this.spawnTimer.remove();

          this.spawnTimer = this.time.addEvent({
            delay: this.spawnDelay,
            loop: true,
            callback: this.spawnRocks
          })
        }

        rock.destroy();
        this.rocks.remove(rock, true, true);
      }
    }
  }
}

