// Barracks - Combat Unit Production Building with Upgrades

import Building from '../entities/Building.js';
import ProductionQueue from '../systems/ProductionQueue.js';
import { BUILDING } from '../utils/Constants.js';

export default class Barracks extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.BARRACKS;

    const buildingConfig = {
      type: 'BARRACKS',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'barracks',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production capability
    this.productionQueue = new ProductionQueue(this, scene);
    this.canProduce = ['guard', 'scout']; // Base units, spy unlocked by Research Center

    // Upgrades
    this.upgrades = {
      VETERAN_TRAINING: {
        name: 'Veteran Training',
        description: 'Combat units spawn with +25% HP',
        cost: { food: 100, water: 50, sticks: 150, tools: 8 },
        purchased: false
      },
      COMBAT_DRILLS: {
        name: 'Combat Drills',
        description: 'Combat units deal +15% damage',
        cost: { food: 75, water: 75, sticks: 200, tools: 10 },
        purchased: false
      }
    };

    // Check if Research Center already exists (for barracks built after research center)
    this.checkForResearchCenter();
  }

  /**
   * Check if a Research Center exists and unlock spy if so
   */
  checkForResearchCenter() {
    if (!this.scene.buildings) return;

    const hasResearchCenter = this.scene.buildings.some(
      building => building.buildingType === 'RESEARCH_CENTER' &&
                  building.faction === this.faction &&
                  building.state === 'OPERATIONAL'
    );

    if (hasResearchCenter) {
      this.unlockSpy();
    }
  }

  /**
   * Unlock spy unit training (called by Research Center when built)
   */
  unlockSpy() {
    if (!this.canProduce.includes('spy')) {
      this.canProduce.push('spy');
      console.log('Barracks: Spy training unlocked!');
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
      console.log(`Barracks: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Barracks: Purchased ${upgrade.name}!`);

    // Apply upgrade effect
    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    if (!this.scene.buildingUpgrades) this.scene.buildingUpgrades = {};

    switch (upgradeKey) {
      case 'VETERAN_TRAINING':
        this.scene.buildingUpgrades.veteranTraining = true;
        // Apply to existing combat units
        if (this.scene.units) {
          this.scene.units.forEach(unit => {
            if (unit.faction === this.faction &&
                ['guard', 'scout', 'spy'].includes(unit.unitType)) {
              unit.applyHealthBonus(1.25);
            }
          });
        }
        console.log('Barracks: Veteran Training - combat units have +25% HP');
        break;
      case 'COMBAT_DRILLS':
        this.scene.buildingUpgrades.combatDrills = true;
        // Apply to existing combat units
        if (this.scene.units) {
          this.scene.units.forEach(unit => {
            if (unit.faction === this.faction &&
                ['guard', 'scout', 'spy'].includes(unit.unitType)) {
              unit.applyDamageBonus(1.15);
            }
          });
        }
        console.log('Barracks: Combat Drills - combat units deal +15% damage');
        break;
    }
  }

  /**
   * Get upgrade status for UI
   */
  getUpgradeStatus() {
    return {
      upgrades: this.upgrades
    };
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
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Barracks: Military training facility operational - can train Guards and Scouts');

    // Check again in case research center was built while this was under construction
    this.checkForResearchCenter();

    if (this.canProduce.includes('spy')) {
      console.log('Barracks: Spy training available (Research Center detected)');
    }

    // Apply research bonuses
    this.applyResearchBonuses();
  }
}
