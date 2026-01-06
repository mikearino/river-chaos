export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalScore = data.score;
    }

    create() {
        this.add.text(640, 300, 'Game Over', { fontSize: '64px', color: '#000'}).setOrigin(0.5)
        this.add.text(640, 400, `Score: ${this.finalScore}`, { fontSize: '32px', color: '#000'}).setOrigin(0.5)
        const prompt = this.add.text(640, 500, 'Press SPACE to restart', { fontSize: '24px', color: '#000'}).setOrigin(0.5)

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