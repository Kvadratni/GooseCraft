// Factory - Tool Production Building (Manual + Auto with Research)

import Building from '../entities/Building.js';
import { BUILDING, TOOL_PRODUCTION } from '../utils/Constants.js';

export default class Factory extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.FACTORY;

    const buildingConfig = {
      type: 'FACTORY',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'factory',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Tool production settings
    this.sticksPerTool = TOOL_PRODUCTION.STICKS_PER_TOOL;
    this.autoProduction = TOOL_PRODUCTION.AUTO_PRODUCTION;

    // Auto-production timer (only used if auto-production is enabled)
    this.autoProductionTimer = 0;
    this.autoProductionInterval = 5000; // 5 seconds between auto-production

    // Upgrades
    this.upgrades = {
      BATCH_PRODUCTION: {
        name: 'Batch Production',
        description: 'Make 5 tools for 20 sticks (bulk discount)',
        cost: { food: 50, water: 50, sticks: 100, tools: 3 },
        purchased: false
      },
      RECYCLING: {
        name: 'Recycling',
        description: 'Recover 1 tool when units die',
        cost: { food: 75, water: 75, sticks: 150, tools: 5 },
        purchased: false
      }
    };

    // For UI display
    this.canProduce = ['tools'];
  }

  /**
   * Override update to process tool production
   */
  update(time, delta) {
    super.update(time, delta);

    if (this.state === 'OPERATIONAL') {
      this.updateProduction(delta);
    }
  }

  /**
   * Make a tool instantly (called from UI button)
   */
  queueToolProduction() {
    if (this.faction !== 'PLAYER') return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return false;

    // Check if we have enough sticks
    if (resourceManager.resources.sticks < this.sticksPerTool) {
      console.log(`Factory: Not enough sticks (need ${this.sticksPerTool}, have ${resourceManager.resources.sticks})`);
      return false;
    }

    // Instant conversion: sticks -> tool
    resourceManager.removeResources('sticks', this.sticksPerTool);
    resourceManager.addResources('tools', 1);
    console.log(`Factory: Converted ${this.sticksPerTool} sticks into 1 tool`);

    return true;
  }

  /**
   * Update auto-production (if enabled via research)
   */
  updateProduction(delta) {
    // Only process player faction with auto-production enabled
    if (this.faction !== 'PLAYER' || !this.autoProduction) return;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return;

    // Auto-production timer
    this.autoProductionTimer += delta;

    if (this.autoProductionTimer >= this.autoProductionInterval) {
      this.autoProductionTimer = 0;

      // Auto-convert sticks to tools if we have resources
      if (resourceManager.resources.sticks >= this.sticksPerTool) {
        this.queueToolProduction(); // Uses the instant conversion
      }
    }
  }

  /**
   * Enable auto-production (called by Research Center upgrade)
   */
  enableAutoProduction() {
    this.autoProduction = true;
    console.log('Factory: Auto-production enabled!');
  }

  /**
   * Reduce production cost (called by Research Center upgrade)
   */
  reduceCost(newSticksPerTool) {
    this.sticksPerTool = newSticksPerTool;
    console.log(`Factory: Tool cost reduced to ${this.sticksPerTool} sticks`);
  }

  /**
   * Get production status for UI
   */
  getProductionStatus() {
    return {
      isProducing: false, // Instant conversion, no progress bar needed
      cost: this.sticksPerTool,
      autoProduction: this.autoProduction
    };
  }

  /**
   * Make batch tools instantly (5 tools for 20 sticks)
   */
  queueBatchProduction() {
    if (this.faction !== 'PLAYER') return false;
    if (!this.upgrades.BATCH_PRODUCTION.purchased) return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return false;

    const batchCost = 20; // 20 sticks for 5 tools (instead of 25)

    if (resourceManager.resources.sticks < batchCost) {
      console.log(`Factory: Not enough sticks for batch (need ${batchCost})`);
      return false;
    }

    // Instant conversion: 20 sticks -> 5 tools
    resourceManager.removeResources('sticks', batchCost);
    resourceManager.addResources('tools', 5);
    console.log(`Factory: Batch converted - 20 sticks into 5 tools`);
    return true;
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
      console.log(`Factory: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Factory: Purchased ${upgrade.name}!`);

    // Apply upgrade effect
    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'BATCH_PRODUCTION':
        console.log('Factory: Batch Production unlocked - make 5 tools for 20 sticks');
        break;
      case 'RECYCLING':
        if (!this.scene.researchUpgrades) this.scene.researchUpgrades = {};
        this.scene.researchUpgrades.toolRecycling = true;
        console.log('Factory: Recycling active - recover tools when units die');
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
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Factory: Tool production facility operational');
    console.log(`Factory: Converts ${this.sticksPerTool} sticks into 1 tool (instant)`);

    // Apply research bonuses
    if (this.scene.researchUpgrades?.efficientTools) {
      this.reduceCost(3);
    }
    if (this.scene.researchUpgrades?.autoProduction) {
      this.enableAutoProduction();
    }
  }
}
