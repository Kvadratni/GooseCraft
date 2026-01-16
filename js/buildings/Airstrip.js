// Airstrip - Air Unit Production Building

import Building from '../entities/Building.js';
import ProductionQueue from '../systems/ProductionQueue.js';
import { BUILDING } from '../utils/Constants.js';

export default class Airstrip extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.AIRSTRIP;

    const buildingConfig = {
      type: 'AIRSTRIP',
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
    this.canProduce = ['maverick']; // Airstrip produces Mavericks
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
    console.log('Airstrip: Aerial operations facility operational - can train Mavericks');
  }
}
