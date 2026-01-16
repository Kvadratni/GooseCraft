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

    console.log(`ResourceStorage: Created at (${x}, ${y})`);
  }

  /**
   * Override construction complete to apply storage bonuses
   */
  onConstructionComplete() {
    console.log('ResourceStorage: Storage facility operational - increasing storage limits');

    // Apply storage bonuses to resource manager
    const resourceManager = this.scene.resourceManager;
    if (resourceManager) {
      resourceManager.increaseStorageLimit('food', STORAGE.FOOD_PER_STORAGE);
      resourceManager.increaseStorageLimit('water', STORAGE.WATER_PER_STORAGE);
      resourceManager.increaseStorageLimit('sticks', STORAGE.STICKS_PER_STORAGE);
      resourceManager.increaseStorageLimit('stone', STORAGE.STONE_PER_STORAGE);
      resourceManager.increaseStorageLimit('tools', STORAGE.TOOLS_PER_STORAGE);

      console.log('ResourceStorage: Storage limits increased:');
      console.log(`  Food: +${STORAGE.FOOD_PER_STORAGE} (now ${resourceManager.getLimit('food')})`);
      console.log(`  Water: +${STORAGE.WATER_PER_STORAGE} (now ${resourceManager.getLimit('water')})`);
      console.log(`  Sticks: +${STORAGE.STICKS_PER_STORAGE} (now ${resourceManager.getLimit('sticks')})`);
      console.log(`  Stone: +${STORAGE.STONE_PER_STORAGE} (now ${resourceManager.getLimit('stone')})`);
      console.log(`  Tools: +${STORAGE.TOOLS_PER_STORAGE} (now ${resourceManager.getLimit('tools')})`);
    }
  }
}
