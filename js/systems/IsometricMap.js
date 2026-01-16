// Isometric Map System

import { TILE, MAP, DEPTH, COLORS } from '../utils/Constants.js';
import { gridToWorld, worldToGridInt, isWithinBounds } from '../utils/IsometricUtils.js';

export default class IsometricMap {
  constructor(scene) {
    this.scene = scene;
    this.gridWidth = MAP.GRID_WIDTH;
    this.gridHeight = MAP.GRID_HEIGHT;

    // 2D array for tile data [x][y]
    this.tiles = [];

    // 2D array for pathfinding (0 = walkable, 1 = blocked)
    this.pathfindingGrid = [];

    // Container for all terrain sprites
    this.terrainContainer = scene.add.container(0, 0);
    this.terrainContainer.setDepth(DEPTH.TERRAIN);

    this.initialize();
  }

  /**
   * Initialize the map with terrain
   */
  initialize() {
    console.log('IsometricMap: Initializing map...');

    // Create tile grid [x][y] for easy access
    for (let x = 0; x < this.gridWidth; x++) {
      this.tiles[x] = [];

      for (let y = 0; y < this.gridHeight; y++) {
        // Determine terrain type
        const terrainType = this.generateTerrainType(x, y);

        // Store tile data
        this.tiles[x][y] = {
          x,
          y,
          terrainType,
          walkable: terrainType !== 'water',
          occupied: false,
          sprite: null
        };
      }
    }

    // Create pathfinding grid [y][x] for EasyStar.js (row-major order)
    for (let y = 0; y < this.gridHeight; y++) {
      this.pathfindingGrid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Set pathfinding grid (0 = walkable, 1 = blocked)
        this.pathfindingGrid[y][x] = this.tiles[x][y].walkable ? 0 : 1;
      }
    }

    // Render the terrain
    this.renderTerrain();

    console.log(`IsometricMap: Generated ${this.gridWidth}x${this.gridHeight} map`);
  }

  /**
   * Generate terrain type for a tile - Varied terrain with snow, rock, sand
   */
  generateTerrainType(x, y) {
    // Base spawn area - southwest quadrant (always flat grass)
    const baseAreaX = this.gridWidth * 0.3;
    const baseAreaY = this.gridHeight * 0.3;
    const distFromBase = Math.sqrt(Math.pow(x - baseAreaX, 2) + Math.pow(y - baseAreaY, 2));

    // Ensure base area is flat grassland (radius of 10 tiles)
    if (distFromBase < 10) {
      return 'grass';
    }

    // AI base area - northeast quadrant (also flat grass)
    const aiBaseAreaX = this.gridWidth * 0.7;
    const aiBaseAreaY = this.gridHeight * 0.7;
    const distFromAIBase = Math.sqrt(Math.pow(x - aiBaseAreaX, 2) + Math.pow(y - aiBaseAreaY, 2));
    if (distFromAIBase < 10) {
      return 'grass';
    }

    // Simple horizontal river across the middle with regular crossings
    const riverY = this.gridHeight / 2;
    const distFromRiver = Math.abs(y - riverY);

    // River is 4 tiles wide
    if (distFromRiver < 2 && x > 5 && x < this.gridWidth - 5) {
      // Add crossings every 8 tiles
      const crossingSpacing = 8;
      const nearCrossing = (x % crossingSpacing) < 3;

      if (nearCrossing) {
        return 'grass';  // Crossing point
      }

      return 'water';  // River
    }

    // Multiple water lakes scattered around the map for easier water access
    // Large lake near player base (southwest) - main water source
    const lake1Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.2, 2) + Math.pow(y - this.gridHeight * 0.2, 2));
    if (lake1Dist < 7 && distFromBase > 10) {
      return 'water';
    }

    // Large lake in the northwest
    const lake2Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.15, 2) + Math.pow(y - this.gridHeight * 0.6, 2));
    if (lake2Dist < 6) {
      return 'water';
    }

    // Lake near AI base (northeast area)
    const lake3Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.8, 2) + Math.pow(y - this.gridHeight * 0.85, 2));
    if (lake3Dist < 6 && distFromAIBase > 10) {
      return 'water';
    }

    // Medium pond in the east
    const lake4Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.9, 2) + Math.pow(y - this.gridHeight * 0.4, 2));
    if (lake4Dist < 5) {
      return 'water';
    }

    // Large pond in the center-north
    const lake5Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.5, 2) + Math.pow(y - this.gridHeight * 0.25, 2));
    if (lake5Dist < 6) {
      return 'water';
    }

    // Medium pond in the center-south
    const lake6Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.4, 2) + Math.pow(y - this.gridHeight * 0.75, 2));
    if (lake6Dist < 5) {
      return 'water';
    }

    // Oasis near player start - closer and larger
    const oasisDist = Math.sqrt(Math.pow(x - this.gridWidth * 0.35, 2) + Math.pow(y - this.gridHeight * 0.3, 2));
    if (oasisDist < 5 && distFromBase > 6) {
      return 'water';
    }

    // Additional pond in southeast
    const lake7Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.7, 2) + Math.pow(y - this.gridHeight * 0.5, 2));
    if (lake7Dist < 4) {
      return 'water';
    }

    // Additional pond near center
    const lake8Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.55, 2) + Math.pow(y - this.gridHeight * 0.55, 2));
    if (lake8Dist < 4) {
      return 'water';
    }

    // Random element for variety (deterministic based on position)
    const randomFactor = (Math.sin(x * 7.3 + y * 11.7) * 0.5 + 0.5);
    const randomFactor2 = (Math.cos(x * 3.1 + y * 5.9) * 0.5 + 0.5);

    // Snow region - northern area (top of map, low Y values)
    const snowZoneY = this.gridHeight * 0.15;
    if (y < snowZoneY && distFromBase > 15) {
      // Snow terrain in the north
      const snowNoise = Math.sin(x * 0.15 + y * 0.1) * Math.cos(x * 0.08);
      if (snowNoise > 0.3 || randomFactor > 0.7) {
        return 'snow';
      }
      // Ice near water
      if (distFromRiver < 5 && randomFactor > 0.5) {
        return 'ice';
      }
    }

    // Rocky mountain region - eastern side
    const rockZoneX = this.gridWidth * 0.85;
    if (x > rockZoneX && distFromAIBase > 12) {
      const rockNoise = Math.sin(x * 0.2) * Math.cos(y * 0.15);
      if (rockNoise > 0.2 || randomFactor2 > 0.6) {
        return 'rock';
      }
    }

    // Multiple rock deposits scattered around the map for mine placement
    // Rock deposit near player base
    const rock1Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.35, 2) + Math.pow(y - this.gridHeight * 0.2, 2));
    if (rock1Dist < 4 && distFromBase > 10) {
      return 'rock';
    }

    // Rock deposit in the northwest
    const rock2Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.1, 2) + Math.pow(y - this.gridHeight * 0.4, 2));
    if (rock2Dist < 5) {
      return 'rock';
    }

    // Rock deposit in the center
    const rock3Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.5, 2) + Math.pow(y - this.gridHeight * 0.6, 2));
    if (rock3Dist < 4) {
      return 'rock';
    }

    // Rock deposit near AI base
    const rock4Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.65, 2) + Math.pow(y - this.gridHeight * 0.8, 2));
    if (rock4Dist < 4 && distFromAIBase > 10) {
      return 'rock';
    }

    // Rock deposit in the south
    const rock5Dist = Math.sqrt(Math.pow(x - this.gridWidth * 0.3, 2) + Math.pow(y - this.gridHeight * 0.85, 2));
    if (rock5Dist < 3) {
      return 'rock';
    }

    // Scattered rock outcrops throughout the map
    const rockClusterNoise = Math.sin(x * 0.3 + y * 0.25) * Math.cos(x * 0.1 - y * 0.2);
    if (rockClusterNoise > 0.75 && distFromBase > 15 && distFromAIBase > 15) {
      return 'rock';
    }

    // Sandy beaches near water
    if (distFromRiver < 4 && distFromRiver >= 2) {
      if (randomFactor > 0.4) {
        return 'sand';
      }
    }

    // Sandy area in the southwest corner
    const sandZoneDist = Math.sqrt(Math.pow(x - this.gridWidth * 0.1, 2) + Math.pow(y - this.gridHeight * 0.5, 2));
    if (sandZoneDist < 8 && distFromBase > 12) {
      return 'sand';
    }

    // Scattered dirt patches (all walkable)
    const dirtNoise = Math.sin(x * 0.25) * Math.cos(y * 0.22);
    if (dirtNoise > 0.65 && randomFactor > 0.5 && distFromBase > 8) {
      return 'dirt';
    }

    // Small random dirt spots
    if (randomFactor < 0.05 && distFromBase > 6) {
      return 'dirt';
    }

    // Everything else is grass (maximum accessibility)
    return 'grass';
  }

  /**
   * Render all terrain tiles
   */
  renderTerrain() {
    console.log('IsometricMap: Rendering terrain...');

    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.renderTile(x, y);
      }
    }
  }

  /**
   * Render a single tile
   */
  renderTile(gridX, gridY) {
    const tile = this.tiles[gridX][gridY];
    const worldPos = gridToWorld(gridX, gridY);

    // Get texture key based on terrain type
    let textureKey;
    switch (tile.terrainType) {
      case 'grass':
        textureKey = 'ground';
        break;
      case 'dirt':
        textureKey = 'dirt';
        break;
      case 'water':
        textureKey = 'water';
        break;
      case 'sand':
        textureKey = 'sand';
        break;
      case 'rock':
        textureKey = 'rock';
        break;
      case 'snow':
        textureKey = 'snow';
        break;
      case 'ice':
        textureKey = 'ice';
        break;
      default:
        textureKey = 'ground';
    }

    // Create sprite for the tile
    const sprite = this.scene.add.sprite(
      worldPos.x + TILE.WIDTH_HALF,
      worldPos.y + TILE.HEIGHT_HALF,
      textureKey
    );

    // For proper 2:1 isometric ratio, rotate 45 degrees and scale Y to 0.5 of X
    sprite.setAngle(45);

    // Calculate scale for isometric diamond (2:1 ratio)
    // The rotated tile should create a diamond that's 64 pixels wide and 32 pixels tall
    const baseScale = (TILE.WIDTH * 1.45) / 1024; // Base scale for width
    sprite.setScale(baseScale, baseScale * 0.5); // Y scale is half of X for 2:1 ratio

    sprite.setOrigin(0.5, 0.5);
    sprite.setAlpha(0.98); // Slightly higher alpha for better visibility

    // Add to container
    this.terrainContainer.add(sprite);

    // Store reference
    tile.sprite = sprite;
  }

  /**
   * Get tile at grid coordinates
   */
  getTile(gridX, gridY) {
    if (!isWithinBounds(gridX, gridY, this.gridWidth, this.gridHeight)) {
      return null;
    }
    return this.tiles[gridX][gridY];
  }

  /**
   * Get tile at world coordinates
   */
  getTileAtWorldPos(worldX, worldY) {
    const grid = worldToGridInt(worldX, worldY);
    return this.getTile(grid.x, grid.y);
  }

  /**
   * Check if a tile is walkable
   */
  isWalkable(gridX, gridY) {
    const tile = this.getTile(gridX, gridY);
    return tile && tile.walkable && !tile.occupied;
  }

  /**
   * Set a tile as occupied (by building)
   */
  setOccupied(gridX, gridY, occupied) {
    const tile = this.getTile(gridX, gridY);
    if (tile) {
      tile.occupied = occupied;
      // Update pathfinding grid [y][x]
      this.pathfindingGrid[gridY][gridX] = occupied ? 1 : (tile.walkable ? 0 : 1);
    }
  }

  /**
   * Get the pathfinding grid for EasyStar
   */
  getPathfindingGrid() {
    return this.pathfindingGrid;
  }

  /**
   * Update pathfinding grid (e.g., when building is placed)
   */
  updatePathfinding(gridX, gridY, walkable) {
    if (isWithinBounds(gridX, gridY, this.gridWidth, this.gridHeight)) {
      // Update pathfinding grid [y][x]
      this.pathfindingGrid[gridY][gridX] = walkable ? 0 : 1;
    }
  }

  /**
   * Highlight a tile (for building placement preview)
   */
  highlightTile(gridX, gridY, color = 0x00ff00, alpha = 0.3) {
    const tile = this.getTile(gridX, gridY);
    if (!tile) return null;

    const worldPos = gridToWorld(gridX, gridY);

    // Create highlight overlay
    const highlight = this.scene.add.graphics();
    highlight.fillStyle(color, alpha);

    // Draw diamond
    highlight.beginPath();
    highlight.moveTo(worldPos.x + TILE.WIDTH_HALF, worldPos.y);
    highlight.lineTo(worldPos.x + TILE.WIDTH, worldPos.y + TILE.HEIGHT_HALF);
    highlight.lineTo(worldPos.x + TILE.WIDTH_HALF, worldPos.y + TILE.HEIGHT);
    highlight.lineTo(worldPos.x, worldPos.y + TILE.HEIGHT_HALF);
    highlight.closePath();
    highlight.fillPath();

    highlight.setDepth(DEPTH.SELECTION);

    return highlight;
  }

  /**
   * Get world position from grid coordinates
   */
  getWorldPos(gridX, gridY) {
    return gridToWorld(gridX, gridY);
  }

  /**
   * Get center world position from grid coordinates
   */
  getWorldPosCenter(gridX, gridY) {
    const world = gridToWorld(gridX, gridY);
    return {
      x: world.x + TILE.WIDTH_HALF,
      y: world.y + TILE.HEIGHT_HALF
    };
  }
}
