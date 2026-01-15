// Guard Unit - Tank/Defensive combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT } from '../utils/Constants.js';

export default class Guard extends CombatUnit {
  constructor(scene, x, y, faction) {
    const config = {
      type: 'guard',
      health: 150,           // High HP - tank role
      speed: UNIT.SPEED_GUARD || 90,  // Slow movement
      damage: 15,            // Moderate damage
      attackRange: 80,       // Melee range
      attackSpeed: 1500,     // Slow attack speed
      engagementRange: 200,  // Auto-engages nearby enemies
      spriteKey: 'soldier',  // Military sprite
      size: 32
    };

    super(scene, x, y, config, faction);

    console.log('Guard unit created');
  }
}
