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
    this.activeTerrainTiles = new Map(); // Key: "x,y", Value: Sprite[]

    // Generate soft-edged terrain textures with feathered alpha borders
    this.createSoftTileTextures();

    this.initialize();
  }

  /**
   * Creates soft-edged versions of every terrain texture by compositing
   * them with a radial gradient alpha mask. The feathered edges overlap
   * with adjacent tiles, creating smooth natural transitions.
   */
  createSoftTileTextures() {
    const size = 1024;
    const terrainKeys = ['ground', 'dirt', 'water', 'sand', 'rock', 'snow', 'ice'];

    // Build the radial gradient mask once
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = size;
    maskCanvas.height = size;
    const maskCtx = maskCanvas.getContext('2d');

    // Radial gradient: fully opaque center → transparent edges
    const gradient = maskCtx.createRadialGradient(
      size / 2, size / 2, size * 0.32,  // Inner radius (opaque core)
      size / 2, size / 2, size * 0.50   // Outer radius (fully transparent)
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    maskCtx.fillStyle = gradient;
    maskCtx.fillRect(0, 0, size, size);

    // Composite each terrain texture with the mask
    for (const key of terrainKeys) {
      const srcTex = this.scene.textures.get(key);
      if (!srcTex || !srcTex.source || !srcTex.source[0]) continue;

      const srcImage = srcTex.source[0].image;
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = size;
      resultCanvas.height = size;
      const ctx = resultCanvas.getContext('2d');

      // Draw the original terrain texture
      ctx.drawImage(srcImage, 0, 0, size, size);

      // Multiply with the alpha mask using 'destination-in'
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0, size, size);

      // Register as 'soft_ground', 'soft_dirt', etc.
      this.scene.textures.addCanvas(`soft_${key}`, resultCanvas);
    }

    console.log('IsometricMap: Created soft-edged terrain textures');
  }

  /**
   * Initialize the map with terrain
   */
  initialize() {
    console.log('IsometricMap: Initializing map...');

    // Phase 1: Generate raw noise map
    const rawMap = [];
    for (let x = 0; x < this.gridWidth; x++) {
      rawMap[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        rawMap[x][y] = this.generateRawTerrain(x, y);
      }
    }

    // Phase 2: Cellular Automata Smoothing Pass (1 iteration)
    for (let x = 0; x < this.gridWidth; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        // Count surrounding biome types
        const neighbors = {};
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
              const neighborType = rawMap[nx][ny].type;
              neighbors[neighborType] = (neighbors[neighborType] || 0) + 1;
            }
          }
        }

        // Find the most common neighbor
        let dominantType = rawMap[x][y].type;
        let dominantZ = rawMap[x][y].z;
        let maxCount = 0;

        for (const [type, count] of Object.entries(neighbors)) {
          if (count > maxCount) {
            maxCount = count;
            dominantType = type;
          }
        }

        // Apply smoothing if heavily surrounded (5+ out of 8 neighbors share a type)
        // Except for forced grass spawns at the corners
        let finalType = rawMap[x][y].type;
        let finalZ = rawMap[x][y].z;

        if (maxCount >= 5 && !rawMap[x][y].isSpawn) {
          finalType = dominantType;
          // Find the z of the dominant type from a neighbor to adopt its height
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                if (rawMap[nx][ny].type === dominantType) {
                  finalZ = rawMap[nx][ny].z;
                  break;
                }
              }
            }
          }
        }

        // Store final tile data
        this.tiles[x][y] = {
          x,
          y,
          terrainType: finalType,
          z: finalZ,
          walkable: finalType !== 'water' && finalZ === 0, // Mountains (z>0) are impassable
          occupied: false,
          sprites: []
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
   * Ensures that all designated spawn points can reach each other via land.
   * If they are blocked by water or mountains, it cuts a path (land bridge or mountain pass).
   * @param {Array} spawnPoints - Array of {x, y} grid coordinate objects
   */
  ensureSpawnConnectivity(spawnPoints) {
    if (!spawnPoints || spawnPoints.length < 2) return;

    console.log('IsometricMap: Verifying spawn connectivity...');

    // 1. Run BFS from the first spawn node to map out the entire reachable continent
    const reachable = new Set();
    const queue = [{ x: spawnPoints[0].x, y: spawnPoints[0].y }];
    reachable.add(`${spawnPoints[0].x},${spawnPoints[0].y}`);

    let safetyIndex = 0;
    const maxSafety = this.gridWidth * this.gridHeight; // Don't infinite loop

    while (queue.length > 0 && safetyIndex++ < maxSafety) {
      const current = queue.shift();

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip self
          // Optional: If we only want cardinal directions, do Math.abs(dx) + Math.abs(dy) === 1

          const nx = current.x + dx;
          const ny = current.y + dy;

          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            const neighborKey = `${nx},${ny}`;

            if (!reachable.has(neighborKey) && this.tiles[nx][ny].walkable) {
              reachable.add(neighborKey);
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    // 2. Check if all other spawn points are in the reachable set
    for (let i = 1; i < spawnPoints.length; i++) {
      const targetSpawn = spawnPoints[i];
      const targetKey = `${targetSpawn.x},${targetSpawn.y}`;

      if (!reachable.has(targetKey)) {
        console.log(`IsometricMap: Spawn ${i} is isolated! Forging a path...`);

        // Find the absolute closest point within the reachable set to build a bridge to
        let nearestReachable = null;
        let minDistance = Infinity;

        // Note: Evaluating the entire set against a point is O(N) but N is just continent size.
        // It's fast enough for map generation time.
        for (const reachableStr of reachable) {
          const [rx, ry] = reachableStr.split(',').map(Number);
          const dist = Math.sqrt(Math.pow(rx - targetSpawn.x, 2) + Math.pow(ry - targetSpawn.y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            nearestReachable = { x: rx, y: ry };
          }
        }

        if (nearestReachable) {
          // Draw a line connecting nearestReachable to targetSpawn, forcing tiles to grass
          this.forgePath(nearestReachable.x, nearestReachable.y, targetSpawn.x, targetSpawn.y, reachable);
        }
      }
    }
  }

  /**
   * Forges a 3-tile wide path bridging two coordinates, forcing terrain to 'grass' and `z=0`.
   */
  forgePath(x0, y0, x1, y1, reachableSet) {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      // Carve out a 3x3 brush stamp at each step so the path is wide enough for large armies
      for (let brushX = -1; brushX <= 1; brushX++) {
        for (let brushY = -1; brushY <= 1; brushY++) {
          const nx = x0 + brushX;
          const ny = y0 + brushY;

          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            const tile = this.tiles[nx][ny];
            tile.terrainType = 'grass';
            tile.z = 0;
            tile.walkable = true;
            this.pathfindingGrid[ny][nx] = 0; // 0 is walkable in EasyStar
            reachableSet.add(`${nx},${ny}`);
          }
        }
      }

      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /**
   * Helper to generate a random string seed if one isn't provided
   */
  generateRandomSeed() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Generate raw terrain data for a tile using Procedural Simplex Noise.
   * Returns { type: string, z: number, isSpawn: boolean }
   */
  generateRawTerrain(x, y) {
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
      if (dist < 12) return { type: 'grass', z: 0, isSpawn: true };
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

    // Define Procedural Biomes matching elevation levels
    if (elevation < 0.25) {
      // Deep/Shallow Water
      return { type: 'water', z: 0, isSpawn: false };
    } else if (elevation < 0.30) {
      // Beach
      return { type: 'sand', z: 0, isSpawn: false };
    } else if (elevation > 0.85) {
      // Peaks (Impassable Mountain)
      return { type: 'snow', z: 2, isSpawn: false };
    } else if (elevation > 0.70) {
      // Mountains (Impassable)
      if (moisture > 0.6) return { type: 'snow', z: 2, isSpawn: false }; // Snowy mountains if wet
      return { type: 'rock', z: 1, isSpawn: false };
    } else {
      // Plains / Forests (Middle Elevation, Z:0)
      if (moisture < 0.3) {
        // Dry plains
        return { type: 'dirt', z: 0, isSpawn: false };
      } else if (moisture > 0.7 && elevation > 0.5) {
        // Rocky outcrops in wet hills (Still passable at Z:0)
        return { type: 'rock', z: 0, isSpawn: false };
      } else {
        // Standard fertile grassland
        return { type: (Math.random() > 0.9) ? 'dirt' : 'grass', z: 0, isSpawn: false };
      }
    }
  }

  /**
   * Helper to determine texture string from terrain enum
   */
  getTextureKeyForType(terrainType) {
    switch (terrainType) {
      case 'grass': return 'soft_ground';
      case 'dirt': return 'soft_dirt';
      case 'water': return 'soft_water';
      case 'sand': return 'soft_sand';
      case 'rock': return 'soft_rock';
      case 'snow': return 'soft_snow';
      case 'ice': return 'soft_ice';
      default: return 'soft_ground';
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
          const spritesArray = [];

          // Isotropic Pillar Rendering: Draw a sprite for every Z level to create a cliff
          for (let layer = 0; layer <= tile.z; layer++) {
            // Lower layers are solid rock to simulate cliff walls, top layer is the actual biome
            const layerType = (layer < tile.z) ? 'rock' : tile.terrainType;
            const textureKey = this.getTextureKeyForType(layerType);
            let sprite;

            if (this.terrainPool.length > 0) {
              sprite = this.terrainPool.pop();
              sprite.setTexture(textureKey);
            } else {
              // Allocate a new sprite if the pool is starved
              sprite = this.scene.add.sprite(
                worldPos.x + TILE.WIDTH_HALF,
                worldPos.y + TILE.HEIGHT_HALF - (layer * TILE.HEIGHT_Z),
                textureKey
              );
              sprite.setAngle(45);
              const baseScale = (TILE.WIDTH * 1.45) / 1024;
              sprite.setScale(baseScale, baseScale * 0.5);
              sprite.setOrigin(0.5, 0.5);
              sprite.setAlpha(0.98);
              this.terrainContainer.add(sprite);
            }

            // Reposition Recycled/New sprites exactly
            sprite.setPosition(
              worldPos.x + TILE.WIDTH_HALF,
              worldPos.y + TILE.HEIGHT_HALF - (layer * TILE.HEIGHT_Z)
            );

            // Depth sort based on visual Y, factoring in elevated Z to ensure mountains draw correctly
            sprite.setDepth(worldPos.y + (worldPos.x * 0.001) + (layer * TILE.HEIGHT_Z));

            sprite.setVisible(true);
            sprite.setActive(true);

            spritesArray.push(sprite);
          }

          // Point the data model to the recycled sprites
          tile.sprites = spritesArray;
          this.activeTerrainTiles.set(key, spritesArray);
        }
      }
    }

    // Culling pass: Any tile currently active but NOT in visibleKeys is off-screen.
    // Return its Sprites to the pool.
    for (const [key, spritesArray] of this.activeTerrainTiles.entries()) {
      if (!visibleKeys.has(key)) {
        spritesArray.forEach(sprite => {
          sprite.setVisible(false);
          sprite.setActive(false);
          this.terrainPool.push(sprite);
        });

        this.activeTerrainTiles.delete(key);

        // Null the reference on the data model
        const [gx, gy] = key.split(',').map(Number);
        if (this.tiles[gx] && this.tiles[gx][gy]) {
          this.tiles[gx][gy].sprites = [];
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
