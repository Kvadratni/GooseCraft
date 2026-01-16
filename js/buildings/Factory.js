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
    this.productionTime = TOOL_PRODUCTION.PRODUCTION_TIME;
    this.autoProduction = TOOL_PRODUCTION.AUTO_PRODUCTION;

    // Production queue
    this.productionQueue = 0;  // Number of tools queued
    this.productionProgress = 0;
    this.isProducing = false;
    this.maxQueue = 10;

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
   * Queue tool production (called from UI button)
   */
  queueToolProduction() {
    if (this.faction !== 'PLAYER') return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return false;

    // Check if queue is full
    if (this.productionQueue >= this.maxQueue) {
      console.log('Factory: Production queue is full');
      return false;
    }

    // Check if we have enough sticks
    if (resourceManager.resources.sticks < this.sticksPerTool) {
      console.log(`Factory: Not enough sticks (need ${this.sticksPerTool}, have ${resourceManager.resources.sticks})`);
      return false;
    }

    // Deduct sticks and add to queue
    resourceManager.removeResources('sticks', this.sticksPerTool);
    this.productionQueue++;
    console.log(`Factory: Queued tool production (${this.productionQueue} in queue)`);

    return true;
  }

  /**
   * Update tool production
   */
  updateProduction(delta) {
    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return;

    // Only process player faction
    if (this.faction !== 'PLAYER') return;

    // Auto-production: if enabled and we have resources, auto-queue
    if (this.autoProduction && this.productionQueue < this.maxQueue) {
      if (resourceManager.resources.sticks >= this.sticksPerTool) {
        this.queueToolProduction();
      }
    }

    // Nothing in queue
    if (this.productionQueue === 0) {
      this.isProducing = false;
      this.productionProgress = 0;
      return;
    }

    // Start producing if not already
    if (!this.isProducing) {
      this.isProducing = true;
      this.productionProgress = 0;
      console.log('Factory: Started producing tool');
    }

    // Update progress
    this.productionProgress += delta;

    // Check if complete
    if (this.productionProgress >= this.productionTime) {
      // Produce the tool
      resourceManager.addResources('tools', 1);
      console.log('Factory: Tool produced!');

      // Reduce queue and reset progress
      this.productionQueue--;
      this.productionProgress = 0;
      this.isProducing = this.productionQueue > 0;
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
    if (!this.isProducing && this.productionQueue === 0) {
      return {
        isProducing: false,
        queue: 0,
        cost: this.sticksPerTool,
        autoProduction: this.autoProduction
      };
    }

    const progressPercent = (this.productionProgress / this.productionTime) * 100;
    const timeRemaining = this.productionTime - this.productionProgress;

    return {
      isProducing: this.isProducing,
      queue: this.productionQueue,
      progress: progressPercent,
      timeRemaining: timeRemaining,
      cost: this.sticksPerTool,
      autoProduction: this.autoProduction
    };
  }

  /**
   * Queue batch tool production (5 tools for 20 sticks)
   */
  queueBatchProduction() {
    if (this.faction !== 'PLAYER') return false;
    if (!this.upgrades.BATCH_PRODUCTION.purchased) return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return false;

    const batchCost = 20; // 20 sticks for 5 tools (instead of 25)

    if (this.productionQueue + 5 > this.maxQueue) {
      console.log('Factory: Not enough queue space for batch');
      return false;
    }

    if (resourceManager.resources.sticks < batchCost) {
      console.log(`Factory: Not enough sticks for batch (need ${batchCost})`);
      return false;
    }

    resourceManager.removeResources('sticks', batchCost);
    this.productionQueue += 5;
    console.log(`Factory: Batch queued - 5 tools for ${batchCost} sticks`);
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
    console.log(`Factory: Converts ${this.sticksPerTool} sticks into 1 tool (${this.productionTime / 1000}s)`);

    // Apply research bonuses
    if (this.scene.researchUpgrades?.efficientTools) {
      this.reduceCost(3);
    }
    if (this.scene.researchUpgrades?.autoProduction) {
      this.enableAutoProduction();
    }
  }
}
