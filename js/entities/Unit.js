// Base Unit Class

import { UNIT_STATES, DEPTH, COLORS, FACTIONS, FACTION_COLORS } from '../utils/Constants.js';
import { worldToGridInt, calculateDepth } from '../utils/IsometricUtils.js';

export default class Unit extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config, faction = FACTIONS.PLAYER) {
    super(scene, x, y);

    this.scene = scene;

    // Unit properties
    this.unitType = config.type || 'unit';
    this.faction = faction;
    this.maxHealth = config.health || 100;
    this.currentHealth = this.maxHealth;
    this.speed = config.speed || 100; // pixels per second
    this.visionRange = config.visionRange || 5; // tiles
    this.isSelected = false;

    // Movement state
    this.state = UNIT_STATES.IDLE;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.targetNode = null;

    // Stuck detection
    this.lastPosition = { x: x, y: y };
    this.stuckTimer = 0;
    this.stuckThreshold = 1000; // 1 second without moving = stuck (reduced from 2)

    // Movement timeout (prevents infinite MOVING state)
    this.movementTimer = 0;
    this.movementTimeout = 15000; // 15 seconds max for any movement (reduced from 30)

    // Stuck recovery tracking
    this.stuckRecoveryAttempts = 0;
    this.maxStuckRecoveryAttempts = 3; // Give up after 3 attempts

    // Visual properties
    this.spriteKey = config.spriteKey || 'civilian';
    this.size = config.size || 32;

    // Create sprite
    this.sprite = scene.add.sprite(0, 0, this.spriteKey);
    this.sprite.setDisplaySize(this.size, this.size);
    this.add(this.sprite);

    // Create faction border graphics
    this.factionBorder = scene.add.graphics();
    this.add(this.factionBorder);

    // Create health bar graphics
    this.healthBarBg = scene.add.graphics();
    this.healthBarFill = scene.add.graphics();
    this.add(this.healthBarBg);
    this.add(this.healthBarFill);

    // Create status text (shows state and combat icon)
    this.statusText = scene.add.text(0, -this.size / 2 - 20, '', {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    });
    this.statusText.setOrigin(0.5, 0.5);
    this.add(this.statusText);

    // Add to scene
    scene.add.existing(this);
    this.setDepth(DEPTH.UNITS);

    // Draw the unit
    this.draw();

    // Selection circle (hidden by default)
    this.selectionCircle = scene.add.circle(x, y, this.size / 2 + 4, COLORS.SELECTION, 0);
    this.selectionCircle.setStrokeStyle(2, COLORS.SELECTION);
    this.selectionCircle.setDepth(DEPTH.SELECTION);
    this.selectionCircle.setScrollFactor(1, 1); // Ensure it scrolls with the world
    this.selectionCircle.setVisible(false);

    console.log(`Unit created: ${this.unitType} at (${x}, ${y})`);
  }

  /**
   * Draw the unit
   */
  draw() {
    // Clear previous graphics
    this.healthBarBg.clear();
    this.healthBarFill.clear();
    this.factionBorder.clear();

    // Draw faction border (circular outline around unit)
    const factionColor = FACTION_COLORS[this.faction] || FACTION_COLORS.PLAYER;
    this.factionBorder.lineStyle(2, factionColor, 1);
    this.factionBorder.strokeCircle(0, 0, this.size / 2 + 2);

    // Health bar dimensions
    const barWidth = this.size;
    const barHeight = 4;
    const barY = -this.size / 2 - 8;

    // Health bar background
    this.healthBarBg.fillStyle(0x000000, 0.6);
    this.healthBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health bar fill
    const healthPercent = this.currentHealth / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x4CAF50 : (healthPercent > 0.25 ? 0xFFEB3B : 0xF44336);
    this.healthBarFill.fillStyle(healthColor, 1);
    this.healthBarFill.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Remove sprite tinting - show natural sprite colors
    this.sprite.clearTint();

    // Selection is indicated by the selection circle, not sprite tint
    // This keeps faction identity clear at all times
  }

  /**
   * Update unit each frame
   */
  update(time, delta) {
    switch (this.state) {
      case UNIT_STATES.IDLE:
        this.updateIdle(delta);
        break;
      case UNIT_STATES.MOVING:
        this.updateMoving(delta);
        break;
      case UNIT_STATES.GATHERING:
        this.updateGathering(delta);
        break;
      case UNIT_STATES.RETURNING:
        this.updateReturning(delta);
        break;
      case UNIT_STATES.ATTACKING:
        this.updateAttacking(delta);
        break;
    }

    // Update depth for proper layering
    this.updateDepth();

    // Update status text
    this.updateStatusText();

    // Update selection circle position
    if (this.selectionCircle) {
      this.selectionCircle.x = this.x;
      this.selectionCircle.y = this.y;
    }
  }

  /**
   * Update status text display
   */
  updateStatusText() {
    if (!this.statusText) return;

    // Only show status text for selected units or combat units in action
    const shouldShowStatus = this.isSelected || this.state === UNIT_STATES.ATTACKING;

    if (!shouldShowStatus) {
      this.statusText.setText('');
      return;
    }

    let statusText = '';

    // Add combat icon for attacking units
    if (this.state === UNIT_STATES.ATTACKING) {
      statusText = '⚔️';
    }

    this.statusText.setText(statusText);
  }

  /**
   * Update attacking state (implemented by CombatUnit subclass)
   */
  updateAttacking(delta) {
    // Override in subclass
  }

  /**
   * Update idle state
   */
  updateIdle(delta) {
    // Do nothing, just wait for commands
  }

  /**
   * Update moving state
   */
  updateMoving(delta) {
    if (!this.currentPath || this.currentPath.length === 0) {
      console.log('Unit: No path, going idle');
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Check if we've finished the path
    if (this.currentPathIndex >= this.currentPath.length) {
      console.log('Unit: Path complete, going idle');
      this.stuckRecoveryAttempts = 0; // Reset on successful path completion
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Movement timeout detection
    this.movementTimer += delta;
    if (this.movementTimer >= this.movementTimeout) {
      console.warn(`Unit: Movement timeout (${this.movementTimeout}ms), going idle`);
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Stuck detection
    const movedDistance = Phaser.Math.Distance.Between(this.x, this.y, this.lastPosition.x, this.lastPosition.y);
    if (movedDistance < 1) {
      // Not moving
      this.stuckTimer += delta;

      if (this.stuckTimer >= this.stuckThreshold) {
        this.stuckRecoveryAttempts++;
        console.warn(`Unit: Stuck for ${this.stuckThreshold}ms (attempt ${this.stuckRecoveryAttempts}/${this.maxStuckRecoveryAttempts})`);
        this.stuckTimer = 0;

        // Give up after too many attempts
        if (this.stuckRecoveryAttempts >= this.maxStuckRecoveryAttempts) {
          console.error('Unit: Too many stuck recovery attempts, giving up');
          this.setState(UNIT_STATES.IDLE);
          return;
        }

        // Store the target destination
        const targetWaypoint = this.currentPath[this.currentPath.length - 1];

        if (targetWaypoint) {
          console.log(`Unit: Recalculating path to (${targetWaypoint.x}, ${targetWaypoint.y})`);

          // Clear current path and request new one
          this.currentPath = [];
          this.currentPathIndex = 0;

          // Request fresh path from current position
          const targetWorld = this.scene.isometricMap.getWorldPosCenter(targetWaypoint.x, targetWaypoint.y);
          this.moveTo(targetWorld.x, targetWorld.y);
        } else {
          console.warn('Unit: No target waypoint, going idle');
          this.setState(UNIT_STATES.IDLE);
        }
        return;
      }
    } else {
      // Moving successfully, reset stuck timer
      this.stuckTimer = 0;
      this.lastPosition = { x: this.x, y: this.y };
    }

    // Get current target node
    const targetNode = this.currentPath[this.currentPathIndex];
    const targetWorld = this.scene.isometricMap.getWorldPosCenter(targetNode.x, targetNode.y);

    // Calculate distance to target
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetWorld.x, targetWorld.y);

    // Check if reached waypoint (increased threshold for easier waypoint completion)
    if (distance < 16) {
      this.currentPathIndex++;
      console.log(`Unit: Reached waypoint ${this.currentPathIndex}/${this.currentPath.length}`);

      if (this.currentPathIndex >= this.currentPath.length) {
        // Reached final destination
        console.log(`Unit: Reached final destination`);

        // Reset stuck detection
        this.stuckTimer = 0;

        // Check if this is a goose with pending operations
        if (this.pendingGatherStart && this.targetResource) {
          console.log(`Unit: Transitioning to GATHERING state`);
          this.setState(UNIT_STATES.GATHERING);
          this.pendingGatherStart = false;
        } else if (this.pendingReturnToBase) {
          console.log(`Unit: Transitioning to RETURNING state`);
          this.setState(UNIT_STATES.RETURNING);
          this.pendingReturnToBase = false;
        } else if (this.pendingConstruction && this.targetBuilding) {
          console.log(`Unit: Transitioning to CONSTRUCTING state`);
          this.setState(UNIT_STATES.CONSTRUCTING);
          this.pendingConstruction = false;
        } else {
          this.setState(UNIT_STATES.IDLE);
        }
        return;
      }
    } else {
      // Move toward target
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetWorld.x, targetWorld.y);
      const moveDistance = this.speed * (delta / 1000);

      const newX = this.x + Math.cos(angle) * moveDistance;
      const newY = this.y + Math.sin(angle) * moveDistance;

      this.x = newX;
      this.y = newY;

      // Update rotation to face movement direction
      this.rotation = angle + Math.PI / 2;
    }
  }

  /**
   * Update gathering state
   */
  updateGathering(delta) {
    // Gathering behavior is handled by Goose subclass
  }

  /**
   * Update returning state
   */
  updateReturning(delta) {
    // Returning behavior is handled by Goose subclass
  }

  /**
   * Set unit state
   */
  setState(newState) {
    if (this.state !== newState) {
      const debugInfo = newState === UNIT_STATES.MOVING ?
        ` (path length: ${this.currentPath?.length}, index: ${this.currentPathIndex})` : '';
      console.log(`Unit ${this.unitType}: ${this.state} -> ${newState}${debugInfo}`);
      this.state = newState;

      // State entry actions
      if (newState === UNIT_STATES.IDLE) {
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.targetNode = null;
        this.stuckTimer = 0;
        this.movementTimer = 0;
        this.stuckRecoveryAttempts = 0;
      } else if (newState === UNIT_STATES.MOVING) {
        // Reset stuck detection when starting new movement
        this.stuckTimer = 0;
        this.movementTimer = 0;
        this.lastPosition = { x: this.x, y: this.y };
        // Don't reset stuckRecoveryAttempts here - it persists across path retries
      }
    }
  }

  /**
   * Move to a target position (world coordinates)
   */
  moveTo(worldX, worldY) {
    // Convert positions to grid coordinates
    const startGrid = worldToGridInt(this.x, this.y);
    const endGrid = worldToGridInt(worldX, worldY);

    console.log(`Unit moving from (${startGrid.x}, ${startGrid.y}) to (${endGrid.x}, ${endGrid.y})`);

    // Request path from pathfinding manager
    this.scene.pathfindingManager.findPath(
      startGrid.x, startGrid.y,
      endGrid.x, endGrid.y,
      (path) => this.onPathFound(path)
    );
  }

  /**
   * Callback when path is found
   */
  onPathFound(path) {
    if (path === null || path.length === 0) {
      console.warn('Unit: No path found');
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    console.log(`Unit: Path found with ${path.length} nodes from (${path[0].x}, ${path[0].y}) to (${path[path.length-1].x}, ${path[path.length-1].y})`);

    // Special case: path has only one node (already at destination)
    if (path.length === 1) {
      console.log('Unit: Already at destination');
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.targetNode = null;

      // Check if this is a goose with pending operations
      if (this.pendingGatherStart && this.targetResource) {
        console.log(`Unit: Transitioning to GATHERING state (already at destination)`);
        this.setState(UNIT_STATES.GATHERING);
        this.pendingGatherStart = false;
      } else if (this.pendingReturnToBase) {
        console.log(`Unit: Transitioning to RETURNING state (already at destination)`);
        this.setState(UNIT_STATES.RETURNING);
        this.pendingReturnToBase = false;
      } else if (this.pendingConstruction && this.targetBuilding) {
        console.log(`Unit: Transitioning to CONSTRUCTING state (already at destination)`);
        this.setState(UNIT_STATES.CONSTRUCTING);
        this.pendingConstruction = false;
      } else {
        this.setState(UNIT_STATES.IDLE);
      }
      return;
    }

    this.currentPath = path;
    this.currentPathIndex = 0;
    this.targetNode = null;
    this.setState(UNIT_STATES.MOVING);
  }

  /**
   * Set selection state
   */
  setSelected(selected) {
    this.isSelected = selected;

    if (this.selectionCircle) {
      this.selectionCircle.setVisible(selected);
    }

    // Redraw with selection highlight
    this.draw();
  }

  /**
   * Update depth for isometric sorting
   */
  updateDepth() {
    const depth = calculateDepth(this.x, this.y, 0);
    this.setDepth(DEPTH.UNITS + depth);
  }

  /**
   * Get current grid position
   */
  getGridPosition() {
    return worldToGridInt(this.x, this.y);
  }

  /**
   * Take damage
   */
  takeDamage(amount) {
    this.currentHealth -= amount;

    // Show floating damage number
    this.showDamageNumber(amount);

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.die();
    }

    this.draw();
  }

  /**
   * Show floating damage number
   */
  showDamageNumber(damage) {
    const damageText = this.scene.add.text(this.x, this.y - this.size / 2, `-${Math.round(damage)}`, {
      fontSize: '16px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    });
    damageText.setOrigin(0.5, 0.5);
    damageText.setDepth(DEPTH.UNITS + 1000); // Always on top

    // Animate: float up and fade out
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  /**
   * Heal
   */
  heal(amount) {
    this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
    this.draw();
  }

  /**
   * Unit dies
   */
  die() {
    console.log(`Unit ${this.unitType} died`);

    // Remove from scene
    if (this.selectionCircle) {
      this.selectionCircle.destroy();
    }
    this.destroy();
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.selectionCircle) {
      this.selectionCircle.destroy();
    }
    if (this.statusText) {
      this.statusText.destroy();
    }
    if (this.factionBorder) {
      this.factionBorder.destroy();
    }
    super.destroy();
  }
}
