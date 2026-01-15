// Barracks - Combat Unit Production Building

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
    this.canProduce = ['guard', 'scout']; // Barracks produces combat units
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
  }
}
