// Watchtower - Static defense building with extended vision

import Building from '../entities/Building.js';
import { BUILDING, FACTIONS, FACTION_COLORS } from '../utils/Constants.js';

export default class Watchtower extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.WATCHTOWER;

    const buildingConfig = {
      type: 'WATCHTOWER',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'tower',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Combat properties
    this.damage = 10;
    this.attackRange = 200;
    this.attackSpeed = 1500; // ms between attacks
    this.attackTimer = 0;
    this.targetEnemy = null;

    // Extended vision range
    this.visionRange = 12; // tiles

    console.log(`Watchtower: Created at (${x}, ${y})`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only attack when operational
    if (this.state !== 'OPERATIONAL') {
      return;
    }

    // Update attack timer
    this.attackTimer += delta;

    // Find and attack enemies
    if (this.attackTimer >= this.attackSpeed) {
      this.attackTimer = 0;
      this.findAndAttackEnemy();
    }
  }

  /**
   * Find nearest enemy and attack
   */
  findAndAttackEnemy() {
    // Find nearest enemy unit or building
    const enemies = this.findEnemiesInRange();

    if (enemies.length > 0) {
      // Attack closest enemy
      const target = enemies[0];
      this.attackTarget(target);
    }
  }

  /**
   * Find all enemies within attack range
   */
  findEnemiesInRange() {
    const enemies = [];

    // Check enemy units
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (unit.active && unit.faction !== this.faction) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, unit.x, unit.y);
          if (dist <= this.attackRange) {
            enemies.push({ target: unit, distance: dist });
          }
        }
      });
    }

    // Check enemy buildings
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.active && building !== this && building.faction !== this.faction) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
          if (dist <= this.attackRange) {
            enemies.push({ target: building, distance: dist });
          }
        }
      });
    }

    // Sort by distance
    enemies.sort((a, b) => a.distance - b.distance);

    return enemies.map(e => e.target);
  }

  /**
   * Attack a target
   */
  attackTarget(target) {
    if (!target || !target.active) return;

    // Deal damage
    if (target.takeDamage) {
      target.takeDamage(this.damage);
    }

    // Visual feedback - projectile effect
    this.showAttackEffect(target);
  }

  /**
   * Show attack visual effect
   */
  showAttackEffect(target) {
    // Create a simple projectile line
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, FACTION_COLORS[this.faction] || 0xFFFF00, 1);
    graphics.beginPath();
    graphics.moveTo(this.x, this.y - 40); // From tower top
    graphics.lineTo(target.x, target.y);
    graphics.strokePath();

    // Fade out
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy()
    });
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Watchtower: Defense tower operational - guarding the perimeter');
  }
}
