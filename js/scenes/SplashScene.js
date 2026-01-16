// Splash Scene - Click to Start screen

import SoundManager from '../systems/SoundManager.js';

export default class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Initialize sound manager
    this.soundManager = new SoundManager(this);

    // Background image (same as menu)
    const bg = this.add.image(width / 2, height / 2, 'menu-background');
    bg.setDisplaySize(width, height);

    // Semi-transparent overlay for better text visibility
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);

    // Pulsing "Click to Start" text
    this.startText = this.add.text(width / 2, height / 2 + 100, 'Click to Start', {
      fontSize: '36px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.startText.setOrigin(0.5);

    // Add pulsing animation
    this.tweens.add({
      targets: this.startText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Version text
    const versionText = this.add.text(width / 2, height - 30, 'v0.1.0 Alpha', {
      fontSize: '14px',
      fill: '#888888',
      fontFamily: 'Arial'
    });
    versionText.setOrigin(0.5);

    // Make entire screen clickable
    this.input.once('pointerdown', () => {
      this.startGame();
    });

    // Also allow keyboard to start
    this.input.keyboard.once('keydown', () => {
      this.startGame();
    });

    console.log('SplashScene: Ready - click or press any key to start');
  }

  startGame() {
    // User interaction unlocks audio context - menu scene will start music
    console.log('SplashScene: Audio context unlocked, transitioning to MenuScene');

    // Fade out and transition to menu
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }
}
