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
    this.load.image('water', '/assets/images/water.png');
    this.load.image('shore', '/assets/images/shore.png');
    this.load.image('rock', '/assets/images/rock.png');
    this.load.spritesheet('rowboat', '/assets/images/boat.png', {frameWidth: 32, frameHeight: 32});
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

    //create animation for player
      this.anims.create({
      key: 'row',
      frames: this.anims.generateFrameNumbers('rowboat', { start: 0, end: 3}),
      frameRate: 8,
      repeat: -1
     });

    // add player
     this.player = new Player(this, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'rowboat')
     this.player.play('row')
     this.player.setScale(1.5)

    // scoring
    this.score = 0;

    // scoring display text
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '32px',
      color: '#000'
    });

    // health text
    this.healthText = this.add.text(20, 60, 'Lives: 5', {
      fontSize: '32px',
      color: '#000'
    });


    // rock group🤘
    this.rocks = this.physics.add.group();

    // random rock spawner
    this.spawnDelay = 1000;
    this.minSpawnDelay = 300;

    this.spawnRocks = () => {
      const burstChance = 0.2;
      const isBurst = Math.random() < burstChance;
      const rocksToSpawn = isBurst ? Phaser.Math.Between(2, 3) : 1;

      for (let i = 0; i < rocksToSpawn; i++ ) {
        const x = Phaser.Math.Between(300, 900);
        const y = 900;
        const rock = new Rock(this, x, y);
        this.rocks.add(rock);
      }
    }

    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: this.spawnRocks
    })

    // collision detection
    this.physics.add.collider(this.player, this.rocks, (player, rock) => {
      if (player.hitCooldown) return;
      
        player.health -= 1;
        player.hitCooldown = true;

        this.healthText.setText('Lives: ' + player.health);

        //knockback on collision
        const knockbackX = player.x < rock.x ? -200 : 200;
        const knockbackY = -450;
        player.body.setVelocity(knockbackX, knockbackY);

        //flash effect
        this.tweens.add({
          targets: player,
          alpha: 0.3,
          yoyo: true,
          repeat: 5,
          duration: 100
        });

        //Disable player collision for 1 sec
        player.body.checkCollision.none = true;

        // Brief invulnerability
        this.time.delayedCall(1000, () => {
          player.hitCooldown = false;
          player.setAlpha(1);
          player.body.setVelocity(0, 0);
          player.body.checkCollision.none = false;
        });

        if (player.health <= 0) {
          this.scene.start('GameOverScene', { score: this.score });
        }
      });

  }

  update(time, delta) {

    //update player
    this.player.update(this.cursors, delta)

    // Water boundaries
    const riverLeft = SHORE_WIDTH;
    const riverRight = SHORE_WIDTH + RIVER_WIDTH;

    if (
      this.player.x < riverLeft ||
      this.player.x > riverRight
    ) {
      // Player on shore stop horizontal movement
      this.player.body.setVelocityX(0);
      this.player.x = Phaser.Math.Clamp(this.player.x, riverLeft, riverRight);
    }

    if (
      this.player.y < -this.player.height ||
      this.player.y > SCREEN_HEIGHT + this.player.height
    ) {
      // Off the screen vertically game over
      this.scene.start('GameOverScene', { score: this.score });
    }

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

