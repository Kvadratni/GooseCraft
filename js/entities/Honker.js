// Honker Unit - Heavy/Artillery combat unit

import CombatUnit from './CombatUnit.js';
import { UNIT } from '../utils/Constants.js';

export default class Honker extends CombatUnit {
  constructor(scene, x, y, faction) {
    const config = {
      type: 'honker',
      health: 200,           // Highest HP - heavy unit
      speed: UNIT.SPEED_HONKER || 80,  // Very slow movement
      damage: 25,            // High damage per hit
      attackRange: 150,      // Artillery range
      attackSpeed: 2500,     // Very slow attack speed
      engagementRange: 250,  // Long engagement range
      spriteKey: 'tank',     // Heavy vehicle sprite
      size: 40               // Larger size
    };

    super(scene, x, y, config, faction);

    console.log('Honker unit created');
  }
}
