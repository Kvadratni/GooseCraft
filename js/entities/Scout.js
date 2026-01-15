// Scout Unit - Fast/Ranged combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT } from '../utils/Constants.js';

export default class Scout extends CombatUnit {
  constructor(scene, x, y, faction) {
    const config = {
      type: 'scout',
      health: 70,            // Low HP - glass cannon
      speed: UNIT.SPEED_SCOUT || 150,  // Very fast movement
      damage: 8,             // Low damage per hit
      attackRange: 120,      // Ranged attack
      attackSpeed: 800,      // Fast attack speed
      engagementRange: 250,  // Long engagement range
      spriteKey: 'civilian', // Fast civilian sprite
      size: 32
    };

    super(scene, x, y, config, faction);

    console.log('Scout unit created');
  }
}
