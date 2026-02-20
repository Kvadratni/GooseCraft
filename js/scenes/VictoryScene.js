// Victory Scene - End Game Screen Overlay

export default class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data) {
        // Determine condition (victory or defeat) and stats
        this.isVictory = data.isVictory;
        this.stats = data.stats || {
            duration: '00:00',
            unitsTrained: 0,
            buildingsConstructed: 0,
            resourcesGathered: 0
        };
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dark semi-transparent overlay over the frozen game
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
        overlay.setOrigin(0, 0);
        // Block clicks from passing through to GameScene
        overlay.setInteractive();

        // Title Panel
        const panelY = height / 2 - 100;

        const titleText = this.isVictory ? 'VICTORY!' : 'DEFEAT...';
        const titleColor = this.isVictory ? '#4CAF50' : '#F44336';

        const title = this.add.text(width / 2, panelY - 80, titleText, {
            fontSize: '64px',
            fill: titleColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        });
        title.setOrigin(0.5);

        // Stats Box
        const boxWidth = 400;
        const boxHeight = 250;

        // UI parchment style background
        const statsBg = this.add.graphics();
        statsBg.fillStyle(0xe8dcc7, 1);
        statsBg.fillRoundedRect(width / 2 - boxWidth / 2, panelY - 20, boxWidth, boxHeight, 8);
        statsBg.lineStyle(4, 0x5c4033, 1);
        statsBg.strokeRoundedRect(width / 2 - boxWidth / 2, panelY - 20, boxWidth, boxHeight, 8);

        // Stats Text
        const startY = panelY + 10;
        const lineSpacing = 40;
        const textStyle = { fontSize: '24px', fill: '#333333', fontFamily: 'Arial' };
        const valueStyle = { fontSize: '24px', fill: '#000000', fontFamily: 'Arial', fontStyle: 'bold' };

        const addStatLine = (label, value, index) => {
            this.add.text(width / 2 - 150, startY + (index * lineSpacing), label, textStyle).setOrigin(0, 0.5);
            this.add.text(width / 2 + 150, startY + (index * lineSpacing), value, valueStyle).setOrigin(1, 0.5);
        };

        addStatLine('Match Duration:', this.stats.duration, 0);
        addStatLine('Units Trained:', this.stats.unitsTrained.toString(), 1);
        addStatLine('Buildings Built:', this.stats.buildingsConstructed.toString(), 2);
        addStatLine('Resources Gathered:', this.stats.resourcesGathered.toString(), 3);

        // Return to Menu Button
        const btnWidth = 200;
        const btnHeight = 50;
        const btnY = panelY + boxHeight + 60;

        const button = this.add.container(width / 2, btnY);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4a7c59, 1);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        btnBg.lineStyle(2, 0x2d4c37, 1);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

        const btnText = this.add.text(0, 0, 'Return to Menu', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        btnText.setOrigin(0.5);

        button.add([btnBg, btnText]);

        // Make button interactive
        const hitArea = new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
        button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        button.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x5c966e, 1);
            btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            btnBg.lineStyle(2, 0x2d4c37, 1);
            btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            this.game.canvas.style.cursor = 'pointer';
        });

        button.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x4a7c59, 1);
            btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            btnBg.lineStyle(2, 0x2d4c37, 1);
            btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            this.game.canvas.style.cursor = 'default';
        });

        button.on('pointerdown', () => {
            btnBg.clear();
            btnBg.fillStyle(0x3a6045, 1);
            btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            btnBg.lineStyle(2, 0x2d4c37, 1);
            btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        });

        button.on('pointerup', () => {
            this.game.canvas.style.cursor = 'default';
            this.returnToMenu();
        });

        // Fade in animation
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Play appropriate sound
        if (this.game.registry.get('soundManager')) {
            const sm = this.game.registry.get('soundManager');
            sm.stopMusic();
            if (this.isVictory) {
                sm.playSFX('sfx-building-complete'); // temporary stand-in until victory sound exists
            } else {
                sm.playSFX('sfx-weapon-hit'); // temporary stand-in
            }
        }
    }

    returnToMenu() {
        // Stop all active game scenes
        this.scene.stop('GameScene');
        this.scene.stop('UIScene');

        // Start menu
        this.scene.start('MenuScene');
    }
}
