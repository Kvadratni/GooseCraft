// Maverick - Fast aerial combat unit with ranged attacks

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATES, UNIT_STATS } from '../utils/Constants.js';
import { updateAerialAnimation } from '../systems/UnitAnimator.js';

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

    // Aerial unit - can only be hit by ranged attacks (Scout, Watchtower)
    this.isAerial = true;
    this.canHitAerial = true;
    this.isRanged = true;
    this.projectileType = 'rock'; // Drops rocks on targets

    console.log('Maverick unit created - Fast aerial striker');
  }

  /** Override idle with smooth hover float */
  updateIdle(delta) {
    this.animTime += delta / 1000;
    updateAerialAnimation(this.sprite, this.animTime, false);
  }

  /** Override moving animation with banking hover float */
  applyMovingAnimation(delta) {
    updateAerialAnimation(this.sprite, this.animTime, true);
  }
}
