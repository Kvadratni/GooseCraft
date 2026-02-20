// Spy Unit - Saboteur with stealth, building sabotage, and resource theft

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATS, FACTIONS } from '../utils/Constants.js';
import { updateStealthAnimation } from '../systems/UnitAnimator.js';

export default class Spy extends CombatUnit {
  constructor(scene, x, y, faction) {
    const stats = UNIT_STATS.SPY;
    const config = {
      type: 'spy',
      health: stats.health,
      speed: UNIT.SPEED_SPY || stats.speed,
      damage: stats.damage,
      attackRange: stats.attackRange,
      attackSpeed: stats.attackSpeed,
      engagementRange: stats.engagementRange,
      spriteKey: 'spy',
      size: 28
    };

    super(scene, x, y, config, faction);

    // Spy-specific properties
    this.visionRange = 10;     // Extended vision range (tiles)

    // Stealth
    this.isStealthed = true;   // Starts stealthed
    this.stealthDetectionRange = stats.stealthDetectionRange;
    this.stealthBrokenTimer = 0;
    this.stealthBrokenDuration = 5000; // 5 seconds visible after action

    // Sabotage ability
    this.sabotageDuration = stats.sabotageDuration;
    this.sabotageCooldown = stats.sabotageCooldown;
    this.sabotageTimer = 0;    // Ready when 0
    this.sabotageRange = 100;  // Must be adjacent to building

    // Steal ability
    this.stealAmount = stats.stealAmount;
    this.stealCooldown = stats.stealCooldown;
    this.stealTimer = 0;       // Ready when 0
    this.stealRange = 100;     // Must be adjacent to storage

    // Visual stealth effect
    this.updateStealthVisual();

    console.log('Spy unit created - Saboteur with stealth capabilities');
  }

  /**
   * Override update to handle spy-specific behavior
   */
  update(time, delta) {
    super.update(time, delta);

    // Overlay stealth shimmer when stealthed (player spy only)
    if (this.isStealthed && this.faction === FACTIONS.PLAYER && this.sprite) {
      this.animTime += delta / 1000;
      updateStealthAnimation(this.sprite, this.animTime);
    }

    // Update ability cooldowns
    if (this.sabotageTimer > 0) {
      this.sabotageTimer -= delta;
    }
    if (this.stealTimer > 0) {
      this.stealTimer -= delta;
    }

    // Update stealth broken timer
    if (this.stealthBrokenTimer > 0) {
      this.stealthBrokenTimer -= delta;
      if (this.stealthBrokenTimer <= 0) {
        this.enterStealth();
      }
    }

    // Check if detected by nearby enemies
    this.checkDetection();
  }

  /**
   * Enter stealth mode
   */
  enterStealth() {
    if (!this.isStealthed) {
      this.isStealthed = true;
      this.updateStealthVisual();
      console.log('Spy: Entered stealth');
    }
  }

  /**
   * Break stealth (after attacking or using abilities)
   */
  breakStealth() {
    if (this.isStealthed) {
      this.isStealthed = false;
      this.stealthBrokenTimer = this.stealthBrokenDuration;
      this.updateStealthVisual();
      console.log('Spy: Stealth broken!');
    }
  }

  /**
   * Update visual appearance based on stealth state
   */
  updateStealthVisual() {
    if (this.sprite) {
      if (this.isStealthed && this.faction === FACTIONS.PLAYER) {
        // Player spy: shimmer handled per-frame in update(); set mid-alpha as baseline
        this.sprite.setAlpha(0.45);
      } else if (this.isStealthed && this.faction !== FACTIONS.PLAYER) {
        // Enemy spies are invisible to player when stealthed (handled in render)
        this.sprite.setAlpha(0.2);
      } else {
        this.sprite.setAlpha(1.0);
      }
    }
  }

  /**
   * Check if spy is detected by nearby enemies
   */
  checkDetection() {
    if (!this.isStealthed) return;

    // Check nearby enemy units
    if (this.scene.units) {
      for (const unit of this.scene.units) {
        if (!unit.active || unit.faction === this.faction) continue;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, unit.x, unit.y);
        if (distance <= this.stealthDetectionRange) {
          this.breakStealth();
          return;
        }
      }
    }

    // Check nearby watchtowers (extended detection)
    if (this.scene.buildings) {
      for (const building of this.scene.buildings) {
        if (!building.active || building.faction === this.faction) continue;
        if (building.buildingType !== 'WATCHTOWER') continue;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
        const detectionRange = building.spyDetectionRange || 150;
        if (distance <= detectionRange) {
          this.breakStealth();
          return;
        }
      }
    }
  }

  /**
   * Sabotage an enemy building - disables it for duration
   */
  sabotageBuilding(targetBuilding) {
    // Check if ability is ready
    if (this.sabotageTimer > 0) {
      const remaining = Math.ceil(this.sabotageTimer / 1000);
      console.log(`Spy: Sabotage on cooldown (${remaining}s remaining)`);
      return false;
    }

    // Check if target is valid enemy building
    if (!targetBuilding || !targetBuilding.active) {
      console.log('Spy: Invalid target');
      return false;
    }

    if (targetBuilding.faction === this.faction) {
      console.log('Spy: Cannot sabotage friendly buildings');
      return false;
    }

    // Check range
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetBuilding.x, targetBuilding.y);
    if (distance > this.sabotageRange) {
      console.log(`Spy: Target too far (${Math.round(distance)}px, need ${this.sabotageRange}px)`);
      return false;
    }

    // Perform sabotage
    this.breakStealth();
    this.sabotageTimer = this.sabotageCooldown;

    // Disable the building
    if (targetBuilding.setSabotaged) {
      targetBuilding.setSabotaged(this.sabotageDuration);
    } else {
      // Fallback: directly set sabotage state
      targetBuilding.isSabotaged = true;
      targetBuilding.sabotageEndTime = this.scene.time.now + this.sabotageDuration;

      // Visual feedback
      if (targetBuilding.sprite) {
        targetBuilding.sprite.setTint(0x666666);
      }

      // Schedule end of sabotage
      this.scene.time.delayedCall(this.sabotageDuration, () => {
        if (targetBuilding && targetBuilding.active) {
          targetBuilding.isSabotaged = false;
          if (targetBuilding.sprite) {
            targetBuilding.sprite.clearTint();
            // Reapply faction tint
            if (targetBuilding.applyFactionTint) {
              targetBuilding.applyFactionTint();
            }
          }
          console.log(`Building: Sabotage ended on ${targetBuilding.buildingName}`);
        }
      });
    }

    console.log(`Spy: Sabotaged ${targetBuilding.buildingName} for ${this.sabotageDuration / 1000}s!`);

    // Show visual effect
    this.showSabotageEffect(targetBuilding);

    return true;
  }

  /**
   * Steal resources from enemy storage building
   */
  stealResources(targetBuilding) {
    // Check if ability is ready
    if (this.stealTimer > 0) {
      const remaining = Math.ceil(this.stealTimer / 1000);
      console.log(`Spy: Steal on cooldown (${remaining}s remaining)`);
      return false;
    }

    // Check if target is valid enemy storage
    if (!targetBuilding || !targetBuilding.active) {
      console.log('Spy: Invalid target');
      return false;
    }

    if (targetBuilding.faction === this.faction) {
      console.log('Spy: Cannot steal from friendly buildings');
      return false;
    }

    // Only steal from storage-type buildings
    const validTargets = ['RESOURCE_STORAGE', 'COOP', 'RESOURCESTORAGE'];
    if (!validTargets.includes(targetBuilding.buildingType?.toUpperCase())) {
      console.log('Spy: Can only steal from storage buildings');
      return false;
    }

    // Check range
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetBuilding.x, targetBuilding.y);
    if (distance > this.stealRange) {
      console.log(`Spy: Target too far (${Math.round(distance)}px, need ${this.stealRange}px)`);
      return false;
    }

    // Perform theft
    this.breakStealth();
    this.stealTimer = this.stealCooldown;

    // Determine what to steal (from AI resources)
    let stolenResources = {};
    if (targetBuilding.faction === FACTIONS.ENEMY_AI && this.scene.aiManager) {
      const aiRes = this.scene.aiManager.resources;
      const resourceTypes = ['food', 'water', 'sticks', 'stone'];

      for (const type of resourceTypes) {
        const available = aiRes[type] || 0;
        const stolen = Math.min(this.stealAmount, available);
        if (stolen > 0) {
          aiRes[type] -= stolen;
          stolenResources[type] = stolen;
        }
      }

      // Add to player resources
      if (this.faction === FACTIONS.PLAYER && this.scene.resourceManager) {
        for (const [type, amount] of Object.entries(stolenResources)) {
          this.scene.resourceManager.addResources(type, amount);
        }
      }
    }

    const totalStolen = Object.values(stolenResources).reduce((a, b) => a + b, 0);
    console.log(`Spy: Stole ${totalStolen} resources!`, stolenResources);

    // Show visual effect
    this.showStealEffect(targetBuilding, totalStolen);

    return true;
  }

  /**
   * Show sabotage visual effect
   */
  showSabotageEffect(target) {
    // Spark/electric effect
    const sparks = this.scene.add.text(target.x, target.y - 50, '⚡ SABOTAGED ⚡', {
      fontSize: '16px',
      fill: '#FF5722',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    sparks.setOrigin(0.5);
    sparks.setDepth(1000);

    this.scene.tweens.add({
      targets: sparks,
      y: target.y - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => sparks.destroy()
    });
  }

  /**
   * Show steal visual effect
   */
  showStealEffect(target, amount) {
    const text = this.scene.add.text(target.x, target.y - 50, `-${amount} 💰`, {
      fontSize: '18px',
      fill: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    text.setOrigin(0.5);
    text.setDepth(1000);

    this.scene.tweens.add({
      targets: text,
      y: target.y - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }

  /**
   * Override attack to break stealth
   */
  attackTarget(target) {
    this.breakStealth();
    super.attackTarget(target);
  }

  /**
   * Get ability status for UI
   */
  getAbilityStatus() {
    return {
      sabotageReady: this.sabotageTimer <= 0,
      sabotageCooldown: Math.max(0, Math.ceil(this.sabotageTimer / 1000)),
      stealReady: this.stealTimer <= 0,
      stealCooldown: Math.max(0, Math.ceil(this.stealTimer / 1000)),
      isStealthed: this.isStealthed
    };
  }

  /**
   * Override to provide extended vision for fog of war
   */
  getVisionRange() {
    return this.visionRange;
  }
}
