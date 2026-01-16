// Mine - Stone extraction building
// Stone can ONLY be obtained by placing a Mine on rock terrain tiles

import Building from '../entities/Building.js';
import { BUILDING, TILE } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';

export default class Mine extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.MINE;

    const buildingConfig = {
      type: 'MINE',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'mine',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Auto-gathering properties
    this.gatherTimer = 0;
    this.gatherInterval = 5000; // Gather every 5 seconds
    this.baseGatherAmount = 3; // Base stone per interval per rock tile

    // Calculate rock tile coverage (how many rock tiles the mine is on)
    this.rockTileCount = this.countRockTiles();

    // Effective gather amount based on rock tiles (0 if not on any rock)
    this.gatherAmount = this.rockTileCount * this.baseGatherAmount;

    console.log(`Mine: Created at (${x}, ${y}), on ${this.rockTileCount} rock tiles, generates ${this.gatherAmount} stone per cycle`);
  }

  /**
   * Count how many rock tiles the mine's footprint covers
   * Checks a 3x3 area around the mine center
   */
  countRockTiles() {
    const isometricMap = this.scene.isometricMap;
    if (!isometricMap) return 0;

    // Get grid position of mine center
    const centerGrid = worldToGridInt(this.x, this.y);

    let rockCount = 0;

    // Check 3x3 area around the mine (footprint)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = centerGrid.x + dx;
        const checkY = centerGrid.y + dy;

        const tile = isometricMap.getTile(checkX, checkY);
        if (tile && tile.terrainType === 'rock') {
          rockCount++;
        }
      }
    }

    return rockCount;
  }

  /**
   * Check if mine can produce stone (must be on at least 1 rock tile)
   */
  canProduceStone() {
    return this.rockTileCount > 0;
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only generate stone when operational and on rock tiles
    if (this.state !== 'OPERATIONAL') {
      return;
    }

    // Don't generate if not on any rock tiles
    if (!this.canProduceStone()) {
      return;
    }

    // Auto-generate stone based on rock tile coverage
    this.gatherTimer += delta;

    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      this.generateStone();
    }
  }

  /**
   * Generate stone based on rock tile coverage
   */
  generateStone() {
    if (this.gatherAmount <= 0) {
      return;
    }

    // Add directly to player/AI resources based on faction
    const resourceManager = this.scene.resourceManager;
    if (resourceManager && this.faction === 'PLAYER') {
      resourceManager.addResources('stone', this.gatherAmount);
      console.log(`Mine: Generated ${this.gatherAmount} stone (${this.rockTileCount} rock tiles)`);
    } else if (this.faction === 'ENEMY_AI' && this.scene.aiManager) {
      // AI mines add to AI resources
      this.scene.aiManager.resources.stone += this.gatherAmount;
      console.log(`AI Mine: Generated ${this.gatherAmount} stone`);
    }
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    if (this.canProduceStone()) {
      console.log(`Mine: Stone extraction facility operational - generating ${this.gatherAmount} stone every ${this.gatherInterval/1000}s from ${this.rockTileCount} rock tiles`);
    } else {
      console.log('Mine: WARNING - Not on any rock tiles! No stone will be generated. Build on rock terrain for stone extraction.');
    }
  }

  /**
   * Get status text for UI
   */
  getStatusText() {
    if (!this.canProduceStone()) {
      return 'No rock tiles - no production';
    }
    return `Mining ${this.gatherAmount} stone/${this.gatherInterval/1000}s`;
  }
}
