// Guard Unit - Tank/Defensive combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATS } from '../utils/Constants.js';

export default class Guard extends CombatUnit {
  constructor(scene, x, y, faction) {
    const stats = UNIT_STATS.GUARD;
    const config = {
      type: 'guard',
      health: stats.health,
      speed: UNIT.SPEED_GUARD || stats.speed,
      damage: stats.damage,
      attackRange: stats.attackRange,
      attackSpeed: stats.attackSpeed,
      engagementRange: stats.engagementRange,
      spriteKey: 'soldier',
      size: 32
    };

    super(scene, x, y, config, faction);

    console.log('Guard unit created - Tank/Melee fighter');
  }
}
