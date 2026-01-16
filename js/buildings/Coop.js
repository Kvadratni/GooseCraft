// Coop - Main Base Building with Upgrades

import Building from '../entities/Building.js';
import ProductionQueue from '../systems/ProductionQueue.js';
import { BUILDING } from '../utils/Constants.js';

export default class Coop extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.COOP;

    const buildingConfig = {
      type: 'COOP',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'command-center',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production capability
    this.productionQueue = new ProductionQueue(this, scene);
    this.canProduce = ['worker']; // Coop produces workers

    // Upgrades
    this.upgrades = {
      HATCHERY: {
        name: 'Hatchery',
        description: 'Workers train 40% faster',
        cost: { food: 100, water: 50, sticks: 150, tools: 5 },
        purchased: false
      },
      LARGE_NESTS: {
        name: 'Large Nests',
        description: 'Workers carry +10 resources per trip',
        cost: { food: 75, water: 75, sticks: 200, tools: 8 },
        purchased: false
      }
    };

    // Coop is built instantly (starting building)
    this.constructionProgress = 100;
    this.constructionTimer = this.constructionTime;
    this.completeConstruction();
  }

  /**
   * Override update to process production
   */
  update(time, delta) {
    super.update(time, delta);

    // Process production queue if operational
    if (this.productionQueue && this.state === 'OPERATIONAL') {
      this.productionQueue.update(delta);
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
      console.log(`Coop: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Coop: Purchased ${upgrade.name}!`);

    // Apply upgrade effect
    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'HATCHERY':
        // 40% faster training
        this.trainSpeedMultiplier = 1.4;
        if (this.productionQueue) {
          this.productionQueue.setSpeedMultiplier(1.4);
        }
        console.log('Coop: Hatchery upgrade - workers train 40% faster');
        break;
      case 'LARGE_NESTS':
        // Store for new workers and apply to existing
        if (!this.scene.buildingUpgrades) this.scene.buildingUpgrades = {};
        this.scene.buildingUpgrades.largeNests = true;
        // Apply to existing workers
        if (this.scene.units) {
          this.scene.units.forEach(unit => {
            if (unit.unitType === 'worker' && unit.faction === this.faction) {
              unit.applyCarryBonus(10);
            }
          });
        }
        console.log('Coop: Large Nests upgrade - workers carry +10 resources');
        break;
    }
  }

  /**
   * Get upgrade status for UI
   */
  getUpgradeStatus() {
    return {
      upgrades: this.upgrades,
      trainSpeedMultiplier: this.trainSpeedMultiplier || 1.0
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Coop: Main base operational - can produce workers');
  }
}
