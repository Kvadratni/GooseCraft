// ResourceStorage - Storage expansion building

import Building from '../entities/Building.js';
import { BUILDING, STORAGE } from '../utils/Constants.js';

export default class ResourceStorage extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.RESOURCE_STORAGE;

    const buildingConfig = {
      type: 'RESOURCE_STORAGE',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'resource-extractor',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Track if shelving bonus was applied
    this.shelvingBonusApplied = false;

    console.log(`ResourceStorage: Created at (${x}, ${y})`);
  }

  /**
   * Override construction complete to apply storage bonuses
   */
  onConstructionComplete() {
    console.log('ResourceStorage: Storage facility operational - increasing storage limits');

    // Check if shelving research is complete
    const hasShelvingBonus = this.scene.researchUpgrades?.advancedShelving || false;
    const multiplier = hasShelvingBonus ? 1.5 : 1.0;

    // Apply storage bonuses to resource manager
    const resourceManager = this.scene.resourceManager;
    if (resourceManager) {
      const foodBonus = Math.floor(STORAGE.FOOD_PER_STORAGE * multiplier);
      const waterBonus = Math.floor(STORAGE.WATER_PER_STORAGE * multiplier);
      const sticksBonus = Math.floor(STORAGE.STICKS_PER_STORAGE * multiplier);
      const stoneBonus = Math.floor(STORAGE.STONE_PER_STORAGE * multiplier);
      const toolsBonus = Math.floor(STORAGE.TOOLS_PER_STORAGE * multiplier);

      resourceManager.increaseStorageLimit('food', foodBonus);
      resourceManager.increaseStorageLimit('water', waterBonus);
      resourceManager.increaseStorageLimit('sticks', sticksBonus);
      resourceManager.increaseStorageLimit('stone', stoneBonus);
      resourceManager.increaseStorageLimit('tools', toolsBonus);

      // Track applied bonuses for potential shelving upgrade later
      this.appliedBonuses = {
        food: foodBonus,
        water: waterBonus,
        sticks: sticksBonus,
        stone: stoneBonus,
        tools: toolsBonus
      };

      if (hasShelvingBonus) {
        this.shelvingBonusApplied = true;
      }

      console.log(`ResourceStorage: Storage limits increased${hasShelvingBonus ? ' (with shelving bonus)' : ''}:`);
      console.log(`  Food: +${foodBonus} (now ${resourceManager.getLimit('food')})`);
      console.log(`  Water: +${waterBonus} (now ${resourceManager.getLimit('water')})`);
      console.log(`  Sticks: +${sticksBonus} (now ${resourceManager.getLimit('sticks')})`);
      console.log(`  Stone: +${stoneBonus} (now ${resourceManager.getLimit('stone')})`);
      console.log(`  Tools: +${toolsBonus} (now ${resourceManager.getLimit('tools')})`);
    }
  }

  /**
   * Apply shelving bonus retroactively (called when research completes)
   */
  applyShelvingBonus() {
    if (this.shelvingBonusApplied) {
      console.log('ResourceStorage: Shelving bonus already applied');
      return;
    }

    if (this.state !== 'OPERATIONAL') {
      console.log('ResourceStorage: Not operational yet, bonus will apply when complete');
      return;
    }

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager || !this.appliedBonuses) return;

    // Add the extra 50% bonus
    const extraFood = Math.floor(STORAGE.FOOD_PER_STORAGE * 0.5);
    const extraWater = Math.floor(STORAGE.WATER_PER_STORAGE * 0.5);
    const extraSticks = Math.floor(STORAGE.STICKS_PER_STORAGE * 0.5);
    const extraStone = Math.floor(STORAGE.STONE_PER_STORAGE * 0.5);
    const extraTools = Math.floor(STORAGE.TOOLS_PER_STORAGE * 0.5);

    resourceManager.increaseStorageLimit('food', extraFood);
    resourceManager.increaseStorageLimit('water', extraWater);
    resourceManager.increaseStorageLimit('sticks', extraSticks);
    resourceManager.increaseStorageLimit('stone', extraStone);
    resourceManager.increaseStorageLimit('tools', extraTools);

    this.shelvingBonusApplied = true;

    console.log('ResourceStorage: Applied Advanced Shelving bonus (+50% capacity)');
  }
}
