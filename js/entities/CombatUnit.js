// Combat Unit Base Class - Extends Unit with attack capabilities

import Unit from './Unit.js';
import { UNIT_STATES, FACTIONS } from '../utils/Constants.js';

export default class CombatUnit extends Unit {
  constructor(scene, x, y, config, faction) {
    super(scene, x, y, config, faction);

    // Combat properties
    this.damage = config.damage || 10;
    this.attackRange = config.attackRange || 100;
    this.attackSpeed = config.attackSpeed || 1000; // milliseconds between attacks
    this.attackTimer = 0;
    this.engagementRange = config.engagementRange || 200; // auto-engage range

    // Target tracking
    this.targetEnemy = null;
    this.chaseRange = this.engagementRange * 1.5; // How far to chase before giving up

    console.log(`CombatUnit created: ${this.unitType} with ${this.damage} damage, ${this.attackRange}px range`);
  }

  /**
   * Override update to handle combat
   */
  update(time, delta) {
    super.update(time, delta);

    // Update attack cooldown
    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
    }

    // Handle ATTACKING state
    if (this.state === UNIT_STATES.ATTACKING) {
      this.updateAttacking(delta);
    } else if (this.state === UNIT_STATES.IDLE) {
      // Auto-engage nearby enemies when idle
      this.checkForNearbyEnemies();
    }
  }

  /**
   * Update attacking behavior
   */
  updateAttacking(delta) {
    // Check if target still exists
    if (!this.targetEnemy || !this.targetEnemy.active) {
      console.log(`${this.unitType}: Target destroyed, finding new target`);
      this.targetEnemy = null;
      this.findNewTarget();
      return;
    }

    // Check distance to target
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.targetEnemy.x, this.targetEnemy.y
    );

    // If target out of chase range, give up
    if (distance > this.chaseRange) {
      console.log(`${this.unitType}: Target out of chase range, going idle`);
      this.targetEnemy = null;
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // If target in attack range, attack
    if (distance <= this.attackRange) {
      // Stop moving
      if (this.state !== UNIT_STATES.ATTACKING) {
        this.setState(UNIT_STATES.ATTACKING);
      }

      // Face target - mirror sprite horizontally based on direction
      // Reset container rotation (no rotation, only flip)
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
      this.rotation = 0;
      if (Math.cos(angle) < 0) {
        this.sprite.setFlipX(true);
      } else {
        this.sprite.setFlipX(false);
      }

      // Attack if cooldown ready
      if (this.canAttack()) {
        this.attackTarget(this.targetEnemy);
      }
    } else {
      // Move toward target (pursue)
      if (this.currentPath.length === 0 || this.currentPathIndex >= this.currentPath.length) {
        // Recalculate path to target
        this.moveTo(this.targetEnemy.x, this.targetEnemy.y);
      }
    }
  }

  /**
   * Check if unit can attack (cooldown ready)
   */
  canAttack() {
    return this.attackTimer <= 0;
  }

  /**
   * Attack a target
   */
  attackTarget(target) {
    if (!target || !target.active) return;

    console.log(`${this.unitType}: Attacking ${target.unitType || target.buildingName} for ${this.damage} damage`);

    // Deal damage
    target.takeDamage(this.damage);

    // Reset attack cooldown
    this.attackTimer = this.attackSpeed;

    // Visual feedback - flash red
    if (target.sprite) {
      const originalTint = target.sprite.tintTopLeft;
      target.sprite.setTint(0xFF0000);
      this.scene.time.delayedCall(100, () => {
        if (target && target.sprite && target.active) {
          target.sprite.setTint(originalTint);
        }
      });
    }
  }

  /**
   * Check for nearby enemies to auto-engage
   */
  checkForNearbyEnemies() {
    const enemy = this.findNearestEnemy();
    if (enemy) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (distance <= this.engagementRange) {
        console.log(`${this.unitType}: Enemy detected at ${Math.round(distance)}px, engaging!`);
        this.engageTarget(enemy);
      }
    }
  }

  /**
   * Find nearest enemy unit or building
   */
  findNearestEnemy() {
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    // Check enemy units
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (!unit.active || unit.faction === this.faction) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, unit.x, unit.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = unit;
        }
      });
    }

    // Check enemy buildings
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (!building.active || building.faction === this.faction) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = building;
        }
      });
    }

    return nearestEnemy;
  }

  /**
   * Find new target after current target is destroyed
   */
  findNewTarget() {
    const enemy = this.findNearestEnemy();
    if (enemy) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (distance <= this.engagementRange) {
        this.engageTarget(enemy);
        return;
      }
    }

    // No nearby enemies, go idle
    this.setState(UNIT_STATES.IDLE);
  }

  /**
   * Engage a specific target
   */
  engageTarget(target) {
    this.targetEnemy = target;
    this.setState(UNIT_STATES.ATTACKING);
    console.log(`${this.unitType}: Engaging ${target.unitType || target.buildingName}`);
  }

  /**
   * Override setState to handle ATTACKING state transitions
   */
  setState(newState) {
    if (this.state === UNIT_STATES.ATTACKING && newState !== UNIT_STATES.ATTACKING) {
      // Leaving attack state
      this.targetEnemy = null;
    }

    super.setState(newState);
  }
}
