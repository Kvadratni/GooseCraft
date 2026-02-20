// Tests for ResourceManager

// Mock the scene object
const mockScene = {
  scene: {
    get: jest.fn(() => ({
      updateResources: jest.fn()
    }))
  }
};

// Import after setting up mocks
import ResourceManager from '../../js/systems/ResourceManager.js';

describe('ResourceManager', () => {
  let resourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager(mockScene);
  });

  describe('addResources', () => {
    it('should add resources successfully', () => {
      const result = resourceManager.addResources('food', 50);
      expect(result).toBe(true);
      expect(resourceManager.getAmount('food')).toBe(250); // 200 starting + 50
    });

    it('should reject invalid resource type', () => {
      const result = resourceManager.addResources('invalid', 50);
      expect(result).toBe(false);
    });

    it('should reject non-number amounts', () => {
      const result = resourceManager.addResources('food', 'fifty');
      expect(result).toBe(false);
    });

    it('should reject negative amounts', () => {
      const result = resourceManager.addResources('food', -50);
      expect(result).toBe(false);
    });

    it('should handle zero amount as no-op', () => {
      const beforeAmount = resourceManager.getAmount('food');
      const result = resourceManager.addResources('food', 0);
      expect(result).toBe(true);
      expect(resourceManager.getAmount('food')).toBe(beforeAmount);
    });

    it('should respect storage limits', () => {
      const limit = resourceManager.getLimit('food');
      resourceManager.addResources('food', limit);

      const finalAmount = resourceManager.getAmount('food');
      expect(finalAmount).toBeLessThanOrEqual(limit);
    });
  });

  describe('removeResources', () => {
    it('should remove resources successfully', () => {
      const result = resourceManager.removeResources('food', 50);
      expect(result).toBe(true);
      expect(resourceManager.getAmount('food')).toBe(150); // 200 starting - 50
    });

    it('should reject removing more than available', () => {
      const result = resourceManager.removeResources('food', 1000);
      expect(result).toBe(false);
      expect(resourceManager.getAmount('food')).toBe(200); // Unchanged
    });

    it('should reject invalid resource type', () => {
      const result = resourceManager.removeResources('invalid', 50);
      expect(result).toBe(false);
    });

    it('should reject non-number amounts', () => {
      const result = resourceManager.removeResources('food', 'fifty');
      expect(result).toBe(false);
    });

    it('should reject negative amounts', () => {
      const result = resourceManager.removeResources('food', -50);
      expect(result).toBe(false);
    });
  });

  describe('canAfford', () => {
    it('should return true when resources are sufficient', () => {
      const cost = { food: 50, water: 30 };
      expect(resourceManager.canAfford(cost)).toBe(true);
    });

    it('should return false when resources are insufficient', () => {
      const cost = { food: 1000 };
      expect(resourceManager.canAfford(cost)).toBe(false);
    });

    it('should handle empty cost object', () => {
      expect(resourceManager.canAfford({})).toBe(true);
    });

    it('should reject invalid cost objects', () => {
      expect(resourceManager.canAfford(null)).toBe(false);
      expect(resourceManager.canAfford([])).toBe(false);
      expect(resourceManager.canAfford('invalid')).toBe(false);
    });

    it('should reject invalid amounts in cost', () => {
      const cost = { food: 'fifty' };
      expect(resourceManager.canAfford(cost)).toBe(false);
    });

    it('should reject negative amounts in cost', () => {
      const cost = { food: -50 };
      expect(resourceManager.canAfford(cost)).toBe(false);
    });

    it('should reject unknown resource types', () => {
      const cost = { invalid: 50 };
      expect(resourceManager.canAfford(cost)).toBe(false);
    });
  });

  describe('spend', () => {
    it('should spend resources when affordable', () => {
      const cost = { food: 50, water: 30 };
      const result = resourceManager.spend(cost);

      expect(result).toBe(true);
      expect(resourceManager.getAmount('food')).toBe(150);
      expect(resourceManager.getAmount('water')).toBe(70);
    });

    it('should not spend when unaffordable', () => {
      const cost = { food: 1000 };
      const initialFood = resourceManager.getAmount('food');

      const result = resourceManager.spend(cost);

      expect(result).toBe(false);
      expect(resourceManager.getAmount('food')).toBe(initialFood);
    });
  });

  describe('increaseStorageLimit', () => {
    it('should increase storage limit', () => {
      const initialLimit = resourceManager.getLimit('food');
      const result = resourceManager.increaseStorageLimit('food', 100);

      expect(result).toBe(true);
      expect(resourceManager.getLimit('food')).toBe(initialLimit + 100);
    });

    it('should reject invalid resource type', () => {
      const result = resourceManager.increaseStorageLimit('invalid', 100);
      expect(result).toBe(false);
    });

    it('should reject non-number amounts', () => {
      const result = resourceManager.increaseStorageLimit('food', 'hundred');
      expect(result).toBe(false);
    });

    it('should reject negative amounts', () => {
      const result = resourceManager.increaseStorageLimit('food', -100);
      expect(result).toBe(false);
    });
  });

  describe('getAmount and getLimit', () => {
    it('should return current amount', () => {
      expect(resourceManager.getAmount('food')).toBe(200);
    });

    it('should return 0 for unknown resources', () => {
      expect(resourceManager.getAmount('invalid')).toBe(0);
    });

    it('should return storage limit', () => {
      expect(resourceManager.getLimit('food')).toBeGreaterThan(0);
    });

    it('should return 0 limit for unknown resources', () => {
      expect(resourceManager.getLimit('invalid')).toBe(0);
    });
  });

  describe('getResources', () => {
    it('should return a copy of all resources', () => {
      const resources = resourceManager.getResources();

      expect(resources).toHaveProperty('food');
      expect(resources).toHaveProperty('water');
      expect(resources).toHaveProperty('sticks');
      expect(resources).toHaveProperty('tools');

      // Should be a copy, not reference
      resources.food = 9999;
      expect(resourceManager.getAmount('food')).not.toBe(9999);
    });
  });
});
