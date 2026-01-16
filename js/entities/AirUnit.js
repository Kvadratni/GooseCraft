// Air Unit - Fast aerial combat unit with ranged attacks

import CombatUnit from './CombatUnit.js';
import { UNIT } from '../utils/Constants.js';

export default class AirUnit extends CombatUnit {
  constructor(scene, x, y, faction) {
    const config = {
      type: 'air-unit',
      health: 80,            // Medium HP
      speed: 180,            // Very fast movement (air)
      damage: 12,            // Medium damage per hit
      attackRange: 150,      // Long ranged attack
      attackSpeed: 1000,     // Medium attack speed
      engagementRange: 300,  // Very long engagement range
      visionRange: 8,        // Excellent vision from air
      spriteKey: 'air-unit', // Air unit sprite
      size: 32
    };

    super(scene, x, y, config, faction);

    console.log('Air unit created');
  }
}
