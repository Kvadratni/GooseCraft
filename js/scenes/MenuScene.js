// Menu Scene - Main Menu

import SoundManager from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Initialize sound manager (don't play music yet due to browser autoplay restrictions)
    this.soundManager = new SoundManager(this);
    this.musicStarted = false;

    // Background image (contains title)
    const bg = this.add.image(width / 2, height / 2, 'menu-background');
    bg.setDisplaySize(width, height);

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
    const buttonWidth = 400;
    const buttonHeight = 80;
    const cornerRadius = 20;

    // Create container for all button elements
    const container = this.add.container(x, y);

    // Outer border (brown/tan)
    const outerBorder = this.add.graphics();
    outerBorder.fillStyle(disabled ? 0x555555 : 0xB8956A, 1);
    outerBorder.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);
    container.add(outerBorder);

    // Inner border (darker brown)
    const innerBorder = this.add.graphics();
    const borderThickness = 8;
    innerBorder.fillStyle(disabled ? 0x333333 : 0x6B4423, 1);
    innerBorder.fillRoundedRect(
      -buttonWidth / 2 + borderThickness,
      -buttonHeight / 2 + borderThickness,
      buttonWidth - borderThickness * 2,
      buttonHeight - borderThickness * 2,
      cornerRadius - 4
    );
    container.add(innerBorder);

    // Green fill
    const fillGraphics = this.add.graphics();
    const fillPadding = 14;
    fillGraphics.fillStyle(disabled ? 0x666666 : 0x6BA965, 1);
    fillGraphics.fillRoundedRect(
      -buttonWidth / 2 + fillPadding,
      -buttonHeight / 2 + fillPadding,
      buttonWidth - fillPadding * 2,
      buttonHeight - fillPadding * 2,
      cornerRadius - 8
    );
    container.add(fillGraphics);

    // Button text with stroke
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '32px',
      fill: disabled ? '#999999' : '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    });
    buttonText.setOrigin(0.5);
    container.add(buttonText);

    if (!disabled && onClick) {
      // Create invisible interactive area
      const hitArea = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xffffff, 0);
      hitArea.setInteractive({ useHandCursor: true });
      container.add(hitArea);

      // Store original colors
      const normalFill = 0x6BA965;
      const hoverFill = 0x7DBB77;
      const pressFill = 0x5A8E55;

      // Hover effects
      hitArea.on('pointerover', () => {
        fillGraphics.clear();
        fillGraphics.fillStyle(hoverFill, 1);
        fillGraphics.fillRoundedRect(
          -buttonWidth / 2 + fillPadding,
          -buttonHeight / 2 + fillPadding,
          buttonWidth - fillPadding * 2,
          buttonHeight - fillPadding * 2,
          cornerRadius - 8
        );
      });

      hitArea.on('pointerout', () => {
        fillGraphics.clear();
        fillGraphics.fillStyle(normalFill, 1);
        fillGraphics.fillRoundedRect(
          -buttonWidth / 2 + fillPadding,
          -buttonHeight / 2 + fillPadding,
          buttonWidth - fillPadding * 2,
          buttonHeight - fillPadding * 2,
          cornerRadius - 8
        );
      });

      hitArea.on('pointerdown', () => {
        fillGraphics.clear();
        fillGraphics.fillStyle(pressFill, 1);
        fillGraphics.fillRoundedRect(
          -buttonWidth / 2 + fillPadding,
          -buttonHeight / 2 + fillPadding,
          buttonWidth - fillPadding * 2,
          buttonHeight - fillPadding * 2,
          cornerRadius - 8
        );
      });

      hitArea.on('pointerup', () => {
        fillGraphics.clear();
        fillGraphics.fillStyle(hoverFill, 1);
        fillGraphics.fillRoundedRect(
          -buttonWidth / 2 + fillPadding,
          -buttonHeight / 2 + fillPadding,
          buttonWidth - fillPadding * 2,
          buttonHeight - fillPadding * 2,
          cornerRadius - 8
        );
        onClick();
      });
    }

    return container;
  }

  startNewGame() {
    console.log('MenuScene: Starting new game...');

    // Start menu music on first user interaction (if not already started)
    if (!this.musicStarted && this.soundManager) {
      this.soundManager.playMusic('music-menu', false);
      this.musicStarted = true;
    }

    // Stop menu music before transitioning
    if (this.soundManager && this.soundManager.currentMusic) {
      this.soundManager.stopMusic(false); // Immediate stop, no fade
    }

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Destroy sound manager to ensure clean transition
      if (this.soundManager) {
        this.soundManager.destroy();
        this.soundManager = null;
      }

      // Stop this scene and start GameScene
      this.scene.stop('MenuScene');
      this.scene.start('GameScene');
      // Also start UIScene in parallel
      this.scene.launch('UIScene');
    });
  }
}
