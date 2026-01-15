// Menu Scene - Main Menu

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a3a1a).setOrigin(0);

    // Title
    const title = this.add.text(width / 2, height / 3, 'GooseCraft', {
      fontSize: '72px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 3 + 70, 'Isometric RTS', {
      fontSize: '24px',
      fill: '#aaaaaa',
      fontFamily: 'Arial'
    });
    subtitle.setOrigin(0.5);

    // New Game Button
    const newGameButton = this.createButton(
      width / 2,
      height / 2 + 50,
      'New Game',
      () => this.startNewGame()
    );

    // Load Game Button (disabled for now)
    const loadGameButton = this.createButton(
      width / 2,
      height / 2 + 120,
      'Load Game (Coming Soon)',
      null,
      true
    );

    // Instructions
    const instructions = this.add.text(width / 2, height - 80,
      'WASD or Arrow Keys: Pan Camera | Mouse Wheel: Zoom | Right Click: Move Units', {
      fontSize: '14px',
      fill: '#888888',
      fontFamily: 'Arial',
      align: 'center'
    });
    instructions.setOrigin(0.5);

    console.log('MenuScene: Ready');
  }

  createButton(x, y, text, onClick, disabled = false) {
    // Button background
    const bg = this.add.rectangle(x, y, 300, 50, disabled ? 0x555555 : 0x4CAF50);
    bg.setStrokeStyle(2, 0xffffff);

    // Button text
    const buttonText = this.add.text(x, y, text, {
      fontSize: '20px',
      fill: disabled ? '#999999' : '#ffffff',
      fontFamily: 'Arial'
    });
    buttonText.setOrigin(0.5);

    if (!disabled && onClick) {
      // Make interactive
      bg.setInteractive({ useHandCursor: true });

      // Hover effects
      bg.on('pointerover', () => {
        bg.setFillStyle(0x66BB6A);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x4CAF50);
      });

      bg.on('pointerdown', () => {
        bg.setFillStyle(0x388E3C);
      });

      bg.on('pointerup', () => {
        bg.setFillStyle(0x66BB6A);
        onClick();
      });
    }

    return { bg, text: buttonText };
  }

  startNewGame() {
    console.log('MenuScene: Starting new game...');

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Stop this scene and start GameScene
      this.scene.stop('MenuScene');
      this.scene.start('GameScene');
      // Also start UIScene in parallel
      this.scene.launch('UIScene');
    });
  }
}
