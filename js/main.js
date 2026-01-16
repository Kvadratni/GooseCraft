// Main Game Entry Point

import { GAME_CONFIG } from './utils/Constants.js';
import BootScene from './scenes/BootScene.js';
import SplashScene from './scenes/SplashScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// Phaser Game Configuration
// Use window dimensions for fullscreen experience
const config = {
  type: Phaser.AUTO,
  backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
  parent: 'game-container',
  scene: [BootScene, SplashScene, MenuScene, GameScene, UIScene],
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
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%'
  }
};

// Create and start the game
const game = new Phaser.Game(config);

console.log('GooseCraft initialized!');
