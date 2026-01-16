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
    this.canProduce = ['guard', 'scout']; // Base units, spy unlocked by Research Center

    // Check if Research Center already exists (for barracks built after research center)
    this.checkForResearchCenter();
  }

  /**
   * Check if a Research Center exists and unlock spy if so
   */
  checkForResearchCenter() {
    if (!this.scene.buildings) return;

    const hasResearchCenter = this.scene.buildings.some(
      building => building.buildingType === 'RESEARCH_CENTER' &&
                  building.faction === this.faction &&
                  building.state === 'OPERATIONAL'
    );

    if (hasResearchCenter) {
      this.unlockSpy();
    }
  }

  /**
   * Unlock spy unit training (called by Research Center when built)
   */
  unlockSpy() {
    if (!this.canProduce.includes('spy')) {
      this.canProduce.push('spy');
      console.log('Barracks: Spy training unlocked!');
    }
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

    // Check again in case research center was built while this was under construction
    this.checkForResearchCenter();

    if (this.canProduce.includes('spy')) {
      console.log('Barracks: Spy training available (Research Center detected)');
    }
  }
}
