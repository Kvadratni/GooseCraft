// Lumber Mill - Wood/sticks production building with upgrades

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class LumberMill extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.LUMBER_MILL;

    const buildingConfig = {
      type: 'LUMBER_MILL',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'lumber-mill',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production properties
    this.gatherTimer = 0;
    this.gatherInterval = 5000; // Produce every 5 seconds
    this.gatherAmount = 6; // Sticks per cycle
    this.isPaused = false; // Can pause/resume production

    // Upgrades
    this.upgrades = {
      SAWMILL: {
        name: 'Sawmill',
        description: 'Increases stick output by 75%',
        cost: { food: 50, water: 25, sticks: 100, tools: 10 },
        purchased: false
      },
      EFFICIENT_CUTTING: {
        name: 'Efficient Cutting',
        description: 'Produces 35% faster',
        cost: { food: 25, water: 50, sticks: 75, tools: 8 },
        purchased: false
      }
    };

    console.log(`Lumber Mill: Created at (${x}, ${y}), generates ${this.gatherAmount} sticks every ${this.gatherInterval/1000}s`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    if (this.state !== 'OPERATIONAL' || this.isPaused || this.isSabotaged) {
      return;
    }

    // Auto-produce sticks
    this.gatherTimer += delta;

    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      this.generateSticks();
    }
  }

  /**
   * Toggle production pause state
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(`Lumber Mill: Production ${this.isPaused ? 'paused' : 'resumed'}`);
    return this.isPaused;
  }

  /**
   * Generate sticks
   */
  generateSticks() {
    const resourceManager = this.scene.resourceManager;
    if (resourceManager && this.faction === 'PLAYER') {
      resourceManager.addResources('sticks', this.gatherAmount);
      console.log(`Lumber Mill: Produced ${this.gatherAmount} sticks`);
    } else if (this.faction === 'ENEMY_AI' && this.scene.aiManager) {
      this.scene.aiManager.resources.sticks += this.gatherAmount;
      console.log(`AI Lumber Mill: Produced ${this.gatherAmount} sticks`);
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
      console.log(`Lumber Mill: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Lumber Mill: Purchased ${upgrade.name}!`);

    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'SAWMILL':
        // 75% more sticks
        this.gatherAmount = Math.floor(this.gatherAmount * 1.75);
        console.log(`Lumber Mill: Sawmill - now produces ${this.gatherAmount} sticks per cycle`);
        break;
      case 'EFFICIENT_CUTTING':
        // 35% faster
        this.gatherInterval = Math.floor(this.gatherInterval * 0.65);
        console.log(`Lumber Mill: Efficient Cutting - now produces every ${this.gatherInterval/1000}s`);
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
    console.log(`Lumber Mill: Wood processing operational - producing ${this.gatherAmount} sticks every ${this.gatherInterval/1000}s`);
  }

  /**
   * Get status text for UI
   */
  getStatusText() {
    if (this.isPaused) {
      return `PAUSED - ${this.gatherAmount} sticks/${this.gatherInterval/1000}s`;
    }
    return `Producing ${this.gatherAmount} sticks/${this.gatherInterval/1000}s`;
  }
}
