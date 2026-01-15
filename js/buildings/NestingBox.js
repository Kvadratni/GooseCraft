// Nesting Box - Worker Production Building

import Building from '../entities/Building.js';
import ProductionQueue from '../systems/ProductionQueue.js';
import { BUILDING } from '../utils/Constants.js';

export default class NestingBox extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.NESTING_BOX;

    const buildingConfig = {
      type: 'NESTING_BOX',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'airstrip',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production capability
    this.productionQueue = new ProductionQueue(this, scene);
    this.canProduce = ['worker']; // Nesting Box produces workers
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
    console.log('NestingBox: Worker breeding facility operational');
  }
}
