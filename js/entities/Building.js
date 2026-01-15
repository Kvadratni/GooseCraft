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
    this.currentHealth = this.maxHealth;

    // Construction
    this.constructionProgress = 0;
    this.constructionTime = config.constructionTime || 10000; // milliseconds
    this.constructionTimer = 0;
    this.state = BUILDING_STATES.CONSTRUCTION;

    // Footprint (tiles this building occupies)
    this.footprint = config.footprint || [[0, 0]];
    this.blocksPathfinding = true;

    // Visual properties
    this.spriteKey = config.spriteKey || 'command-center';
    this.size = config.size || 64;

    // Create sprite
    this.sprite = scene.add.sprite(0, 0, this.spriteKey);
    this.sprite.setDisplaySize(this.size, this.size);
    this.sprite.setAlpha(0.5); // Starts transparent during construction
    this.add(this.sprite);

    // Create faction border
    this.factionBorder = scene.add.graphics();
    this.add(this.factionBorder);
    this.drawFactionBorder();

    // Construction progress bar
    this.createProgressBar();

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
   * Draw faction border
   */
  drawFactionBorder() {
    if (!this.factionBorder) return;

    this.factionBorder.clear();
    const factionColor = FACTION_COLORS[this.faction] || FACTION_COLORS.PLAYER;
    this.factionBorder.lineStyle(3, factionColor, 1);

    // Draw rectangular border around building
    const halfSize = this.size / 2;
    this.factionBorder.strokeRect(-halfSize, -halfSize, this.size, this.size);
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
    this.state = BUILDING_STATES.OPERATIONAL;
    this.sprite.setAlpha(1);

    this.updateProgressBar();

    console.log(`Building: ${this.buildingName} construction complete!`);

    // Play building complete sound
    if (this.scene.soundManager && this.faction === FACTIONS.PLAYER) {
      this.scene.soundManager.playSFX('sfx-building-complete');
    }

    // Notify unlock manager for progression
    if (this.scene.buildingUnlockManager) {
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

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.destroy();
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
    if (this.factionBorder) {
      this.factionBorder.destroy();
      this.factionBorder = null;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    // Remove from scene
    super.destroy();
  }
}
