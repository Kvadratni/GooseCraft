// Resource Manager - Central resource tracking

import { STORAGE, STARTING_RESOURCES } from '../utils/Constants.js';

export default class ResourceManager {
  constructor(scene) {
    this.scene = scene;

    // Current resources
    this.resources = {
      food: STARTING_RESOURCES.food,
      water: STARTING_RESOURCES.water,
      sticks: STARTING_RESOURCES.sticks,
      stone: STARTING_RESOURCES.stone,
      tools: STARTING_RESOURCES.tools
    };

    // Storage limits
    this.storageLimits = {
      food: STORAGE.FOOD,
      water: STORAGE.WATER,
      sticks: STORAGE.STICKS,
      stone: STORAGE.STONE,
      tools: STORAGE.TOOLS
    };

    console.log('ResourceManager: Initialized with starting resources', this.resources);
  }

  /**
   * Check if there's storage space for any resource type
   */
  hasAnyStorageSpace() {
    for (const [type, limit] of Object.entries(this.storageLimits)) {
      if (this.resources[type] < limit) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there's storage space for a specific resource
   */
  hasStorageSpaceFor(type) {
    if (!this.storageLimits.hasOwnProperty(type)) return true;
    return this.resources[type] < this.storageLimits[type];
  }

  /**
   * Add resources
   */
  addResources(type, amount) {
    // Validate inputs
    if (typeof type !== 'string') {
      console.error(`ResourceManager: Invalid type parameter (expected string, got ${typeof type})`);
      return false;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error(`ResourceManager: Invalid amount parameter (expected number, got ${typeof amount})`);
      return false;
    }

    if (amount < 0) {
      console.error(`ResourceManager: Cannot add negative amount (${amount})`);
      return false;
    }

    if (amount === 0) {
      return true; // No-op but not an error
    }

    if (!this.resources.hasOwnProperty(type)) {
      console.warn(`ResourceManager: Unknown resource type: ${type}`);
      return false;
    }

    const currentAmount = this.resources[type];
    const limit = this.storageLimits[type];
    const spaceAvailable = limit - currentAmount;

    if (spaceAvailable <= 0) {
      console.log(`ResourceManager: Storage full for ${type}`);
      return false;
    }

    // Add resources, capped at storage limit
    const amountToAdd = Math.min(amount, spaceAvailable);
    this.resources[type] += amountToAdd;

    console.log(`ResourceManager: Added ${amountToAdd} ${type}, total: ${this.resources[type]}/${limit}`);

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Remove resources (for building costs, etc.)
   */
  removeResources(type, amount) {
    // Validate inputs
    if (typeof type !== 'string') {
      console.error(`ResourceManager: Invalid type parameter (expected string, got ${typeof type})`);
      return false;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error(`ResourceManager: Invalid amount parameter (expected number, got ${typeof amount})`);
      return false;
    }

    if (amount < 0) {
      console.error(`ResourceManager: Cannot remove negative amount (${amount})`);
      return false;
    }

    if (amount === 0) {
      return true; // No-op but not an error
    }

    if (!this.resources.hasOwnProperty(type)) {
      console.warn(`ResourceManager: Unknown resource type: ${type}`);
      return false;
    }

    if (this.resources[type] < amount) {
      console.log(`ResourceManager: Insufficient ${type}: ${this.resources[type]}/${amount}`);
      return false;
    }

    this.resources[type] -= amount;
    console.log(`ResourceManager: Removed ${amount} ${type}, remaining: ${this.resources[type]}`);

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Check if we have enough resources for a cost
   */
  canAfford(cost) {
    // Validate input
    if (!cost || typeof cost !== 'object' || Array.isArray(cost)) {
      console.error(`ResourceManager: Invalid cost parameter (expected object, got ${typeof cost})`);
      return false;
    }

    for (const [type, amount] of Object.entries(cost)) {
      // Validate amount is a valid number
      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        console.error(`ResourceManager: Invalid cost amount for ${type}: ${amount}`);
        return false;
      }

      // Check if resource type exists
      if (!this.resources.hasOwnProperty(type)) {
        console.warn(`ResourceManager: Unknown resource type in cost: ${type}`);
        return false;
      }

      // Check if we have enough
      if (this.resources[type] < amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Spend resources for a cost
   */
  spend(cost) {
    if (!this.canAfford(cost)) {
      return false;
    }

    for (const [type, amount] of Object.entries(cost)) {
      this.removeResources(type, amount);
    }

    return true;
  }

  /**
   * Get current resource amount
   */
  getAmount(type) {
    return this.resources[type] || 0;
  }

  /**
   * Get storage limit
   */
  getLimit(type) {
    return this.storageLimits[type] || 0;
  }

  /**
   * Increase storage limit (when building storage structures)
   */
  increaseStorageLimit(type, amount) {
    // Validate inputs
    if (typeof type !== 'string') {
      console.error(`ResourceManager: Invalid type parameter (expected string, got ${typeof type})`);
      return false;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error(`ResourceManager: Invalid amount parameter (expected number, got ${typeof amount})`);
      return false;
    }

    if (amount < 0) {
      console.error(`ResourceManager: Cannot increase storage by negative amount (${amount})`);
      return false;
    }

    if (!this.storageLimits.hasOwnProperty(type)) {
      console.warn(`ResourceManager: Unknown resource type: ${type}`);
      return false;
    }

    this.storageLimits[type] += amount;
    console.log(`ResourceManager: Increased ${type} storage to ${this.storageLimits[type]}`);
    this.updateUI();
    return true;
  }

  /**
   * Get all resources
   */
  getResources() {
    return { ...this.resources };
  }

  /**
   * Update UI with current resources
   */
  updateUI() {
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.updateResources) {
      uiScene.updateResources(
        this.resources.food, this.resources.water, this.resources.sticks, this.resources.stone, this.resources.tools,
        this.storageLimits.food, this.storageLimits.water, this.storageLimits.sticks, this.storageLimits.stone, this.storageLimits.tools
      );
    }
  }

  /**
   * Serialize state for saving
   */
  toJSON() {
    return {
      resources: { ...this.resources },
      storageLimits: { ...this.storageLimits }
    };
  }

  /**
   * Restore state from load
   */
  fromJSON(data) {
    if (!data) return;

    if (data.resources) {
      this.resources = { ...data.resources };
    }

    if (data.storageLimits) {
      this.storageLimits = { ...data.storageLimits };
    }

    console.log('ResourceManager: Restored state from save');
    this.updateUI();
  }
}
