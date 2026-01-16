// ResearchCenter - Unlocks advanced units like Spy

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class ResearchCenter extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.RESEARCH_CENTER;

    const buildingConfig = {
      type: 'RESEARCH_CENTER',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'research',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    console.log(`ResearchCenter: Created at (${x}, ${y})`);
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('ResearchCenter: Research facility operational - Spy units now available at Barracks');

    // Notify all barracks that spy training is now available
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.buildingType === 'BARRACKS' && building.faction === this.faction) {
          building.unlockSpy();
        }
      });
    }
  }
}
