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
}
