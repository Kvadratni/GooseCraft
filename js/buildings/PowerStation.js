// PowerStation - Advanced energy facility with passive bonuses

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class PowerStation extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.POWER_STATION;

    const buildingConfig = {
      type: 'POWER_STATION',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'power-station',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Resource generation timer
    this.generateTimer = 0;
    this.generateInterval = 10000; // Generate resources every 10 seconds

    console.log(`PowerStation: Created at (${x}, ${y})`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only generate when operational
    if (this.state !== 'OPERATIONAL') {
      return;
    }

    // Passive resource generation
    this.generateTimer += delta;

    if (this.generateTimer >= this.generateInterval) {
      this.generateTimer = 0;
      this.generateResources();
    }
  }

  /**
   * Generate passive resources
   */
  generateResources() {
    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return;

    // Power Station generates a small amount of tools passively
    // This helps late-game production
    resourceManager.addResources('tools', 1);

    console.log('PowerStation: Generated 1 tool from energy conversion');
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('PowerStation: Energy facility operational - generating passive tool production');
  }
}
