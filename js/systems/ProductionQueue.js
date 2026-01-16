// Production Queue System - Manages unit/resource production for buildings

import Goose from '../entities/Goose.js';
import Guard from '../entities/Guard.js';
import Scout from '../entities/Scout.js';
import Spy from '../entities/Spy.js';
import Honker from '../entities/Honker.js';
import AirUnit from '../entities/AirUnit.js';
import { UNIT_COSTS, UNIT_TRAIN_TIME } from '../utils/Constants.js';

export default class ProductionQueue {
  constructor(building, scene) {
    this.building = building;
    this.scene = scene;
    this.queue = []; // Array of {unitType, progress, totalTime, cost}
    this.currentProduction = null;
    this.maxQueueSize = 5;

    // Speed multiplier (from upgrades like Hatchery)
    this.speedMultiplier = 1.0;

    console.log(`ProductionQueue: Created for ${building.buildingName}`);
  }

  /**
   * Set speed multiplier (from building upgrades)
   */
  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = multiplier;
    console.log(`ProductionQueue: Speed multiplier set to ${multiplier}x`);
  }

  /**
   * Add unit to production queue
   */
  addToQueue(unitType, resourceManager = null) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('ProductionQueue: Queue is full');
      return false;
    }

    // Get unit cost and train time
    const cost = UNIT_COSTS[unitType.toUpperCase()];
    const trainTime = UNIT_TRAIN_TIME[unitType.toUpperCase()];

    if (!cost || !trainTime) {
      console.error(`ProductionQueue: Unknown unit type: ${unitType}`);
      return false;
    }

    // Check if can afford (if resource manager provided)
    if (resourceManager && !resourceManager.canAfford(cost)) {
      console.warn(`ProductionQueue: Cannot afford ${unitType}`);
      return false;
    }

    // Deduct resources
    if (resourceManager && !resourceManager.spend(cost)) {
      console.warn(`ProductionQueue: Failed to spend resources for ${unitType}`);
      return false;
    }

    // Add to queue
    const productionItem = {
      unitType: unitType,
      progress: 0,
      totalTime: trainTime,
      cost: cost
    };

    this.queue.push(productionItem);
    console.log(`ProductionQueue: Added ${unitType} to queue (${this.queue.length}/${this.maxQueueSize})`);

    // Start production if not currently producing
    if (!this.currentProduction) {
      this.startNextProduction();
    }

    return true;
  }

  /**
   * Start next item in queue
   */
  startNextProduction() {
    if (this.queue.length === 0) {
      this.currentProduction = null;
      return;
    }

    this.currentProduction = this.queue[0];
    console.log(`ProductionQueue: Started producing ${this.currentProduction.unitType}`);
  }

  /**
   * Update production progress
   */
  update(delta) {
    if (!this.currentProduction) {
      // Check if there's anything in queue
      if (this.queue.length > 0) {
        this.startNextProduction();
      }
      return;
    }

    // Calculate effective delta with multipliers
    let effectiveDelta = delta * this.speedMultiplier;

    // Apply power boost from nearby Power Station (20% faster)
    if (this.building.powerBoosted) {
      effectiveDelta *= 1.2;
      // Reset power boost flag (will be re-applied by Power Station each frame)
      this.building.powerBoosted = false;
    }

    // Update progress
    this.currentProduction.progress += effectiveDelta;

    // Check if production complete
    if (this.currentProduction.progress >= this.currentProduction.totalTime) {
      this.completeProduction();
    }
  }

  /**
   * Complete current production
   */
  completeProduction() {
    if (!this.currentProduction) return;

    const unitType = this.currentProduction.unitType;
    console.log(`ProductionQueue: Completed ${unitType} production`);

    // Spawn the unit
    this.spawnUnit(unitType);

    // Remove from queue
    this.queue.shift();

    // Start next production
    this.currentProduction = null;
    if (this.queue.length > 0) {
      this.startNextProduction();
    }
  }

  /**
   * Spawn completed unit near building
   */
  spawnUnit(unitType) {
    // Find a spawn location near the building
    const spawnOffset = 80;
    const maxAttempts = 8;
    let spawnX, spawnY;
    let foundValid = false;

    // Try different angles around the building
    for (let i = 0; i < maxAttempts; i++) {
      const angle = (i / maxAttempts) * Math.PI * 2;
      const testX = this.building.x + Math.cos(angle) * spawnOffset;
      const testY = this.building.y + Math.sin(angle) * spawnOffset;

      // Check if position is walkable
      const gridPos = {
        x: Math.floor(testX / 32),
        y: Math.floor(testY / 16)
      };

      if (this.scene.isometricMap && this.scene.isometricMap.isWalkable(gridPos.x, gridPos.y)) {
        spawnX = testX;
        spawnY = testY;
        foundValid = true;
        break;
      }
    }

    // Fallback to building position if no valid spawn found
    if (!foundValid) {
      spawnX = this.building.x + 50;
      spawnY = this.building.y + 30;
    }

    // Create the unit based on type
    let unit;
    const faction = this.building.faction;

    switch (unitType.toLowerCase()) {
      case 'worker':
        unit = new Goose(this.scene, spawnX, spawnY, faction);
        break;
      case 'guard':
        unit = new Guard(this.scene, spawnX, spawnY, faction);
        break;
      case 'scout':
        unit = new Scout(this.scene, spawnX, spawnY, faction);
        break;
      case 'spy':
        unit = new Spy(this.scene, spawnX, spawnY, faction);
        break;
      case 'honker':
        unit = new Honker(this.scene, spawnX, spawnY, faction);
        break;
      case 'air-unit':
        unit = new AirUnit(this.scene, spawnX, spawnY, faction);
        break;
      default:
        console.error(`ProductionQueue: Unknown unit type for spawning: ${unitType}`);
        return;
    }

    // Add to game scene
    this.scene.units.push(unit);
    console.log(`ProductionQueue: Spawned ${unitType} at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
  }

  /**
   * Cancel current production
   */
  cancelProduction() {
    if (!this.currentProduction) return;

    console.log(`ProductionQueue: Cancelled ${this.currentProduction.unitType} production`);

    // Could optionally refund partial resources here

    // Remove from queue
    this.queue.shift();

    // Start next
    this.currentProduction = null;
    if (this.queue.length > 0) {
      this.startNextProduction();
    }
  }

  /**
   * Get queue status for UI
   */
  getQueueStatus() {
    if (!this.currentProduction) {
      return {
        isProducing: false,
        queueLength: this.queue.length
      };
    }

    const progressPercent = (this.currentProduction.progress / this.currentProduction.totalTime) * 100;
    const timeRemaining = this.currentProduction.totalTime - this.currentProduction.progress;

    return {
      isProducing: true,
      currentUnit: this.currentProduction.unitType,
      progress: progressPercent,
      timeRemaining: timeRemaining,
      queueLength: this.queue.length
    };
  }
}
