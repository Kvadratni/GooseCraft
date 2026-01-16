// Watchtower - Static defense building with extended vision and upgrades

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
    this.baseAttackRange = 200;
    this.attackSpeed = 1500; // ms between attacks
    this.attackTimer = 0;
    this.targetEnemy = null;

    // Ranged tower - can hit aerial targets
    this.canHitAerial = true;
    this.isRanged = true;
    this.projectileType = 'arrow';

    // Extended vision range
    this.visionRange = 12; // tiles
    this.baseVisionRange = 12;

    // Upgrades
    this.upgrades = {
      EXTENDED_RANGE: {
        name: 'Extended Range',
        description: '+50% attack and vision range',
        cost: { food: 50, water: 50, sticks: 150, tools: 8 },
        purchased: false
      },
      ALARM_BELL: {
        name: 'Alarm Bell',
        description: 'Flashes minimap when enemies spotted',
        cost: { food: 25, water: 25, sticks: 100, tools: 5 },
        purchased: false
      }
    };

    // Alarm state
    this.alarmActive = false;
    this.lastAlarmTime = 0;
    this.alarmCooldown = 5000; // 5 seconds between alarms

    // Range indicator (shown when selected)
    this.rangeIndicator = scene.add.graphics();
    this.rangeIndicator.setDepth(1); // Below units but above ground
    this.updateRangeIndicator();
    this.rangeIndicator.setVisible(false);

    console.log(`Watchtower: Created at (${x}, ${y})`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only attack when operational and not sabotaged
    if (this.state !== 'OPERATIONAL' || this.isSabotaged) {
      return;
    }

    // Update attack timer
    this.attackTimer += delta;

    // Find and attack enemies
    if (this.attackTimer >= this.attackSpeed) {
      this.attackTimer = 0;
      this.findAndAttackEnemy();
    }

    // Check for alarm
    if (this.upgrades.ALARM_BELL.purchased) {
      this.checkAlarm(time);
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

    // Spawn arrow projectile
    this.spawnArrowProjectile(target);
  }

  /**
   * Spawn arrow projectile toward target
   */
  spawnArrowProjectile(target) {
    const startX = this.x;
    const startY = this.y - 40; // From tower top
    const endX = target.x;
    const endY = target.y;

    // Create arrow graphics
    const arrow = this.scene.add.graphics();
    arrow.setDepth(9000);

    // Calculate angle for arrow rotation
    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);

    // Draw arrow shape
    const drawArrow = (g, rot) => {
      g.clear();
      g.lineStyle(2, 0x8B4513, 1); // Brown shaft
      g.fillStyle(0x808080, 1); // Gray arrowhead

      g.save();
      g.translateCanvas(0, 0);
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

    arrow.x = startX;
    arrow.y = startY;
    drawArrow(arrow, angle);

    // Animate arrow to target
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const duration = Math.min(300, distance * 1.5);

    this.scene.tweens.add({
      targets: arrow,
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        drawArrow(arrow, angle);
      },
      onComplete: () => {
        arrow.destroy();
        // Deal damage when arrow hits
        if (target && target.active && target.takeDamage) {
          target.takeDamage(this.damage);
          // Flash red on hit
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
      }
    });
  }

  /**
   * Check and trigger alarm if enemies detected
   */
  checkAlarm(time) {
    if (time - this.lastAlarmTime < this.alarmCooldown) return;

    const enemies = this.findEnemiesInRange();
    if (enemies.length > 0 && !this.alarmActive) {
      this.triggerAlarm();
      this.lastAlarmTime = time;
    }
  }

  /**
   * Trigger alarm - flash minimap
   */
  triggerAlarm() {
    this.alarmActive = true;
    console.log('Watchtower: ALARM! Enemies spotted!');

    // Notify UI to flash minimap at this location
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.flashMinimapLocation) {
      uiScene.flashMinimapLocation(this.x, this.y, 0xFF0000);
    }

    // Reset alarm after cooldown
    this.scene.time.delayedCall(3000, () => {
      this.alarmActive = false;
    });
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeKey) {
    if (this.faction !== 'PLAYER') return false;

    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade || upgrade.purchased) return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager.canAfford(upgrade.cost)) {
      console.log(`Watchtower: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`Watchtower: Purchased ${upgrade.name}!`);

    // Apply upgrade effect
    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'EXTENDED_RANGE':
        this.attackRange = Math.floor(this.baseAttackRange * 1.5);
        this.visionRange = Math.floor(this.baseVisionRange * 1.5);
        this.updateRangeIndicator(); // Refresh the range circle
        console.log(`Watchtower: Extended Range - attack: ${this.attackRange}, vision: ${this.visionRange}`);
        break;
      case 'ALARM_BELL':
        console.log('Watchtower: Alarm Bell - will alert when enemies spotted');
        break;
    }
  }

  /**
   * Get upgrade status for UI
   */
  getUpgradeStatus() {
    return {
      upgrades: this.upgrades,
      attackRange: this.attackRange,
      visionRange: this.visionRange
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Watchtower: Defense tower operational - guarding the perimeter');
    this.applyResearchBonuses();
  }

  /**
   * Update range indicator graphics
   */
  updateRangeIndicator() {
    if (!this.rangeIndicator) return;

    this.rangeIndicator.clear();

    // Draw range circle with faction color
    const color = this.faction === FACTIONS.PLAYER ? 0x4a90d9 : 0xd94a4a;
    this.rangeIndicator.lineStyle(2, color, 0.6);
    this.rangeIndicator.fillStyle(color, 0.1);
    this.rangeIndicator.beginPath();
    this.rangeIndicator.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
    this.rangeIndicator.closePath();
    this.rangeIndicator.fillPath();
    this.rangeIndicator.strokePath();
  }

  /**
   * Show range indicator (called when selected)
   */
  showRangeIndicator() {
    if (this.rangeIndicator) {
      this.updateRangeIndicator();
      this.rangeIndicator.setVisible(true);
    }
  }

  /**
   * Hide range indicator (called when deselected)
   */
  hideRangeIndicator() {
    if (this.rangeIndicator) {
      this.rangeIndicator.setVisible(false);
    }
  }

  /**
   * Clean up when destroyed
   */
  destroy() {
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
      this.rangeIndicator = null;
    }
    super.destroy();
  }
}
