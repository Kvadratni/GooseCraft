// Main Game Entry Point

import { GAME_CONFIG } from './utils/Constants.js';
import BootScene from './scenes/BootScene.js';
import SplashScene from './scenes/SplashScene.js';
import MenuScene from './scenes/MenuScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import VictoryScene from './scenes/VictoryScene.js';

// Phaser Game Configuration
// Use window dimensions for fullscreen experience
const config = {
  type: Phaser.AUTO,
  backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
  parent: 'game-container',
  scene: [BootScene, SplashScene, MenuScene, LoadingScene, GameScene, UIScene, VictoryScene],
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
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  }
};

// Create and start the game
const game = new Phaser.Game(config);

// Debug console commands (access via window.gc in browser console)
window.gc = {
  // Get scenes
  game: () => game.scene.getScene('GameScene'),
  ui: () => game.scene.getScene('UIScene'),

  // Add resources
  addFood: (amount = 100) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) { ui.updateResources({ food: amount }); console.log(`Added ${amount} food`); }
  },
  addWater: (amount = 100) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) { ui.updateResources({ water: amount }); console.log(`Added ${amount} water`); }
  },
  addSticks: (amount = 100) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) { ui.updateResources({ sticks: amount }); console.log(`Added ${amount} sticks`); }
  },
  addStone: (amount = 100) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) { ui.updateResources({ stone: amount }); console.log(`Added ${amount} stone`); }
  },
  addTools: (amount = 100) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) { ui.updateResources({ tools: amount }); console.log(`Added ${amount} tools`); }
  },
  addAll: (amount = 500) => {
    const ui = game.scene.getScene('UIScene');
    if (ui) {
      ui.updateResources({ food: amount, water: amount, sticks: amount, stone: amount, tools: amount });
      console.log(`Added ${amount} of all resources`);
    }
  },
  maxResources: () => {
    const gs = game.scene.getScene('GameScene');
    if (!gs || !gs.resourceManager) { console.log('ResourceManager not ready'); return; }
    const rm = gs.resourceManager;
    const limits = rm.storageLimits;
    const current = rm.resources;
    // Calculate how much to add to reach max
    const toAdd = {
      food: limits.food - current.food,
      water: limits.water - current.water,
      sticks: limits.sticks - current.sticks,
      stone: limits.stone - current.stone,
      tools: limits.tools - current.tools
    };
    // Add resources directly
    for (const [type, amount] of Object.entries(toAdd)) {
      if (amount > 0) rm.addResources(type, amount);
    }
    console.log(`Resources maxed: food=${limits.food}, water=${limits.water}, sticks=${limits.sticks}, stone=${limits.stone}, tools=${limits.tools}`);
  },

  // Spawn units at camera center or specified position
  spawn: (unitType, x, y) => {
    const gs = game.scene.getScene('GameScene');
    if (!gs) { console.log('GameScene not ready'); return; }

    // Default to camera center if no position
    if (x === undefined) {
      x = gs.cameras.main.scrollX + gs.cameras.main.width / 2;
      y = gs.cameras.main.scrollY + gs.cameras.main.height / 2;
    }

    const validTypes = ['worker', 'guard', 'scout', 'spy', 'maverick'];
    if (!validTypes.includes(unitType?.toLowerCase())) {
      console.log(`Invalid unit type. Valid types: ${validTypes.join(', ')}`);
      return;
    }

    let unit;
    const type = unitType.toLowerCase();
    const { FACTIONS } = gs.constructor.dependencies || {};
    const faction = 'PLAYER';

    switch (type) {
      case 'worker':
        const Goose = gs.unitClasses?.Goose;
        if (Goose) unit = new Goose(gs, x, y, faction);
        break;
      case 'guard':
        const Guard = gs.unitClasses?.Guard;
        if (Guard) unit = new Guard(gs, x, y, faction);
        break;
      case 'scout':
        const Scout = gs.unitClasses?.Scout;
        if (Scout) unit = new Scout(gs, x, y, faction);
        break;
      case 'spy':
        const Spy = gs.unitClasses?.Spy;
        if (Spy) unit = new Spy(gs, x, y, faction);
        break;
      case 'maverick':
        const Maverick = gs.unitClasses?.Maverick;
        if (Maverick) unit = new Maverick(gs, x, y, faction);
        break;
    }

    if (unit) {
      gs.units.push(unit);
      console.log(`Spawned ${type} at (${Math.round(x)}, ${Math.round(y)})`);
      return unit;
    } else {
      console.log(`Failed to spawn ${type} - class not loaded`);
    }
  },

  // Spawn enemy unit
  spawnEnemy: (unitType, x, y) => {
    const gs = game.scene.getScene('GameScene');
    if (!gs) { console.log('GameScene not ready'); return; }

    if (x === undefined) {
      x = gs.cameras.main.scrollX + gs.cameras.main.width / 2;
      y = gs.cameras.main.scrollY + gs.cameras.main.height / 2;
    }

    const validTypes = ['worker', 'guard', 'scout', 'spy', 'maverick'];
    if (!validTypes.includes(unitType?.toLowerCase())) {
      console.log(`Invalid unit type. Valid types: ${validTypes.join(', ')}`);
      return;
    }

    let unit;
    const type = unitType.toLowerCase();
    const faction = 'ENEMY_AI';

    switch (type) {
      case 'worker':
        const Goose = gs.unitClasses?.Goose;
        if (Goose) unit = new Goose(gs, x, y, faction);
        break;
      case 'guard':
        const Guard = gs.unitClasses?.Guard;
        if (Guard) unit = new Guard(gs, x, y, faction);
        break;
      case 'scout':
        const Scout = gs.unitClasses?.Scout;
        if (Scout) unit = new Scout(gs, x, y, faction);
        break;
      case 'spy':
        const Spy = gs.unitClasses?.Spy;
        if (Spy) unit = new Spy(gs, x, y, faction);
        break;
      case 'maverick':
        const Maverick = gs.unitClasses?.Maverick;
        if (Maverick) unit = new Maverick(gs, x, y, faction);
        break;
    }

    if (unit) {
      gs.units.push(unit);
      console.log(`Spawned enemy ${type} at (${Math.round(x)}, ${Math.round(y)})`);
      return unit;
    } else {
      console.log(`Failed to spawn ${type} - class not loaded`);
    }
  },

  // Kill all enemy units
  killEnemies: () => {
    const gs = game.scene.getScene('GameScene');
    if (!gs) return;
    let count = 0;
    gs.units.forEach(u => {
      if (u.faction === 'ENEMY_AI') { u.die(); count++; }
    });
    console.log(`Killed ${count} enemy units`);
  },

  // Unlock all buildings
  unlockAll: () => {
    const gs = game.scene.getScene('GameScene');
    if (gs?.buildingUnlockManager) {
      gs.buildingUnlockManager.unlockAll();
      console.log('All buildings unlocked');
    }
  },

  // Toggle fog of war
  toggleFog: () => {
    const gs = game.scene.getScene('GameScene');
    if (gs?.fogOfWar) {
      return gs.fogOfWar.toggle();
    }
    console.log('FogOfWar not available');
    return null;
  },

  // Toggle verbose logging
  toggleLogs: () => {
    window.gcVerbose = !window.gcVerbose;
    console.log(`Verbose logging: ${window.gcVerbose ? 'ON' : 'OFF'}`);
    return window.gcVerbose;
  },

  // Show help
  help: () => {
    console.log(`
GooseCraft Debug Commands (gc.command):
─────────────────────────────────────────
Resources:
  gc.addFood(amount)     - Add food (default 100)
  gc.addWater(amount)    - Add water
  gc.addSticks(amount)   - Add sticks
  gc.addStone(amount)    - Add stone
  gc.addTools(amount)    - Add tools
  gc.addAll(amount)      - Add all resources (default 500)
  gc.maxResources()      - Fill all resources to storage limit

Units:
  gc.spawn(type, x, y)      - Spawn player unit at position
  gc.spawnEnemy(type, x, y) - Spawn enemy unit
  Valid types: worker, guard, scout, spy, maverick
  (omit x,y to spawn at camera center)

Other:
  gc.unlockAll()    - Unlock all buildings
  gc.killEnemies()  - Kill all enemy units
  gc.toggleFog()    - Toggle fog of war on/off
  gc.toggleLogs()   - Toggle verbose logging on/off
  gc.game()         - Get GameScene reference
  gc.ui()           - Get UIScene reference
─────────────────────────────────────────
    `);
  }
};

// Initialize verbose logging flag (off by default)
window.gcVerbose = false;

console.log('GooseCraft initialized!');
console.log('Debug commands available: type gc.help() in console');
