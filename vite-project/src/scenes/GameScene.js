import Phaser from 'phaser'
import Obstacle from '../objects/Obstacle'
import Rock from '../objects/Rock'

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

    // rock array
    this.rocks = [];
    this.rock = new Rock(this, 400, 1100);
  }

    

  update(time, delta) {
    // scroll water downward
    this.water.tilePositionY += WATER_SCROLL_SPEED * delta;
    this.rock.update(delta)
  }
}

