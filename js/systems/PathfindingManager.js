// Pathfinding Manager - A* Pathfinding using EasyStar.js

export default class PathfindingManager {
  constructor(scene, isometricMap) {
    this.scene = scene;
    this.isometricMap = isometricMap;

    // Initialize EasyStar
    this.easystar = new EasyStar.js();

    // Setup pathfinding
    this.setupPathfinding();

    // Pending path requests
    this.pendingRequests = 0;

    // Track if grid needs updating (optimization)
    this.gridDirty = false;
    this.dirtyCells = []; // Track specific dirty cells

    console.log('PathfindingManager: Initialized');
  }

  /**
   * Setup EasyStar.js with the map grid
   */
  setupPathfinding() {
    const grid = this.isometricMap.getPathfindingGrid();

    // Set the grid for pathfinding
    this.easystar.setGrid(grid);

    // Set which tiles are walkable (0 = walkable)
    this.easystar.setAcceptableTiles([0]);

    // Enable diagonal movement
    this.easystar.enableDiagonals();

    // Disable corner cutting for more realistic movement
    this.easystar.disableCornerCutting();

    // Set iterations per calculation (higher = faster but may cause lag)
    this.easystar.setIterationsPerCalculation(1000);

    console.log('PathfindingManager: Grid configured');
  }

  /**
   * Find a path from start to end
   * @param {number} startX - Start grid X
   * @param {number} startY - Start grid Y
   * @param {number} endX - End grid X
   * @param {number} endY - End grid Y
   * @param {function} callback - Callback function(path) where path is array of {x, y}
   */
  findPath(startX, startY, endX, endY, callback) {
    // Update grid if it has changed since last pathfinding
    if (this.gridDirty) {
      if (this.dirtyCells.length > 50) {
        // If too many changes, just replace the whole grid
        const grid = this.isometricMap.getPathfindingGrid();
        this.easystar.setGrid(grid);
        console.log(`PathfindingManager: Grid fully updated (too many dirty cells: ${this.dirtyCells.length})`);
      } else {
        // Update specific cells
        const grid = this.isometricMap.getPathfindingGrid();
        for (const cell of this.dirtyCells) {
          // EasyStar accepts (x, y) arrays, not objects, for targeted updates if using setAdditionalPointCost, 
          // but since our map is dynamic, we'll extract the value from our main grid array directly or use the underlying grid structure.
          // However, since easyStar.setGrid() does a deep copy internally by default, the most reliable optimization 
          // without hacking easystar internals is to still use setGrid but batch it.
          // Since we can't do per-cell updates reliably with easystar v0.4.4, we'll continue using setGrid but batch them.
          // (EasyStar actually does allow modifying instances but `setGrid` is safer for now).
        }
        this.easystar.setGrid(grid);
        console.log(`PathfindingManager: Grid updated (${this.dirtyCells.length} cells modified)`);
      }
      this.dirtyCells = [];
      this.gridDirty = false;
    }

    // Validate coordinates
    if (!this.isValidCoordinate(startX, startY) || !this.isValidCoordinate(endX, endY)) {
      console.warn('PathfindingManager: Invalid coordinates', { startX, startY, endX, endY });
      callback(null);
      return;
    }

    // Special case: already at destination
    if (startX === endX && startY === endY) {
      console.log('PathfindingManager: Already at destination, returning current position as path');
      callback([{ x: startX, y: startY }]);
      return;
    }

    // Check if start position is walkable
    if (!this.isometricMap.isWalkable(startX, startY)) {
      console.warn('PathfindingManager: Start position not walkable', { startX, startY });
      // Try to find a nearby walkable tile
      const nearbyWalkable = this.findNearestWalkableTile(startX, startY);
      if (nearbyWalkable) {
        console.log(`PathfindingManager: Using nearby walkable tile (${nearbyWalkable.x}, ${nearbyWalkable.y}) instead`);
        startX = nearbyWalkable.x;
        startY = nearbyWalkable.y;
      } else {
        callback(null);
        return;
      }
    }

    // Check if end position is walkable
    if (!this.isometricMap.isWalkable(endX, endY)) {
      console.warn('PathfindingManager: End position not walkable', { endX, endY });
      // Try to find a nearby walkable tile
      const nearbyWalkable = this.findNearestWalkableTile(endX, endY);
      if (nearbyWalkable) {
        console.log(`PathfindingManager: Using nearby walkable tile (${nearbyWalkable.x}, ${nearbyWalkable.y}) instead`);
        endX = nearbyWalkable.x;
        endY = nearbyWalkable.y;
      } else {
        callback(null);
        return;
      }
    }

    this.pendingRequests++;

    this.easystar.findPath(startX, startY, endX, endY, (path) => {
      this.pendingRequests--;

      if (path === null) {
        console.warn('PathfindingManager: No path found', { startX, startY, endX, endY });
        // Debug: check what's blocking
        const startTile = this.isometricMap.getTile(startX, startY);
        const endTile = this.isometricMap.getTile(endX, endY);
        console.log('PathfindingManager: Start tile:', startTile ?
          `walkable=${startTile.walkable}, occupied=${startTile.occupied}, terrain=${startTile.terrainType}` : 'null');
        console.log('PathfindingManager: End tile:', endTile ?
          `walkable=${endTile.walkable}, occupied=${endTile.occupied}, terrain=${endTile.terrainType}` : 'null');
        callback(null);
      } else {
        // Path found
        console.log(`PathfindingManager: Path found with ${path.length} nodes`);
        callback(path);
      }
    });

    // Calculate paths
    this.easystar.calculate();
  }

  /**
   * Check if coordinates are valid
   */
  isValidCoordinate(x, y) {
    return x >= 0 && x < this.isometricMap.gridWidth &&
      y >= 0 && y < this.isometricMap.gridHeight;
  }

  /**
   * Update the pathfinding grid (when buildings are placed/removed)
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {boolean} walkable - Is the tile walkable?
   */
  updateGrid(gridX, gridY, walkable) {
    if (!this.isValidCoordinate(gridX, gridY)) {
      return;
    }

    // Get current grid
    const grid = this.isometricMap.getPathfindingGrid();

    // Update the tile
    grid[gridY][gridX] = walkable ? 0 : 1;

    // Mark grid as dirty
    this.gridDirty = true;
    this.dirtyCells.push({ x: gridX, y: gridY });
  }

  /**
   * Block multiple tiles (e.g., for a building footprint)
   * @param {Array} tiles - Array of {x, y} coordinates
   * @param {boolean} walkable - Are tiles walkable?
   */
  updateMultipleTiles(tiles, walkable) {
    const grid = this.isometricMap.getPathfindingGrid();

    tiles.forEach(tile => {
      if (this.isValidCoordinate(tile.x, tile.y)) {
        grid[tile.y][tile.x] = walkable ? 0 : 1;
        this.dirtyCells.push({ x: tile.x, y: tile.y });
      }
    });

    // Mark grid as dirty
    this.gridDirty = true;
  }

  /**
   * Get distance estimate between two points (Manhattan distance)
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @returns {number} Distance
   */
  getDistanceEstimate(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Check if there are pending pathfinding calculations
   * @returns {boolean}
   */
  hasPendingRequests() {
    return this.pendingRequests > 0;
  }

  /**
   * Find nearest walkable tile to a given position
   * @param {number} gridX - Target grid X
   * @param {number} gridY - Target grid Y
   * @param {number} maxRadius - Maximum search radius (default 5)
   * @returns {{x: number, y: number} | null} - Nearest walkable tile or null
   */
  findNearestWalkableTile(gridX, gridY, maxRadius = 5) {
    // First check the tile itself
    if (this.isValidCoordinate(gridX, gridY) &&
      this.isometricMap.isWalkable(gridX, gridY)) {
      return { x: gridX, y: gridY };
    }

    // Check in expanding circles
    for (let radius = 1; radius <= maxRadius; radius++) {
      // Collect all tiles at this radius and sort by true distance
      const candidates = [];

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check tiles at current radius ring (not inside)
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const testX = gridX + dx;
            const testY = gridY + dy;

            if (this.isValidCoordinate(testX, testY) &&
              this.isometricMap.isWalkable(testX, testY)) {
              // Calculate true Euclidean distance
              const dist = Math.sqrt(dx * dx + dy * dy);
              candidates.push({ x: testX, y: testY, dist: dist });
            }
          }
        }
      }

      // Return the closest one at this radius
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.dist - b.dist);
        return { x: candidates[0].x, y: candidates[0].y };
      }
    }

    return null;
  }
}
