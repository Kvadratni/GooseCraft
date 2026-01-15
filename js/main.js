// Main Game Entry Point

import { GAME_CONFIG } from './utils/Constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// Phaser Game Configuration
const config = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
  parent: 'game-container',
  scene: [BootScene, MenuScene, GameScene, UIScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  render: {
    pixelArt: true,
    antialias: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Create and start the game
const game = new Phaser.Game(config);

console.log('GooseCraft initialized!');
