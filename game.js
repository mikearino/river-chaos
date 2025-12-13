const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);



function preload() {
    this.load.image('water', 'assets/images/water.png')
};

function create(){
    const centerX = this.sys.game.config.width / 2;
    const centerY = this.sys.game.config.height / 2;

    //sand/grass bg
    this.cameras.main.setBackgroundColor(0xa8e518);

    //water layer
    water = this.add.tileSprite(
        centerX,
        centerY,
        800,
        720,
        'water'
    ).setOrigin(0.5, 0.5)
}

function update(time, delta) {
    // scroll water downward
    water.tilePositionY += 0.2 * delta;
}