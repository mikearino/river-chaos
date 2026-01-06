export default class StartScene extends Phaser.Scene {
    constructor() {
    super('StartScene');
}

create() {
    this.add.text(640, 300, 'River Chaos', { fontSize: '64px', color: '#000'}).setOrigin(0.5);
    const prompt = this.add.text(640, 400, 'Press SPACE to start', { fontSize: '32px', color: '#000'}).setOrigin(0.5);
    this.add.text(640, 355, 'Use the Arrow Keys to Play', { fontSize: '32px', color: '#000'}).setOrigin(0.5);

    //toggle vis every 500ms
    this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
            prompt.visible = !prompt.visible
        }
    });

    this.input.keyboard.once('keydown-SPACE', () => {
        this.scene.start('GameScene')
    })
  }
}