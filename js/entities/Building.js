// Base Building Class

import { BUILDING_STATES, DEPTH, COLORS, FACTIONS, FACTION_COLORS } from '../utils/Constants.js';
import { worldToGridInt, calculateDepth } from '../utils/IsometricUtils.js';

export default class Building extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config, faction = FACTIONS.PLAYER) {
    super(scene, x, y);

    this.scene = scene;

    // Building properties
    this.buildingType = config.type || 'building';
    this.buildingName = config.name || 'Building';
    this.faction = faction;
    this.maxHealth = config.health || 500;
    this.currentHealth = 0; // Starts at 0, increases with construction progress

    // Construction
    this.constructionProgress = 0;
    this.constructionTime = config.constructionTime || 10000; // milliseconds
    this.constructionTimer = 0;
    this.state = BUILDING_STATES.CONSTRUCTION;

    // Footprint (tiles this building occupies)
    this.footprint = config.footprint || [[0, 0]];
    this.blocksPathfinding = true;

    // Sabotage state (set by enemy spies)
    this.isSabotaged = false;
    this.sabotageEndTime = 0;

    // Visual properties
    this.spriteKey = config.spriteKey || 'command-center';
    this.size = config.size || 64;

    // Create sprite
    this.sprite = scene.add.sprite(0, 0, this.spriteKey);
    this.sprite.setDisplaySize(this.size, this.size);
    this.sprite.setAlpha(0.5); // Starts transparent during construction
    this.add(this.sprite);

    // Apply faction glow effect that follows the sprite shape
    this.applyFactionEffect();

    // Construction progress bar
    this.createProgressBar();

    // Health bar (shown when damaged)
    this.createHealthBar();

    // Add to scene
    scene.add.existing(this);
    this.setDepth(DEPTH.BUILDINGS);

    // Block pathfinding tiles
    this.blockTiles();

    console.log(`Building: ${this.buildingName} created at (${x}, ${y})`);
  }

  /**
   * Create construction progress bar
   */
  createProgressBar() {
    const barWidth = this.size;
    const barHeight = 6;
    const barY = -this.size / 2 - 12;

    // Background
    this.progressBg = this.scene.add.graphics();
    this.progressBg.fillStyle(0x000000, 0.7);
    this.progressBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    this.add(this.progressBg);

    // Fill
    this.progressFill = this.scene.add.graphics();
    this.add(this.progressFill);

    // Text
    this.progressText = this.scene.add.text(0, barY - 15, 'Constructing...', {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.progressText.setOrigin(0.5);
    this.add(this.progressText);

    this.updateProgressBar();
  }

  /**
   * Update construction progress bar
   */
  updateProgressBar() {
    const barWidth = this.size;
    const barHeight = 6;
    const barY = -this.size / 2 - 12;

    this.progressFill.clear();

    if (this.state === BUILDING_STATES.CONSTRUCTION) {
      // Green fill based on progress
      this.progressFill.fillStyle(0x4CAF50, 1);
      this.progressFill.fillRect(
        -barWidth / 2,
        barY,
        barWidth * (this.constructionProgress / 100),
        barHeight
      );

      this.progressText.setText(`Building ${Math.floor(this.constructionProgress)}%`);
    } else {
      // Hide progress bar when complete
      this.progressBg.setVisible(false);
      this.progressFill.setVisible(false);
      this.progressText.setVisible(false);
    }
  }

  /**
   * Create health bar (shown when damaged)
   */
  createHealthBar() {
    const barWidth = this.size;
    const barHeight = 5;
    const barY = -this.size / 2 - 20;

    // Background
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    this.add(this.healthBarBg);

    // Fill
    this.healthBarFill = this.scene.add.graphics();
    this.add(this.healthBarFill);

    // Initially hidden (only show when damaged)
    this.healthBarBg.setVisible(false);
    this.healthBarFill.setVisible(false);
  }

  /**
   * Update health bar visibility and fill
   */
  updateHealthBar() {
    const isOperational = this.state === BUILDING_STATES.OPERATIONAL;
    const isConstruction = this.state === BUILDING_STATES.CONSTRUCTION;

    // Calculate expected health for current state
    let expectedHealth = this.maxHealth;
    if (isConstruction) {
      expectedHealth = Math.floor((this.constructionProgress / 100) * this.maxHealth);
    }

    // Show health bar when damaged below expected health
    const isDamaged = this.currentHealth < expectedHealth;
    const shouldShow = isDamaged && (isOperational || isConstruction);

    this.healthBarBg.setVisible(shouldShow);
    this.healthBarFill.setVisible(shouldShow);

    if (shouldShow) {
      const barWidth = this.size;
      const barHeight = 5;
      const barY = -this.size / 2 - 20;

      this.healthBarFill.clear();

      // Color based on health percentage (relative to max health)
      const healthPercent = this.currentHealth / this.maxHealth;
      const healthColor = healthPercent > 0.5 ? 0x4CAF50 : (healthPercent > 0.25 ? 0xFFEB3B : 0xF44336);

      this.healthBarFill.fillStyle(healthColor, 1);
      this.healthBarFill.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
  }

  /**
   * Apply faction effect (glow outline that follows sprite shape)
   */
  applyFactionEffect() {
    const factionColor = FACTION_COLORS[this.faction] || FACTION_COLORS.PLAYER;

    // Use preFX glow for an outline that follows the sprite shape
    if (this.sprite.preFX) {
      // Clear any existing effects
      this.sprite.preFX.clear();

      // Add subtle glow outline with faction color
      // outerStrength: 3 (slightly stronger for buildings), innerStrength: 0, knockout: false
      this.factionGlow = this.sprite.preFX.addGlow(factionColor, 3, 0, false);
    } else {
      // Fallback: apply a very light tint if preFX not available
      const r = ((factionColor >> 16) & 0xFF);
      const g = ((factionColor >> 8) & 0xFF);
      const b = (factionColor & 0xFF);
      const lightR = Math.min(255, r + 180);
      const lightG = Math.min(255, g + 180);
      const lightB = Math.min(255, b + 180);
      const lightTint = (lightR << 16) | (lightG << 8) | lightB;
      this.sprite.setTint(lightTint);
    }
  }

  /**
   * Update building each frame
   */
  update(time, delta) {
    // Update construction
    if (this.state === BUILDING_STATES.CONSTRUCTION) {
      this.updateConstruction(delta);
    }

    // Update depth
    const depth = calculateDepth(this.x, this.y, this.size / 2);
    this.setDepth(DEPTH.BUILDINGS + depth);
  }

  /**
   * Update construction progress (visual updates only - workers contribute progress)
   */
  updateConstruction(delta) {
    // Update sprite alpha based on progress
    this.sprite.setAlpha(0.3 + (this.constructionProgress / 100) * 0.7);

    // Update progress bar
    this.updateProgressBar();

    // Check if construction is complete
    if (this.constructionProgress >= 100) {
      this.completeConstruction();
    }
  }

  /**
   * Add construction progress from workers
   */
  addConstructionProgress(progress) {
    if (this.state !== BUILDING_STATES.CONSTRUCTION) {
      return;
    }

    this.constructionProgress += progress;

    // Update health proportional to construction progress
    this.currentHealth = Math.floor((this.constructionProgress / 100) * this.maxHealth);

    if (this.constructionProgress >= 100) {
      this.constructionProgress = 100;
      this.completeConstruction();
    }
  }

  /**
   * Complete construction
   */
  completeConstruction() {
    this.constructionProgress = 100;
    this.currentHealth = this.maxHealth; // Full health when construction completes
    this.state = BUILDING_STATES.OPERATIONAL;
    this.sprite.setAlpha(1);

    this.updateProgressBar();

    console.log(`Building: ${this.buildingName} construction complete!`);

    // Play building complete sound
    if (this.scene.soundManager && this.faction === FACTIONS.PLAYER) {
      this.scene.soundManager.playSFX('sfx-building-complete');
    }

    // Notify unlock manager for progression (player buildings only)
    if (this.scene.buildingUnlockManager && this.faction === FACTIONS.PLAYER) {
      this.scene.buildingUnlockManager.onBuildingCompleted(this.buildingName);
    }

    // Trigger any completion effects
    this.onConstructionComplete();
  }

  /**
   * Called when construction completes (override in subclasses)
   */
  onConstructionComplete() {
    // Subclasses can override
  }

  /**
   * Set building as sabotaged (disabled) for a duration
   */
  setSabotaged(duration) {
    this.isSabotaged = true;
    this.sabotageEndTime = this.scene.time.now + duration;

    // Visual feedback - gray tint
    if (this.sprite) {
      this.sprite.setTint(0x666666);
    }

    console.log(`Building ${this.buildingName}: SABOTAGED for ${duration / 1000}s!`);

    // Schedule end of sabotage
    this.scene.time.delayedCall(duration, () => {
      this.endSabotage();
    });
  }

  /**
   * End sabotage state
   */
  endSabotage() {
    if (this.isSabotaged) {
      this.isSabotaged = false;
      this.sabotageEndTime = 0;

      // Restore visual
      if (this.sprite) {
        this.sprite.clearTint();
        this.applyFactionEffect();
      }

      console.log(`Building ${this.buildingName}: Sabotage ended, resuming operations`);
    }
  }

  /**
   * Check if building is operational (not under construction or sabotaged)
   */
  isOperational() {
    return this.state === BUILDING_STATES.OPERATIONAL && !this.isSabotaged;
  }

  /**
   * Block pathfinding tiles
   */
  blockTiles() {
    const gridPos = worldToGridInt(this.x, this.y);

    this.footprint.forEach(offset => {
      const tileX = gridPos.x + offset[0];
      const tileY = gridPos.y + offset[1];

      // Mark as occupied in isometric map
      this.scene.isometricMap.setOccupied(tileX, tileY, true);

      // Update pathfinding
      if (this.blocksPathfinding) {
        this.scene.pathfindingManager.updateGrid(tileX, tileY, false);
      }
    });
  }

  /**
   * Unblock pathfinding tiles (when building is destroyed)
   */
  unblockTiles() {
    const gridPos = worldToGridInt(this.x, this.y);

    this.footprint.forEach(offset => {
      const tileX = gridPos.x + offset[0];
      const tileY = gridPos.y + offset[1];

      this.scene.isometricMap.setOccupied(tileX, tileY, false);
      this.scene.pathfindingManager.updateGrid(tileX, tileY, true);
    });
  }

  /**
   * Take damage
   */
  takeDamage(amount) {
    this.currentHealth -= amount;

    // Update health bar display
    this.updateHealthBar();

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.destroy();
    }
  }

  // ========== Research/Upgrade Bonus Methods ==========

  /**
   * Apply health bonus from research (Fortified Walls)
   */
  applyHealthBonus(multiplier) {
    if (!this.baseMaxHealth) {
      this.baseMaxHealth = this.maxHealth;
    }
    const oldMax = this.maxHealth;
    this.maxHealth = Math.floor(this.baseMaxHealth * multiplier);
    // Also heal the bonus amount
    this.currentHealth += (this.maxHealth - oldMax);
    console.log(`Building ${this.buildingName}: Max HP increased to ${this.maxHealth}`);
  }

  /**
   * Apply construction speed bonus from research (Quick Build)
   */
  applyConstructionSpeedBonus(multiplier) {
    if (this.state === 'CONSTRUCTION' && this.constructionTime) {
      if (!this.baseConstructionTime) {
        this.baseConstructionTime = this.constructionTime;
      }
      this.constructionTime = Math.floor(this.baseConstructionTime / multiplier);
      console.log(`Building ${this.buildingName}: Construction time reduced to ${this.constructionTime}ms`);
    }
  }

  /**
   * Apply train speed bonus (Hatchery upgrade for Coop)
   */
  applyTrainSpeedBonus(multiplier) {
    this.trainSpeedMultiplier = multiplier;
    console.log(`Building ${this.buildingName}: Training speed increased by ${multiplier}x`);
  }

  /**
   * Check and apply research bonuses when building completes
   */
  applyResearchBonuses() {
    const upgrades = this.scene.researchUpgrades;
    if (!upgrades) return;

    if (upgrades.fortifiedWalls) {
      this.applyHealthBonus(1.5);
    }
  }

  /**
   * Destroy building
   */
  destroy() {
    console.log(`Building: ${this.buildingName} destroyed`);

    // Unblock tiles
    this.unblockTiles();

    // Explicitly clean up graphics objects to prevent memory leaks
    if (this.progressBg) {
      this.progressBg.destroy();
      this.progressBg = null;
    }
    if (this.progressFill) {
      this.progressFill.destroy();
      this.progressFill = null;
    }
    if (this.progressText) {
      this.progressText.destroy();
      this.progressText = null;
    }
    // Clear preFX glow effect
    if (this.sprite?.preFX) {
      this.sprite.preFX.clear();
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    // Remove from scene
    super.destroy();
  }
}
