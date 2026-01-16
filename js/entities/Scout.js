// Scout Unit - Fast/Ranged combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATS } from '../utils/Constants.js';

export default class Scout extends CombatUnit {
  constructor(scene, x, y, faction) {
    const stats = UNIT_STATS.SCOUT;
    const config = {
      type: 'scout',
      health: stats.health,
      speed: UNIT.SPEED_SCOUT || stats.speed,
      damage: stats.damage,
      attackRange: stats.attackRange,
      attackSpeed: stats.attackSpeed,
      engagementRange: stats.engagementRange,
      spriteKey: 'archer',
      size: 32
    };

    super(scene, x, y, config, faction);

    // Ranged unit - can hit aerial targets
    this.canHitAerial = true;
    this.isRanged = true;
    this.projectileType = 'arrow';

    console.log('Scout unit created - Fast ranged harasser');
  }
}
