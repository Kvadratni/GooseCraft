// Fog of War System

import { MAP, TILE, FACTIONS } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';

export default class FogOfWar {
  constructor(scene) {
    this.scene = scene;

    // Enabled state (can be toggled for debugging)
    this.enabled = true;

    // Fog state for each tile: 0=unexplored, 1=explored, 2=visible
    this.fogState = [];
    for (let y = 0; y < (this.scene.mapHeight || MAP.GRID_HEIGHT); y++) {
      this.fogState[y] = [];
      for (let x = 0; x < (this.scene.mapWidth || MAP.GRID_WIDTH); x++) {
        this.fogState[y][x] = 0; // All tiles start unexplored
      }
    }

    // Create fog overlay graphics
    this.fogGraphics = scene.add.graphics();
    this.fogGraphics.setDepth(9999); // Very high depth, but below UI
    this.fogGraphics.setScrollFactor(1); // Ensure fog scrolls with camera

    // Reveal fog around starting base
    this.revealInitialArea();

    console.log('FogOfWar: Initialized');
  }

  /**
   * Reveal fog around player's starting base
   */
  revealInitialArea() {
    // Match the player spawn location from GameScene (30% from left, 30% from top)
    const startGridX = Math.floor((this.scene.mapWidth || MAP.GRID_WIDTH) * 0.3);
    const startGridY = Math.floor((this.scene.mapHeight || MAP.GRID_HEIGHT) * 0.3);
    const revealRadius = 15; // Slightly larger radius

    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= revealRadius) {
          const tileX = startGridX + dx;
          const tileY = startGridY + dy;
          if (this.isValidTile(tileX, tileY)) {
            this.fogState[tileY][tileX] = 2; // Visible
          }
        }
      }
    }
  }

  /**
   * Toggle fog of war on/off
   */
  toggle() {
    this.enabled = !this.enabled;

    if (!this.enabled) {
      // When disabled, clear fog graphics and show all entities
      this.fogGraphics.clear();
      this.showAllEntities();
    }

    console.log(`FogOfWar: ${this.enabled ? 'Enabled' : 'Disabled'}`);
    return this.enabled;
  }

  /**
   * Show all entities (when fog is disabled)
   */
  showAllEntities() {
    this.scene.units.forEach(unit => {
      if (unit.active) {
        unit.setVisible(true);
        if (unit.statusText) unit.statusText.setVisible(true);
      }
    });

    this.scene.buildings.forEach(building => {
      if (building.active) building.setVisible(true);
    });

    this.scene.resourceNodes.forEach(node => {
      if (node.active) node.setVisible(true);
    });
  }

  /**
   * Update fog of war (call every frame or periodically)
   */
  update() {
    // Skip if disabled
    if (!this.enabled) return;

    // Reset all explored tiles to "explored but not visible"
    for (let y = 0; y < (this.scene.mapHeight || MAP.GRID_HEIGHT); y++) {
      for (let x = 0; x < (this.scene.mapWidth || MAP.GRID_WIDTH); x++) {
        if (this.fogState[y][x] === 2) {
          this.fogState[y][x] = 1; // Explored
        }
      }
    }

    // Reveal fog around player units and buildings
    this.revealAroundPlayerUnits();
    this.revealAroundPlayerBuildings();

    // Update visibility of units and buildings
    this.updateEntityVisibility();

    // Draw fog overlay
    this.drawFogOverlay();
  }

  /**
   * Reveal fog around player units
   */
  revealAroundPlayerUnits() {
    this.scene.units.forEach(unit => {
      if (unit.faction === FACTIONS.PLAYER && unit.active) {
        const gridPos = worldToGridInt(unit.x, unit.y);
        this.revealArea(gridPos.x, gridPos.y, unit.visionRange || 5);
      }
    });
  }

  /**
   * Reveal fog around player buildings
   */
  revealAroundPlayerBuildings() {
    this.scene.buildings.forEach(building => {
      if (building.faction === FACTIONS.PLAYER && building.active) {
        const gridPos = worldToGridInt(building.x, building.y);
        this.revealArea(gridPos.x, gridPos.y, 8);
      }
    });
  }

  /**
   * Reveal area around a grid position
   */
  revealArea(centerX, centerY, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const tileX = centerX + dx;
          const tileY = centerY + dy;
          if (this.isValidTile(tileX, tileY)) {
            this.fogState[tileY][tileX] = 2; // Visible
          }
        }
      }
    }
  }

  /**
   * Check if tile coordinates are valid
   */
  isValidTile(x, y) {
    return x >= 0 && x < (this.scene.mapWidth || MAP.GRID_WIDTH) && y >= 0 && y < (this.scene.mapHeight || MAP.GRID_HEIGHT);
  }

  /**
   * Update visibility of units and buildings based on fog state
   */
  updateEntityVisibility() {
    // Hide enemy units that are not in visible fog
    this.scene.units.forEach(unit => {
      if (!unit.active) return;

      const gridPos = worldToGridInt(unit.x, unit.y);
      const isVisible = this.isVisible(gridPos.x, gridPos.y);

      // Enemy units are only visible in fog-revealed areas
      if (unit.faction === FACTIONS.ENEMY_AI) {
        unit.setVisible(isVisible);
        if (unit.selectionCircle) unit.selectionCircle.setVisible(false);
        if (unit.statusText) unit.statusText.setVisible(isVisible);
      } else {
        // Player units are always visible
        unit.setVisible(true);
      }
    });

    // Hide enemy buildings that are not in visible fog
    this.scene.buildings.forEach(building => {
      if (!building.active) return;

      const gridPos = worldToGridInt(building.x, building.y);
      const isVisible = this.isVisible(gridPos.x, gridPos.y);

      // Enemy buildings are only visible in fog-revealed areas
      if (building.faction === FACTIONS.ENEMY_AI) {
        building.setVisible(isVisible);
      } else {
        // Player buildings are always visible
        building.setVisible(true);
      }
    });

    // Hide resource nodes in unexplored areas
    this.scene.resourceNodes.forEach(node => {
      if (!node.active) return;

      const gridPos = worldToGridInt(node.x, node.y);
      const isExplored = this.isExplored(gridPos.x, gridPos.y);

      // Resources are visible once explored (even if not currently visible)
      node.setVisible(isExplored);
    });
  }

  /**
   * Check if a tile is visible to the player
   */
  isVisible(gridX, gridY) {
    if (!this.isValidTile(gridX, gridY)) return false;
    return this.fogState[gridY][gridX] === 2;
  }

  /**
   * Check if a tile has been explored
   */
  isExplored(gridX, gridY) {
    if (!this.isValidTile(gridX, gridY)) return false;
    return this.fogState[gridY][gridX] >= 1;
  }

  /**
   * Draw fog overlay on screen
   */
  drawFogOverlay() {
    this.fogGraphics.clear();

    const camera = this.scene.cameras.main;

    // Get camera world bounds (accounting for zoom)
    const zoom = camera.zoom || 1;
    const camX = camera.scrollX;
    const camY = camera.scrollY;
    const camWidth = camera.width / zoom;
    const camHeight = camera.height / zoom;

    // For isometric maps, we need to check a diamond-shaped area
    // Simplified approach: check all tiles within a reasonable range of camera center
    const camCenterX = camX + camWidth / 2;
    const camCenterY = camY + camHeight / 2;

    // Convert camera center to approximate grid position
    const centerGrid = worldToGridInt(camCenterX, camCenterY);

    // Calculate how many tiles we need to check in each direction
    // At minimum zoom (0.25), we can see 4x more area, so need larger range
    const baseRange = 60;
    const tileRange = Math.ceil(baseRange / zoom);

    // Extended bounds to cover tiles even outside map (we'll draw black for those)
    const extendedBounds = {
      minX: centerGrid.x - tileRange,
      maxX: centerGrid.x + tileRange,
      minY: centerGrid.y - tileRange,
      maxY: centerGrid.y + tileRange
    };

    // Draw fog tiles (including out-of-bounds areas which get full black)
    for (let gridY = extendedBounds.minY; gridY < extendedBounds.maxY; gridY++) {
      for (let gridX = extendedBounds.minX; gridX < extendedBounds.maxX; gridX++) {
        // Check if this tile is outside the valid map bounds
        const isOutOfBounds = gridX < 0 || gridX >= (this.scene.mapWidth || MAP.GRID_WIDTH) ||
                              gridY < 0 || gridY >= (this.scene.mapHeight || MAP.GRID_HEIGHT);

        if (isOutOfBounds) {
          // Outside map bounds - solid black
          this.drawFogTile(gridX, gridY, 0x000000, 1.0);
        } else {
          const fogLevel = this.fogState[gridY][gridX];

          if (fogLevel === 0) {
            // Unexplored - black overlay
            this.drawFogTile(gridX, gridY, 0x000000, 0.9);
          } else if (fogLevel === 1) {
            // Explored but not visible - dark translucent shadow
            this.drawFogTile(gridX, gridY, 0x000000, 0.4);
          }
          // fogLevel === 2 means currently visible - no overlay
        }
      }
    }
  }

  /**
   * Draw a single fog tile (isometric diamond)
   */
  drawFogTile(gridX, gridY, color, alpha) {
    const worldPos = this.scene.isometricMap.getWorldPosCenter(gridX, gridY);

    this.fogGraphics.fillStyle(color, alpha);

    // Draw diamond shape for isometric tile
    const hw = TILE.WIDTH_HALF;
    const hh = TILE.HEIGHT_HALF;

    this.fogGraphics.beginPath();
    this.fogGraphics.moveTo(worldPos.x, worldPos.y - hh); // Top
    this.fogGraphics.lineTo(worldPos.x + hw, worldPos.y); // Right
    this.fogGraphics.lineTo(worldPos.x, worldPos.y + hh); // Bottom
    this.fogGraphics.lineTo(worldPos.x - hw, worldPos.y); // Left
    this.fogGraphics.closePath();
    this.fogGraphics.fillPath();
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.fogGraphics) {
      this.fogGraphics.destroy();
    }
  }
}
