// Honker Unit - Heavy/Artillery combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATS } from '../utils/Constants.js';

export default class Honker extends CombatUnit {
  constructor(scene, x, y, faction) {
    const stats = UNIT_STATS.HONKER;
    const config = {
      type: 'honker',
      health: stats.health,
      speed: UNIT.SPEED_HONKER || stats.speed,
      damage: stats.damage,
      attackRange: stats.attackRange,
      attackSpeed: stats.attackSpeed,
      engagementRange: stats.engagementRange,
      spriteKey: 'tank',
      size: 40
    };

    super(scene, x, y, config, faction);

    console.log('Honker unit created - Heavy artillery');
  }
}
