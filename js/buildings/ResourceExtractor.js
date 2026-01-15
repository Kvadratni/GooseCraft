// Resource Extractor - Automated resource gathering building

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class ResourceExtractor extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING['RESOURCE_EXTRACTOR'];

    const buildingConfig = {
      type: 'RESOURCE_EXTRACTOR',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'resource-extractor',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Auto-gathering properties
    this.gatherTimer = 0;
    this.gatherInterval = 5000; // Gather every 5 seconds
    this.gatherAmount = 5; // Amount gathered per interval
    this.targetResource = null;

    console.log(`ResourceExtractor: Created at (${x}, ${y})`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only gather when operational
    if (this.state !== 'OPERATIONAL') {
      return;
    }

    // Auto-gather from nearby resources
    this.gatherTimer += delta;

    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      this.attemptGather();
    }
  }

  /**
   * Attempt to gather from nearby resource
   */
  attemptGather() {
    // Find nearest resource within range (100 pixels)
    const nearbyResource = this.findNearestResource(100);

    if (nearbyResource && nearbyResource.hasResources()) {
      const gathered = nearbyResource.gather(this.gatherAmount);

      if (gathered > 0) {
        const resourceType = nearbyResource.getResourceType();

        // Add directly to stockpile
        if (this.scene.resourceManager) {
          this.scene.resourceManager.addResources(resourceType, gathered);
          console.log(`ResourceExtractor: Auto-gathered ${gathered} ${resourceType}`);
        }
      }
    }
  }

  /**
   * Find nearest resource node
   */
  findNearestResource(maxDistance) {
    if (!this.scene.resourceNodes) {
      return null;
    }

    let nearest = null;
    let nearestDist = maxDistance;

    this.scene.resourceNodes.forEach(node => {
      if (node.active && node.hasResources()) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);

        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = node;
        }
      }
    });

    return nearest;
  }

  /**
   * Called when construction completes
   */
  onConstructionComplete() {
    console.log('ResourceExtractor: Now operational, will auto-gather resources');
  }
}
