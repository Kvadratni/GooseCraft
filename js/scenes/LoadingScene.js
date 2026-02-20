// Loading Scene - Shown between Menu and Game while map is generated

export default class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    init(data) {
        // Store the configuration payload to pass to GameScene
        this.gameConfig = data || {};
    }

    create() {
        console.log('LoadingScene: Displaying loading screen...');

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background color
        this.cameras.main.setBackgroundColor('#6BA965');

        // Loading text
        this.loadingText = this.add.text(width / 2, height / 2 + 120, 'Generating World...', {
            fontSize: '32px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // Add a bouncing ellipsis animation to the text
        this.ellipsisCount = 0;
        this.time.addEvent({
            delay: 400,
            callback: () => {
                this.ellipsisCount = (this.ellipsisCount + 1) % 4;
                const dots = '.'.repeat(this.ellipsisCount);
                this.loadingText.setText(`Generating World${dots}`);
            },
            loop: true
        });

        // Bouncing/Walking Goose Sprite
        // Assuming 'builder' sprite is loaded from SplashScene
        if (this.textures.exists('builder')) {
            this.gooseSprite = this.add.sprite(width / 2, height / 2 - 80, 'builder');
            this.gooseSprite.setScale(0.4); // Keep it normal size

            // Simple procedural waddle animation using a tween
            this.tweens.add({
                targets: this.gooseSprite,
                y: this.gooseSprite.y - 15, // Bob up
                angle: 10, // Wobble right
                duration: 150,
                yoyo: true,
                repeat: -1,
                onYoyo: () => { this.gooseSprite.angle = -10; }, // Wobble left on way down
            });
        }

        // Yield to the browser render loop so the loading screen appears immediately
        // If we transition to GameScene immediately, its create() method blocks the thread 
        // and the LoadingScene never gets painted to the screen.
        this.time.delayedCall(500, () => {
            // Start GameScene in background
            this.scene.start('GameScene', this.gameConfig);
            this.scene.launch('UIScene');
        });
    }
}
