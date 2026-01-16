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
      if (window.gcVerbose) console.log(`${this.unitType}: Target destroyed, finding new target`);
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
      if (window.gcVerbose) console.log(`${this.unitType}: Target out of chase range, going idle`);
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

    if (window.gcVerbose) console.log(`${this.unitType}: Attacking ${target.unitType || target.buildingName} for ${this.damage} damage`);

    // Reset attack cooldown
    this.attackTimer = this.attackSpeed;

    // Spawn projectile for ranged attacks, or deal damage directly for melee
    if (this.isRanged && this.projectileType) {
      this.spawnProjectile(target);
    } else {
      // Melee - deal damage immediately
      this.dealDamageToTarget(target);
    }
  }

  /**
   * Deal damage to target with visual feedback
   */
  dealDamageToTarget(target) {
    if (!target || !target.active) return;

    target.takeDamage(this.damage);

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
   * Spawn a projectile toward the target
   */
  spawnProjectile(target) {
    const startX = this.x;
    const startY = this.y - 10; // Slightly above unit
    const endX = target.x;
    const endY = target.y;

    if (this.projectileType === 'arrow') {
      this.spawnArrowProjectile(startX, startY, endX, endY, target);
    } else if (this.projectileType === 'rock') {
      this.spawnRockProjectile(startX, startY, endX, endY, target);
    }
  }

  /**
   * Spawn arrow projectile (for Scout)
   */
  spawnArrowProjectile(startX, startY, endX, endY, target) {
    // Create arrow graphics
    const arrow = this.scene.add.graphics();
    arrow.setDepth(9000);

    // Calculate angle for arrow rotation
    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);

    // Draw arrow shape (line with arrowhead)
    const drawArrow = (g, x, y, rot) => {
      g.clear();
      g.lineStyle(2, 0x8B4513, 1); // Brown shaft
      g.fillStyle(0x808080, 1); // Gray arrowhead

      // Save current transform
      g.save();
      g.translateCanvas(x, y);
      g.rotateCanvas(rot);

      // Arrow shaft
      g.beginPath();
      g.moveTo(-12, 0);
      g.lineTo(8, 0);
      g.strokePath();

      // Arrowhead
      g.beginPath();
      g.moveTo(12, 0);
      g.lineTo(6, -3);
      g.lineTo(6, 3);
      g.closePath();
      g.fillPath();

      // Fletching
      g.lineStyle(1, 0xFFFFFF, 0.8);
      g.beginPath();
      g.moveTo(-10, 0);
      g.lineTo(-14, -3);
      g.moveTo(-10, 0);
      g.lineTo(-14, 3);
      g.strokePath();

      g.restore();
    };

    // Initial position
    arrow.x = startX;
    arrow.y = startY;
    drawArrow(arrow, 0, 0, angle);

    // Animate arrow to target
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const duration = Math.min(300, distance * 1.5); // Faster for close targets

    this.scene.tweens.add({
      targets: arrow,
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        drawArrow(arrow, 0, 0, angle);
      },
      onComplete: () => {
        arrow.destroy();
        // Deal damage when projectile hits
        this.dealDamageToTarget(target);
      }
    });
  }

  /**
   * Spawn rock projectile (for Maverick - drops from above)
   */
  spawnRockProjectile(startX, startY, endX, endY, target) {
    // Rock starts above the Maverick and falls down to target
    const dropHeight = 80;
    const rockStartY = startY - dropHeight;

    // Create rock graphics
    const rock = this.scene.add.graphics();
    rock.setDepth(9000);

    // Draw rock shape
    const drawRock = (g, scale = 1) => {
      g.clear();
      g.fillStyle(0x696969, 1); // Dark gray
      g.lineStyle(1, 0x404040, 1);

      // Irregular rock shape
      g.beginPath();
      g.moveTo(-6 * scale, -4 * scale);
      g.lineTo(0 * scale, -8 * scale);
      g.lineTo(6 * scale, -4 * scale);
      g.lineTo(8 * scale, 2 * scale);
      g.lineTo(4 * scale, 6 * scale);
      g.lineTo(-4 * scale, 6 * scale);
      g.lineTo(-8 * scale, 2 * scale);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // Add some texture detail
      g.lineStyle(1, 0x505050, 0.5);
      g.beginPath();
      g.moveTo(-2 * scale, -2 * scale);
      g.lineTo(2 * scale, 0);
      g.moveTo(0, 2 * scale);
      g.lineTo(3 * scale, 4 * scale);
      g.strokePath();
    };

    rock.x = startX;
    rock.y = rockStartY;
    drawRock(rock, 1);

    // Animate rock falling with arc
    const duration = 400;

    // Create a path that arcs up slightly then falls
    this.scene.tweens.add({
      targets: rock,
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Quad.easeIn', // Accelerate as it falls
      onUpdate: (tween) => {
        // Scale rock as it "approaches" (perspective effect)
        const progress = tween.progress;
        const scale = 0.5 + (progress * 0.8); // Grow as it falls
        drawRock(rock, scale);

        // Add rotation effect
        rock.rotation = progress * Math.PI * 2;
      },
      onComplete: () => {
        // Impact effect
        this.showRockImpact(endX, endY);
        rock.destroy();
        // Deal damage when rock hits
        this.dealDamageToTarget(target);
      }
    });
  }

  /**
   * Show rock impact visual effect
   */
  showRockImpact(x, y) {
    // Dust cloud effect
    const impact = this.scene.add.graphics();
    impact.setDepth(9000);
    impact.x = x;
    impact.y = y;

    // Draw impact dust
    impact.fillStyle(0x8B7355, 0.6);
    impact.fillCircle(0, 0, 15);
    impact.fillStyle(0x8B7355, 0.4);
    impact.fillCircle(-5, -5, 8);
    impact.fillCircle(7, -3, 6);

    // Fade out
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => impact.destroy()
    });
  }

  /**
   * Check for nearby enemies to auto-engage
   */
  checkForNearbyEnemies() {
    const enemy = this.findNearestEnemy();
    if (enemy) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (distance <= this.engagementRange) {
        if (window.gcVerbose) console.log(`${this.unitType}: Enemy detected at ${Math.round(distance)}px, engaging!`);
        this.engageTarget(enemy);
      }
    }
  }

  /**
   * Check if this unit can attack a target (aerial filtering)
   */
  canTargetEnemy(target) {
    // If target is aerial and we can't hit aerial, skip it
    if (target.isAerial && !this.canHitAerial) {
      return false;
    }
    return true;
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

        // Skip aerial targets if we can't hit them
        if (!this.canTargetEnemy(unit)) return;

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
    if (window.gcVerbose) console.log(`${this.unitType}: Engaging ${target.unitType || target.buildingName}`);
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
