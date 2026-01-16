// Farm - Food production building with upgrades

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class Farm extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.FARM;

    const buildingConfig = {
      type: 'FARM',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'farm',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production properties
    this.gatherTimer = 0;
    this.gatherInterval = 6000; // Harvest every 6 seconds
    this.gatherAmount = 8; // Food per harvest
    this.isPaused = false; // Can pause/resume production

    // Upgrades
    this.upgrades = {
      IRRIGATION: {
        name: 'Irrigation',
        description: 'Increases food yield by 50%',
        cost: { food: 30, water: 100, sticks: 50, tools: 3 },
        purchased: false
      },
      CROP_ROTATION: {
        name: 'Crop Rotation',
        description: 'Harvests 30% faster',
        cost: { food: 50, water: 50, sticks: 75, tools: 5 },
        purchased: false
      }
    };

    console.log(`Farm: Created at (${x}, ${y}), generates ${this.gatherAmount} food every ${this.gatherInterval/1000}s`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    if (this.state !== 'OPERATIONAL' || this.isPaused || this.isSabotaged) {
      return;
    }

    // Auto-generate food
    this.gatherTimer += delta;

    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      this.generateFood();
    }
  }

  /**
   * Toggle production pause state
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(`Farm: Production ${this.isPaused ? 'paused' : 'resumed'}`);
    return this.isPaused;
  }

  /**
   * Generate food
   */
  generateFood() {
    const resourceManager = this.scene.resourceManager;
    if (resourceManager && this.faction === 'PLAYER') {
      resourceManager.addResources('food', this.gatherAmount);
      console.log(`Farm: Harvested ${this.gatherAmount} food`);
    } else if (this.faction === 'ENEMY_AI' && this.scene.aiManager) {
      this.scene.aiManager.resources.food += this.gatherAmount;
      console.log(`AI Farm: Harvested ${this.gatherAmount} food`);
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
      console.log(`Farm: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Farm: Purchased ${upgrade.name}!`);

    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'IRRIGATION':
        // 50% more food
        this.gatherAmount = Math.floor(this.gatherAmount * 1.5);
        console.log(`Farm: Irrigation - now produces ${this.gatherAmount} food per harvest`);
        break;
      case 'CROP_ROTATION':
        // 30% faster
        this.gatherInterval = Math.floor(this.gatherInterval * 0.7);
        console.log(`Farm: Crop Rotation - now harvests every ${this.gatherInterval/1000}s`);
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
    console.log(`Farm: Agricultural facility operational - producing ${this.gatherAmount} food every ${this.gatherInterval/1000}s`);
  }

  /**
   * Get status text for UI
   */
  getStatusText() {
    if (this.isPaused) {
      return `PAUSED - ${this.gatherAmount} food/${this.gatherInterval/1000}s`;
    }
    return `Producing ${this.gatherAmount} food/${this.gatherInterval/1000}s`;
  }
}
