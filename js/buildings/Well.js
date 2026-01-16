// Well - Water extraction building with upgrades

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class Well extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.WELL;

    const buildingConfig = {
      type: 'WELL',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'well',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production properties
    this.gatherTimer = 0;
    this.gatherInterval = 4000; // Extract every 4 seconds
    this.gatherAmount = 5; // Water per extraction
    this.isPaused = false; // Can pause/resume production

    // Upgrades
    this.upgrades = {
      DEEP_WELL: {
        name: 'Deep Well',
        description: 'Doubles water output',
        cost: { food: 25, water: 25, sticks: 50, stone: 50, tools: 5 },
        purchased: false
      },
      PUMP: {
        name: 'Water Pump',
        description: 'Extracts 40% faster',
        cost: { food: 25, water: 25, sticks: 75, tools: 8 },
        purchased: false
      }
    };

    console.log(`Well: Created at (${x}, ${y}), generates ${this.gatherAmount} water every ${this.gatherInterval/1000}s`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    if (this.state !== 'OPERATIONAL' || this.isPaused || this.isSabotaged) {
      return;
    }

    // Auto-extract water
    this.gatherTimer += delta;

    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      this.generateWater();
    }
  }

  /**
   * Toggle production pause state
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(`Well: Production ${this.isPaused ? 'paused' : 'resumed'}`);
    return this.isPaused;
  }

  /**
   * Generate water
   */
  generateWater() {
    const resourceManager = this.scene.resourceManager;
    if (resourceManager && this.faction === 'PLAYER') {
      resourceManager.addResources('water', this.gatherAmount);
      console.log(`Well: Extracted ${this.gatherAmount} water`);
    } else if (this.faction === 'ENEMY_AI' && this.scene.aiManager) {
      this.scene.aiManager.resources.water += this.gatherAmount;
      console.log(`AI Well: Extracted ${this.gatherAmount} water`);
    }
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeKey) {
    if (this.faction !== 'PLAYER') return false;

    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade || upgrade.purchased) return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager.canAfford(upgrade.cost)) {
      console.log(`Well: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Well: Purchased ${upgrade.name}!`);

    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'DEEP_WELL':
        // Double water output
        this.gatherAmount = this.gatherAmount * 2;
        console.log(`Well: Deep Well - now produces ${this.gatherAmount} water per extraction`);
        break;
      case 'PUMP':
        // 40% faster
        this.gatherInterval = Math.floor(this.gatherInterval * 0.6);
        console.log(`Well: Water Pump - now extracts every ${this.gatherInterval/1000}s`);
        break;
    }
  }

  /**
   * Get upgrade status for UI
   */
  getUpgradeStatus() {
    return {
      upgrades: this.upgrades,
      gatherAmount: this.gatherAmount,
      gatherInterval: this.gatherInterval,
      isPaused: this.isPaused
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log(`Well: Water extraction operational - producing ${this.gatherAmount} water every ${this.gatherInterval/1000}s`);
  }

  /**
   * Get status text for UI
   */
  getStatusText() {
    if (this.isPaused) {
      return `PAUSED - ${this.gatherAmount} water/${this.gatherInterval/1000}s`;
    }
    return `Extracting ${this.gatherAmount} water/${this.gatherInterval/1000}s`;
  }
}
