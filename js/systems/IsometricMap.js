// Isometric Map System

import { TILE, MAP, DEPTH, COLORS } from '../utils/Constants.js';
import { gridToWorld, worldToGridInt, isWithinBounds } from '../utils/IsometricUtils.js';
import NoiseManager from '../utils/NoiseManager.js';

export default class IsometricMap {
  constructor(scene) {
    this.scene = scene;
    this.gridWidth = scene.mapConfig?.width || MAP.GRID_WIDTH;
    this.gridHeight = scene.mapConfig?.height || MAP.GRID_HEIGHT;
    this.seed = scene.mapConfig?.seed || this.generateRandomSeed();
    this.noise = new NoiseManager(this.seed);

    // 2D array for tile data [x][y]
    this.tiles = [];

    // 2D array for pathfinding (0 = walkable, 1 = blocked)
    this.pathfindingGrid = [];

    // Container for all terrain sprites
    this.terrainContainer = scene.add.container(0, 0);
    this.terrainContainer.setDepth(DEPTH.TERRAIN);

    // Sprite pooling for camera culling
    this.terrainPool = [];
    this.activeTerrainTiles = new Map(); // Key: "x,y", Value: Sprite

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

    // We no longer call renderTerrain() here. Sprites are dynamically 
    // evaluated and pooled inside update() based on the camera view.

    console.log(`IsometricMap: Generated ${this.gridWidth}x${this.gridHeight} map`);
  }

  /**
   * Helper to generate a random string seed if one isn't provided
   */
  generateRandomSeed() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Generate terrain type for a tile using Procedural Simplex Noise.
   */
  generateTerrainType(x, y) {
    // 1) Force flatten 4 quadrants to guarantee playable starts for up to 4 players
    const w = this.gridWidth;
    const h = this.gridHeight;
    const corners = [
      { x: w * 0.15, y: h * 0.15 }, // Top-left
      { x: w * 0.85, y: h * 0.85 }, // Bottom-right
      { x: w * 0.85, y: h * 0.15 }, // Top-right
      { x: w * 0.15, y: h * 0.85 }  // Bottom-left
    ];

    for (const corner of corners) {
      const dist = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
      if (dist < 12) return 'grass';
    }

    // Scale factors tuned to produce large coherent continents/biomes
    const macroScale = 0.02;
    const microScale = 0.08;

    // Evaluate Elevation: combines large overlapping hills (macro) with bumpy detail (micro)
    const elevationMacro = this.noise.noise2D(x * macroScale, y * macroScale);
    const elevationMicro = this.noise.noise2D(x * microScale + 1000, y * microScale + 1000);
    // Weighted combination favoring large structures
    const elevation = (elevationMacro * 0.8) + (elevationMicro * 0.2);

    // Evaluate Moisture: dictates secondary biome coloring (e.g., grass vs dry dirt vs snow)
    const moistureOffset = 5000;
    const moisture = this.noise.noise2D(x * macroScale + moistureOffset, y * macroScale + moistureOffset);

    // Define Procedural Biomes
    if (elevation < 0.25) {
      // Deep/Shallow Water
      return 'water';
    } else if (elevation < 0.30) {
      // Beach
      return 'sand';
    } else if (elevation > 0.85) {
      // Peaks
      return 'snow';
    } else if (elevation > 0.70) {
      // Mountains
      if (moisture > 0.6) return 'snow'; // Snowy mountains if wet
      return 'rock';
    } else {
      // Plains / Forests (Middle Elevation)
      if (moisture < 0.3) {
        // Dry plains
        return 'dirt';
      } else if (moisture > 0.7 && elevation > 0.5) {
        // Rocky outcrops in wet hills
        return 'rock';
      } else {
        // Standard fertile grassland
        return (Math.random() > 0.9) ? 'dirt' : 'grass';
      }
    }
  }

  /**
   * Helper to determine texture string from terrain enum
   */
  getTextureKeyForType(terrainType) {
    switch (terrainType) {
      case 'grass': return 'ground';
      case 'dirt': return 'dirt';
      case 'water': return 'water';
      case 'sand': return 'sand';
      case 'rock': return 'rock';
      case 'snow': return 'snow';
      case 'ice': return 'ice';
      default: return 'ground';
    }
  }

  /**
   * Dynamic Camera Culling: Show only tiles within the camera bounds.
   * Recycles Sprites into a pool to maintain 60FPS on Large Maps.
   */
  update(camera) {
    if (!camera) return;

    // Get camera bounds in world space
    const zoom = camera.zoom || 1;
    const camX = camera.scrollX;
    const camY = camera.scrollY;
    const camW = camera.width / zoom;
    const camH = camera.height / zoom;

    // Calculate the approximate center of the camera in Grid coordinates
    const centerWorldX = camX + (camW / 2);
    const centerWorldY = camY + (camH / 2);
    const centerGrid = worldToGridInt(centerWorldX, centerWorldY);

    // Heuristic range based on window size and tile size.
    // TILE.WIDTH is 128, TILE.HEIGHT is 64. 
    // We pad the viewport heavily so edges don't pop brightly on screen.
    const rangeX = Math.ceil((camW / TILE.WIDTH) * 1.5);
    const rangeY = Math.ceil((camH / TILE.HEIGHT_HALF) * 1.5);

    const minX = Math.max(0, centerGrid.x - rangeX);
    const maxX = Math.min(this.gridWidth - 1, centerGrid.x + rangeX);
    const minY = Math.max(0, centerGrid.y - rangeY);
    const maxY = Math.min(this.gridHeight - 1, centerGrid.y + rangeY);

    // Keep track of which tiles are designated visible this frame
    const visibleKeys = new Set();

    // Evaluate viewport
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        visibleKeys.add(key);

        // If the tile isn't currently active, wake one up from the pool
        if (!this.activeTerrainTiles.has(key)) {
          const tile = this.tiles[x][y];
          const worldPos = gridToWorld(x, y);
          const textureKey = this.getTextureKeyForType(tile.terrainType);
          let sprite;

          if (this.terrainPool.length > 0) {
            sprite = this.terrainPool.pop();
            sprite.setTexture(textureKey);
            sprite.setPosition(worldPos.x + TILE.WIDTH_HALF, worldPos.y + TILE.HEIGHT_HALF);
            sprite.setVisible(true);
            sprite.setActive(true);
          } else {
            // Allocate a new sprite if the pool is starved
            sprite = this.scene.add.sprite(
              worldPos.x + TILE.WIDTH_HALF,
              worldPos.y + TILE.HEIGHT_HALF,
              textureKey
            );
            sprite.setAngle(45);
            const baseScale = (TILE.WIDTH * 1.45) / 1024;
            sprite.setScale(baseScale, baseScale * 0.5);
            sprite.setOrigin(0.5, 0.5);
            sprite.setAlpha(0.98);
            this.terrainContainer.add(sprite);
          }

          // Point the data model to the recycled sprite
          tile.sprite = sprite;
          this.activeTerrainTiles.set(key, sprite);
        }
      }
    }

    // Culling pass: Any tile currently active but NOT in visibleKeys is off-screen.
    // Return its Sprite to the pool.
    for (const [key, sprite] of this.activeTerrainTiles.entries()) {
      if (!visibleKeys.has(key)) {
        sprite.setVisible(false);
        sprite.setActive(false);
        this.terrainPool.push(sprite);
        this.activeTerrainTiles.delete(key);

        // Null the reference on the data model
        const [gx, gy] = key.split(',').map(Number);
        if (this.tiles[gx] && this.tiles[gx][gy]) {
          this.tiles[gx][gy].sprite = null;
        }
      }
    }
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
