// Spy Unit - Fast reconnaissance unit with stealth capabilities

import CombatUnit from './CombatUnit.js';
import { UNIT } from '../utils/Constants.js';

export default class Spy extends CombatUnit {
  constructor(scene, x, y, faction) {
    const config = {
      type: 'spy',
      health: 50,              // Very low HP - fragile
      speed: UNIT.SPEED_SPY || 120,  // Fast movement
      damage: 12,              // Moderate damage - assassination strikes
      attackRange: 60,         // Close range - melee assassin
      attackSpeed: 1200,       // Moderate attack speed
      engagementRange: 100,    // Short engagement - prefers to avoid combat
      spriteKey: 'civilian',   // Uses civilian sprite (inconspicuous)
      size: 28
    };

    super(scene, x, y, config, faction);

    // Spy-specific properties
    this.visionRange = 10;     // Extended vision range (tiles) for reconnaissance
    this.isStealthed = false;  // Stealth state (future feature)

    console.log('Spy unit created - extended vision range for reconnaissance');
  }

  /**
   * Override to provide extended vision for fog of war
   */
  getVisionRange() {
    return this.visionRange;
  }
}
