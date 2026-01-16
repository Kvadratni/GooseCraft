// Maverick - Fast aerial combat unit with ranged attacks

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATS } from '../utils/Constants.js';

export default class Maverick extends CombatUnit {
  constructor(scene, x, y, faction) {
    const stats = UNIT_STATS.MAVERICK;
    const config = {
      type: 'maverick',
      health: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      attackRange: stats.attackRange,
      attackSpeed: stats.attackSpeed,
      engagementRange: stats.engagementRange,
      spriteKey: 'air-unit',
      size: 32
    };

    super(scene, x, y, config, faction);

    console.log('Maverick unit created - Fast aerial striker');
  }
}
