// Coop - Main Base Building

import Building from '../entities/Building.js';
import ProductionQueue from '../systems/ProductionQueue.js';
import { BUILDING } from '../utils/Constants.js';

export default class Coop extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.COOP;

    const buildingConfig = {
      type: 'COOP',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'command-center',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Production capability
    this.productionQueue = new ProductionQueue(this, scene);
    this.canProduce = ['worker']; // Coop produces workers

    // Coop is built instantly (starting building)
    this.constructionProgress = 100;
    this.constructionTimer = this.constructionTime;
    this.completeConstruction();
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
    console.log('Coop: Main base operational - can produce workers');
  }
}
