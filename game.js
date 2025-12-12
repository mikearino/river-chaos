const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#222222',

    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

function preload() {
   // not yet
}

function create(){
    console.log("Phaser scene created")
}

function update(time, delta) {
    // nothing yet
}