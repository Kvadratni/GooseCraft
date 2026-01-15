// Tests for SpatialHash

import SpatialHash from '../../js/utils/SpatialHash.js';

describe('SpatialHash', () => {
  let spatialHash;

  beforeEach(() => {
    spatialHash = new SpatialHash(100); // 100px cell size
  });

  describe('insert and query', () => {
    it('should insert and retrieve objects', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      spatialHash.insert(obj1, 50, 50);
      spatialHash.insert(obj2, 150, 150);

      const nearby = spatialHash.queryNearby(50, 50, 50);
      expect(nearby).toContain(obj1);
    });

    it('should store position metadata on objects', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 50, 50);

      expect(obj._spatialHashX).toBe(50);
      expect(obj._spatialHashY).toBe(50);
      expect(obj._spatialHashKey).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should remove objects from spatial hash', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 50, 50);
      spatialHash.remove(obj);

      const nearby = spatialHash.queryNearby(50, 50, 100);
      expect(nearby).not.toContain(obj);
    });

    it('should clean up metadata on removed objects', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 50, 50);
      spatialHash.remove(obj);

      expect(obj._spatialHashX).toBeUndefined();
      expect(obj._spatialHashY).toBeUndefined();
      expect(obj._spatialHashKey).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update object position', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 50, 50);
      spatialHash.update(obj, 250, 250);

      expect(obj._spatialHashX).toBe(250);
      expect(obj._spatialHashY).toBe(250);
    });

    it('should move object to correct cell', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 50, 50);
      spatialHash.update(obj, 250, 250);

      const nearbyOld = spatialHash.queryNearby(50, 50, 50);
      const nearbyNew = spatialHash.queryNearby(250, 250, 50);

      expect(nearbyOld).not.toContain(obj);
      expect(nearbyNew).toContain(obj);
    });
  });

  describe('findNearest', () => {
    it('should find nearest object', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };

      spatialHash.insert(obj1, 100, 100);
      spatialHash.insert(obj2, 200, 200);
      spatialHash.insert(obj3, 150, 150);

      const nearest = spatialHash.findNearest(110, 110, 500);
      expect(nearest).toBe(obj1);
    });

    it('should respect filter function', () => {
      const obj1 = { id: 1, type: 'A' };
      const obj2 = { id: 2, type: 'B' };

      spatialHash.insert(obj1, 100, 100);
      spatialHash.insert(obj2, 110, 110);

      const nearest = spatialHash.findNearest(
        105, 105, 500,
        (obj) => obj.type === 'B'
      );

      expect(nearest).toBe(obj2);
    });

    it('should return null if no objects within radius', () => {
      const obj = { id: 1 };
      spatialHash.insert(obj, 1000, 1000);

      const nearest = spatialHash.findNearest(0, 0, 100);
      expect(nearest).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all objects within radius', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };

      spatialHash.insert(obj1, 100, 100);
      spatialHash.insert(obj2, 120, 120);
      spatialHash.insert(obj3, 500, 500);

      const results = spatialHash.findAll(100, 100, 50);

      expect(results.length).toBe(2);
      expect(results[0].object).toBe(obj1);
      expect(results[1].object).toBe(obj2);
    });

    it('should sort results by distance', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      spatialHash.insert(obj1, 120, 120);
      spatialHash.insert(obj2, 100, 100);

      const results = spatialHash.findAll(100, 100, 50);

      expect(results[0].object).toBe(obj2);
      expect(results[0].distance).toBeLessThan(results[1].distance);
    });
  });

  describe('clear', () => {
    it('should remove all objects', () => {
      spatialHash.insert({ id: 1 }, 50, 50);
      spatialHash.insert({ id: 2 }, 150, 150);

      spatialHash.clear();

      const stats = spatialHash.getStats();
      expect(stats.totalObjects).toBe(0);
      expect(stats.cellCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      spatialHash.insert({ id: 1 }, 50, 50);
      spatialHash.insert({ id: 2 }, 60, 60);
      spatialHash.insert({ id: 3 }, 250, 250);

      const stats = spatialHash.getStats();

      expect(stats.totalObjects).toBe(3);
      expect(stats.cellCount).toBeGreaterThan(0);
      expect(stats.avgObjectsPerCell).toBeGreaterThan(0);
    });
  });
});
