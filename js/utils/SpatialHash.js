// Spatial Hash Grid for efficient proximity queries

/**
 * Spatial hash grid for fast nearest-neighbor queries
 * Divides world space into a grid of cells for O(1) lookups
 */
export default class SpatialHash {
  constructor(cellSize = 200) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Get cell key for world coordinates
   */
  getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Get all cell keys within a radius
   */
  getCellKeysInRadius(x, y, radius) {
    const keys = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        keys.push(`${centerCellX + dx},${centerCellY + dy}`);
      }
    }

    return keys;
  }

  /**
   * Insert an object into the spatial hash
   */
  insert(object, x, y) {
    const key = this.getCellKey(x, y);

    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }

    this.grid.get(key).add(object);

    // Store position on object for removal
    object._spatialHashKey = key;
    object._spatialHashX = x;
    object._spatialHashY = y;
  }

  /**
   * Remove an object from the spatial hash
   */
  remove(object) {
    if (object._spatialHashKey) {
      const cell = this.grid.get(object._spatialHashKey);
      if (cell) {
        cell.delete(object);
        if (cell.size === 0) {
          this.grid.delete(object._spatialHashKey);
        }
      }
      delete object._spatialHashKey;
      delete object._spatialHashX;
      delete object._spatialHashY;
    }
  }

  /**
   * Update object position in spatial hash
   */
  update(object, newX, newY) {
    const oldKey = object._spatialHashKey;
    const newKey = this.getCellKey(newX, newY);

    // Only update if cell changed
    if (oldKey !== newKey) {
      this.remove(object);
      this.insert(object, newX, newY);
    } else {
      // Update stored position
      object._spatialHashX = newX;
      object._spatialHashY = newY;
    }
  }

  /**
   * Query objects near a point
   */
  queryNearby(x, y, radius) {
    const results = [];
    const keys = this.getCellKeysInRadius(x, y, radius);

    for (const key of keys) {
      const cell = this.grid.get(key);
      if (cell) {
        for (const object of cell) {
          results.push(object);
        }
      }
    }

    return results;
  }

  /**
   * Find nearest object to a point (within radius)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} maxRadius - Maximum search radius
   * @param {function} filterFn - Optional filter function
   * @returns {object|null} Nearest object or null
   */
  findNearest(x, y, maxRadius, filterFn = null) {
    const candidates = this.queryNearby(x, y, maxRadius);

    let nearest = null;
    let nearestDistSq = maxRadius * maxRadius;

    for (const obj of candidates) {
      // Apply filter if provided
      if (filterFn && !filterFn(obj)) {
        continue;
      }

      const dx = obj._spatialHashX - x;
      const dy = obj._spatialHashY - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = obj;
      }
    }

    return nearest;
  }

  /**
   * Find all objects matching filter within radius
   */
  findAll(x, y, radius, filterFn = null) {
    const candidates = this.queryNearby(x, y, radius);
    const results = [];
    const radiusSq = radius * radius;

    for (const obj of candidates) {
      // Apply filter if provided
      if (filterFn && !filterFn(obj)) {
        continue;
      }

      const dx = obj._spatialHashX - x;
      const dy = obj._spatialHashY - y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        results.push({ object: obj, distance: Math.sqrt(distSq) });
      }
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Clear all objects from the spatial hash
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Get stats about the spatial hash
   */
  getStats() {
    let totalObjects = 0;
    let maxCellSize = 0;

    for (const cell of this.grid.values()) {
      const size = cell.size;
      totalObjects += size;
      maxCellSize = Math.max(maxCellSize, size);
    }

    return {
      cellCount: this.grid.size,
      totalObjects,
      avgObjectsPerCell: totalObjects / Math.max(1, this.grid.size),
      maxCellSize
    };
  }
}
