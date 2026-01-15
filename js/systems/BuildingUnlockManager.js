// Building Unlock Manager - Tracks building progression

import { BUILDING } from '../utils/Constants.js';

export default class BuildingUnlockManager {
  constructor(scene) {
    this.scene = scene;

    // Track built buildings by type
    this.builtBuildings = {};

    // Initialize all building types with count 0
    for (const buildingType in BUILDING) {
      this.builtBuildings[BUILDING[buildingType].name] = 0;
    }

    // Start with 1 Coop (starting building)
    this.builtBuildings['Coop'] = 1;

    console.log('BuildingUnlockManager: Initialized');
  }

  /**
   * Called when a building is completed
   */
  onBuildingCompleted(buildingName) {
    if (!this.builtBuildings.hasOwnProperty(buildingName)) {
      this.builtBuildings[buildingName] = 0;
    }

    this.builtBuildings[buildingName]++;
    console.log(`BuildingUnlockManager: ${buildingName} completed (total: ${this.builtBuildings[buildingName]})`);

    // Check if any new buildings should be unlocked
    this.checkUnlocks();
  }

  /**
   * Check if any new buildings are unlocked
   */
  checkUnlocks() {
    // Notify UI to update available buildings
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.updateBuildMenu) {
      uiScene.updateBuildMenu();
    }
  }

  /**
   * Check if a building is unlocked
   */
  isBuildingUnlocked(buildingKey) {
    const building = BUILDING[buildingKey];

    if (!building) {
      return false;
    }

    // Check if building is buildable
    if (!building.buildable) {
      return false;
    }

    // Tier 1 buildings are always available
    if (building.tier <= 1) {
      return true;
    }

    // Check unlock condition if exists
    if (building.unlockCondition) {
      const requiredBuilding = building.unlockCondition.building;
      const requiredCount = building.unlockCondition.count;

      const builtCount = this.builtBuildings[requiredBuilding] || 0;

      if (builtCount < requiredCount) {
        return false;  // Unlock condition not met
      }
    }

    return true;
  }

  /**
   * Get all unlocked buildings
   */
  getUnlockedBuildings() {
    const unlocked = [];

    for (const buildingKey in BUILDING) {
      if (this.isBuildingUnlocked(buildingKey)) {
        unlocked.push(buildingKey);
      }
    }

    return unlocked;
  }

  /**
   * Get unlock status message for a building
   */
  getUnlockMessage(buildingKey) {
    const building = BUILDING[buildingKey];

    if (!building || !building.unlockCondition) {
      return null;
    }

    const requiredBuilding = building.unlockCondition.building;
    const requiredCount = building.unlockCondition.count;
    const builtCount = this.builtBuildings[requiredBuilding] || 0;

    if (builtCount < requiredCount) {
      const buildingConfig = Object.values(BUILDING).find(b => b.name === requiredBuilding);
      const displayName = buildingConfig ? buildingConfig.displayName : requiredBuilding;
      return `Requires ${requiredCount}x ${displayName}`;
    }

    return null;
  }

  /**
   * Get count of built buildings of a type
   */
  getBuildingCount(buildingName) {
    return this.builtBuildings[buildingName] || 0;
  }
}
