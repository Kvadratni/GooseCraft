// Tests for IsometricUtils

import {
  gridToWorld,
  worldToGrid,
  worldToGridInt,
  isWithinBounds,
  calculateDepth
} from '../../js/utils/IsometricUtils.js';

describe('IsometricUtils', () => {
  describe('gridToWorld', () => {
    it('should convert grid (0, 0) to world (0, 0)', () => {
      const result = gridToWorld(0, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should convert grid (1, 0) correctly', () => {
      const result = gridToWorld(1, 0);
      expect(result.x).toBe(32); // TILE.WIDTH_HALF = 32
      expect(result.y).toBe(16); // TILE.HEIGHT_HALF = 16
    });

    it('should convert grid (0, 1) correctly', () => {
      const result = gridToWorld(0, 1);
      expect(result.x).toBe(-32);
      expect(result.y).toBe(16);
    });
  });

  describe('worldToGrid', () => {
    it('should convert world (0, 0) to grid (0, 0)', () => {
      const result = worldToGrid(0, 0);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it('should be inverse of gridToWorld', () => {
      const gridPos = { x: 5, y: 10 };
      const worldPos = gridToWorld(gridPos.x, gridPos.y);
      const backToGrid = worldToGrid(worldPos.x, worldPos.y);

      expect(backToGrid.x).toBeCloseTo(gridPos.x);
      expect(backToGrid.y).toBeCloseTo(gridPos.y);
    });
  });

  describe('worldToGridInt', () => {
    it('should return integer grid coordinates', () => {
      const result = worldToGridInt(35, 20);
      expect(Number.isInteger(result.x)).toBe(true);
      expect(Number.isInteger(result.y)).toBe(true);
    });

    it('should floor floating point coordinates', () => {
      const result = worldToGridInt(35.7, 20.9);
      expect(result.x).toBe(1);
      expect(result.y).toBe(0);
    });
  });

  describe('isWithinBounds', () => {
    it('should return true for coordinates within bounds', () => {
      expect(isWithinBounds(5, 5, 50, 50)).toBe(true);
      expect(isWithinBounds(0, 0, 50, 50)).toBe(true);
      expect(isWithinBounds(49, 49, 50, 50)).toBe(true);
    });

    it('should return false for coordinates outside bounds', () => {
      expect(isWithinBounds(-1, 5, 50, 50)).toBe(false);
      expect(isWithinBounds(5, -1, 50, 50)).toBe(false);
      expect(isWithinBounds(50, 5, 50, 50)).toBe(false);
      expect(isWithinBounds(5, 50, 50, 50)).toBe(false);
    });
  });

  describe('calculateDepth', () => {
    it('should calculate depth based on position', () => {
      const depth1 = calculateDepth(0, 100, 0);
      const depth2 = calculateDepth(0, 200, 0);

      // Objects further down (higher Y) should have higher depth
      expect(depth2).toBeGreaterThan(depth1);
    });

    it('should account for height offset', () => {
      const depth1 = calculateDepth(100, 100, 0);
      const depth2 = calculateDepth(100, 100, 50);

      // Taller objects should have higher depth
      expect(depth2).toBeGreaterThan(depth1);
    });
  });
});
