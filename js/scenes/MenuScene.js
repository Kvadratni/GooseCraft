// Menu Scene - Main Menu

import SoundManager from '../systems/SoundManager.js';
import SaveManager from '../utils/SaveManager.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Initialize sound manager and start menu music
    // Audio context is already unlocked from SplashScene user interaction
    this.soundManager = new SoundManager(this);
    this.soundManager.playMusic('music-menu', true);

    // Background image (contains title)
    const bg = this.add.image(width / 2, height / 2, 'menu-background');
    bg.setDisplaySize(width, height);

    // New Game Button
    const newGameButton = this.createButton(
      width / 2,
      height / 2 + 50,
      'New Game',
      () => this.showNewGameSetup()
    );

    // Load Game Button
    const loadGameButton = this.createButton(
      width / 2,
      height / 2 + 140,
      'Load Game',
      () => this.loadSavedGame()
    );

    // Settings Button
    const settingsButton = this.createButton(
      width / 2,
      height / 2 + 230,
      'Settings',
      () => this.showSettings()
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

    // Create settings panel (hidden by default)
    this.createSettingsPanel();

    // Create new game setup panel (hidden by default)
    this.createNewGamePanel();

    this.selectedMapConfig = { width: 250, height: 250 }; // Default Medium

    console.log('MenuScene: Ready');
  }

  createButton(x, y, text, onClick, disabled = false) {
    const buttonWidth = 320;
    const buttonHeight = 60;
    const cornerRadius = 15;

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

  startNewGame(config = {}) {
    console.log('MenuScene: Starting new game with config:', config);

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

      // Stop this scene and start LoadingScene
      this.scene.stop('MenuScene');
      this.scene.start('LoadingScene', config);
    });
  }

  /**
   * Load a previously saved game
   */
  async loadSavedGame() {
    console.log('MenuScene: Loading saved game...');

    try {
      const saveManager = new SaveManager();
      await saveManager.init();
      const gameState = await saveManager.loadGame('auto_save');

      if (!gameState) {
        console.log('MenuScene: No save found');
        // Show a brief message using a temp text
        const noSave = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 190,
          'No save file found!',
          { fontSize: '18px', fill: '#ff6666', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(3000);
        this.time.delayedCall(2000, () => noSave.destroy());
        return;
      }

      // Store save data globally so GameScene can pick it up after create()
      window.__goosecraft_pending_load = gameState;

      // Stop menu music
      if (this.soundManager && this.soundManager.currentMusic) {
        this.soundManager.stopMusic(false);
      }

      // Fade out and start game
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this.soundManager) {
          this.soundManager.destroy();
          this.soundManager = null;
        }
        this.scene.stop('MenuScene');
        // Passing the config via window var earlier, but we still need to hit LoadingScene
        this.scene.start('LoadingScene');
      });

    } catch (err) {
      console.error('MenuScene: Failed to load game:', err);
    }
  }

  /**
   * Show settings panel
   */
  showSettings() {
    if (this.settingsPanelElements) {
      this.settingsPanelElements.forEach(element => element.setVisible(true));
    }
  }

  /**
   * Hide settings panel
   */
  hideSettings() {
    if (this.settingsPanelElements) {
      this.settingsPanelElements.forEach(element => element.setVisible(false));
    }
  }

  showNewGameSetup() {
    if (this.newGamePanelElements) {
      this.newGamePanelElements.forEach(element => element.setVisible(true));
    }
  }

  hideNewGameSetup() {
    if (this.newGamePanelElements) {
      this.newGamePanelElements.forEach(element => element.setVisible(false));
    }
  }

  /**
   * Create settings panel
   */
  createSettingsPanel() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    // Panel background
    const settingsPanel = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    settingsPanel.setOrigin(0.5);
    settingsPanel.setDepth(2000);
    settingsPanel.setVisible(false);

    // Panel border
    const panelBorder = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight);
    panelBorder.setStrokeStyle(2, 0x4CAF50);
    panelBorder.setOrigin(0.5);
    panelBorder.setDepth(2000);
    panelBorder.setVisible(false);

    // Title
    const titleText = this.add.text(panelX + panelWidth / 2, panelY + 30, 'Settings', {
      fontSize: '32px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(2001);
    titleText.setVisible(false);

    // Music volume label
    const musicLabel = this.add.text(panelX + 40, panelY + 90, 'Music Volume:', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    musicLabel.setDepth(2001);
    musicLabel.setVisible(false);

    // Music volume value
    const musicValue = this.add.text(panelX + panelWidth - 60, panelY + 90, '20%', {
      fontSize: '20px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    musicValue.setOrigin(1, 0);
    musicValue.setDepth(2001);
    musicValue.setVisible(false);

    // Music slider background
    const musicSliderBg = this.add.rectangle(panelX + panelWidth / 2, panelY + 130, 300, 20, 0x333333);
    musicSliderBg.setDepth(2001);
    musicSliderBg.setVisible(false);

    // Music slider fill (20% = 60px of 300px)
    const musicSliderFill = this.add.rectangle(panelX + (panelWidth / 2) - 150, panelY + 130, 60, 20, 0x4CAF50);
    musicSliderFill.setOrigin(0, 0.5);
    musicSliderFill.setDepth(2002);
    musicSliderFill.setVisible(false);

    // Music slider handle (20% = -150 + 60)
    const musicHandle = this.add.circle(panelX + panelWidth / 2 - 90, panelY + 130, 12, 0xFFFFFF);
    musicHandle.setDepth(2003);
    musicHandle.setVisible(false);
    musicHandle.setInteractive({ useHandCursor: true, draggable: true });

    // SFX volume label
    const sfxLabel = this.add.text(panelX + 40, panelY + 180, 'SFX Volume:', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    sfxLabel.setDepth(2001);
    sfxLabel.setVisible(false);

    // SFX volume value
    const sfxValue = this.add.text(panelX + panelWidth - 60, panelY + 180, '100%', {
      fontSize: '20px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    sfxValue.setOrigin(1, 0);
    sfxValue.setDepth(2001);
    sfxValue.setVisible(false);

    // SFX slider background
    const sfxSliderBg = this.add.rectangle(panelX + panelWidth / 2, panelY + 220, 300, 20, 0x333333);
    sfxSliderBg.setDepth(2001);
    sfxSliderBg.setVisible(false);

    // SFX slider fill
    const sfxSliderFill = this.add.rectangle(panelX + (panelWidth / 2) - 150, panelY + 220, 300, 20, 0x4CAF50);
    sfxSliderFill.setOrigin(0, 0.5);
    sfxSliderFill.setDepth(2002);
    sfxSliderFill.setVisible(false);

    // SFX slider handle
    const sfxHandle = this.add.circle(panelX + panelWidth / 2 + 150, panelY + 220, 12, 0xFFFFFF);
    sfxHandle.setDepth(2003);
    sfxHandle.setVisible(false);
    sfxHandle.setInteractive({ useHandCursor: true, draggable: true });

    // Close button
    const closeButton = this.add.text(panelX + panelWidth / 2, panelY + 260, 'Close', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#4CAF50',
      padding: { x: 20, y: 10 }
    });
    closeButton.setOrigin(0.5);
    closeButton.setDepth(2001);
    closeButton.setVisible(false);
    closeButton.setInteractive({ useHandCursor: true });

    // Store all panel elements
    this.settingsPanelElements = [
      settingsPanel,
      panelBorder,
      titleText,
      musicLabel,
      musicValue,
      musicSliderBg,
      musicSliderFill,
      musicHandle,
      sfxLabel,
      sfxValue,
      sfxSliderBg,
      sfxSliderFill,
      sfxHandle,
      closeButton
    ];

    // Initialize slider positions from saved volumes
    if (this.soundManager) {
      const musicVol = this.soundManager.getMusicVolume();
      const sfxVol = this.soundManager.getSFXVolume();

      musicHandle.x = panelX + (panelWidth / 2) - 150 + (musicVol * 300);
      musicSliderFill.width = musicVol * 300;
      musicValue.setText(`${Math.round(musicVol * 100)}%`);

      sfxHandle.x = panelX + (panelWidth / 2) - 150 + (sfxVol * 300);
      sfxSliderFill.width = sfxVol * 300;
      sfxValue.setText(`${Math.round(sfxVol * 100)}%`);
    }

    // Close button click handler
    closeButton.on('pointerdown', () => {
      this.hideSettings();
    });

    // Music slider drag handler
    musicHandle.on('drag', (pointer, dragX, dragY) => {
      const minX = panelX + (panelWidth / 2) - 150;
      const maxX = minX + 300;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

      musicHandle.x = clampedX;
      const volume = (clampedX - minX) / 300;
      musicSliderFill.width = volume * 300;
      musicValue.setText(`${Math.round(volume * 100)}%`);

      // Update volume in sound manager
      if (this.soundManager) {
        this.soundManager.setMusicVolume(volume);
      }
    });

    // SFX slider drag handler
    sfxHandle.on('drag', (pointer, dragX, dragY) => {
      const minX = panelX + (panelWidth / 2) - 150;
      const maxX = minX + 300;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

      sfxHandle.x = clampedX;
      const volume = (clampedX - minX) / 300;
      sfxSliderFill.width = volume * 300;
      sfxValue.setText(`${Math.round(volume * 100)}%`);

      // Update volume in sound manager
      if (this.soundManager) {
        this.soundManager.setSFXVolume(volume);
      }
    });

    console.log('MenuScene: Settings panel created');
  }

  createNewGamePanel() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const panelWidth = 400;
    const panelHeight = 620;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    // Panel background
    const bg = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    bg.setDepth(2000);
    bg.setVisible(false);

    // Panel border
    const border = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight);
    border.setStrokeStyle(2, 0x4CAF50);
    border.setDepth(2000);
    border.setVisible(false);

    // Title
    const title = this.add.text(panelX + panelWidth / 2, panelY + 40, 'Game Setup', {
      fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2001).setVisible(false);

    // Map Size Label
    const mapSizeLabel = this.add.text(panelX + panelWidth / 2, panelY + 100, 'Map Size', {
      fontSize: '24px', fill: '#ffffff', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(2001).setVisible(false);

    // Size Buttons
    const createSizeBtn = (xOffset, yOffset, label, w, h) => {
      const btn = this.add.text(panelX + panelWidth / 2 + xOffset, panelY + yOffset, label, {
        fontSize: '20px', fill: '#ffffff', backgroundColor: '#333333', padding: { x: 15, y: 10 }
      }).setOrigin(0.5).setDepth(2001).setVisible(false).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        // Reset all buttons visual
        smallBtn.setBackgroundColor('#333333');
        medBtn.setBackgroundColor('#333333');
        lgBtn.setBackgroundColor('#333333');
        // Highlight active
        btn.setBackgroundColor('#4CAF50');
        this.selectedMapConfig.width = w;
        this.selectedMapConfig.height = h;
      });
      return btn;
    };

    const smallBtn = createSizeBtn(0, 160, 'Small (100x100)', 100, 100);
    const medBtn = createSizeBtn(0, 230, 'Medium (250x250)', 250, 250);
    const lgBtn = createSizeBtn(0, 300, 'Large (400x400)', 400, 400);

    // Default select medium
    medBtn.setBackgroundColor('#4CAF50');
    this.selectedMapConfig = { width: 250, height: 250, enemies: 1 };

    // Map Seed Field
    const seedLabel = this.add.text(panelX + panelWidth / 2, panelY + 360, 'Map Seed (Optional)', {
      fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(2001).setVisible(false);

    const seedBtn = this.add.text(panelX + panelWidth / 2, panelY + 400, 'Random', {
      fontSize: '20px', fill: '#ffffff', backgroundColor: '#333333', padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setDepth(2001).setVisible(false).setInteractive({ useHandCursor: true });

    seedBtn.on('pointerdown', () => {
      const input = prompt("Enter a Map Seed (leave blank for random)", this.selectedMapConfig.seed || "");
      if (input !== null) {
        this.selectedMapConfig.seed = input.trim();
        seedBtn.setText(this.selectedMapConfig.seed || "Random");
      }
    });

    // Enemy Count Field
    const enemyLabel = this.add.text(panelX + panelWidth / 2, panelY + 460, 'Opponents', {
      fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(2001).setVisible(false);

    const enemyBtn = this.add.text(panelX + panelWidth / 2, panelY + 500, '1 AI Faction', {
      fontSize: '20px', fill: '#ffffff', backgroundColor: '#F44336', padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setDepth(2001).setVisible(false).setInteractive({ useHandCursor: true });

    enemyBtn.on('pointerdown', () => {
      let count = this.selectedMapConfig.enemies + 1;
      if (count > 3) count = 1;

      this.selectedMapConfig.enemies = count;
      const suffix = count === 1 ? 'Faction' : 'Factions';
      enemyBtn.setText(`${count} AI ${suffix}`);
    });

    // Start Button
    const startBtn = this.add.text(panelX + panelWidth / 2 - 80, panelY + panelHeight - 60, 'START', {
      fontSize: '24px', fill: '#ffffff', backgroundColor: '#4CAF50', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(2001).setVisible(false).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
      this.hideNewGameSetup();
      this.startNewGame(this.selectedMapConfig);
    });

    // Cancel Button
    const cancelBtn = this.add.text(panelX + panelWidth / 2 + 80, panelY + panelHeight - 60, 'CANCEL', {
      fontSize: '24px', fill: '#ffffff', backgroundColor: '#777777', padding: { x: 20, y: 15 }
    }).setOrigin(0.5).setDepth(2001).setVisible(false).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerdown', () => {
      this.hideNewGameSetup();
    });

    this.newGamePanelElements = [
      bg, border, title, mapSizeLabel, smallBtn, medBtn, lgBtn, seedLabel, seedBtn, enemyLabel, enemyBtn, startBtn, cancelBtn
    ];
  }
}
