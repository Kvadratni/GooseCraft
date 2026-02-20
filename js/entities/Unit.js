// Base Unit Class

import { UNIT_STATES, DEPTH, COLORS, FACTIONS, FACTION_COLORS } from '../utils/Constants.js';
import { worldToGridInt, calculateDepth } from '../utils/IsometricUtils.js';
import { updateIdleAnimation, updateWalkAnimation, resetAnimation } from '../systems/UnitAnimator.js';

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

    // Store the original movement destination (world coordinates)
    this.finalDestination = null;

    // Stuck detection
    this.stuckCheckPosition = { x: x, y: y };
    this.stuckTimer = 0;
    this.stuckThreshold = 1500; // 1.5 second without moving = stuck

    // Movement timeout (prevents infinite MOVING state)
    this.movementTimer = 0;
    this.movementTimeout = 20000; // 20 seconds max for any movement

    // Stuck recovery tracking
    this.stuckRecoveryAttempts = 0;
    this.maxStuckRecoveryAttempts = 3; // Give up after 3 attempts

    // Visual properties
    this.spriteKey = config.spriteKey || 'civilian';
    this.size = config.size || 32;

    // Collision properties
    this.collisionRadius = this.size / 2;
    this.isAerial = false; // Override in aerial units (Maverick)

    // Animation time accumulator (seconds)
    this.animTime = 0;

    // Create sprite
    this.sprite = scene.add.sprite(0, 0, this.spriteKey);
    this.sprite.setDisplaySize(this.size, this.size);
    this.sprite.baseScale = this.sprite.scaleX; // capture the native scaling factor
    this.add(this.sprite);

    // Apply faction tint/glow effect that follows the sprite shape
    this.applyFactionEffect();

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
   * Apply faction effect (glow outline that follows sprite shape)
   */
  applyFactionEffect() {
    const factionColor = FACTION_COLORS[this.faction] || FACTION_COLORS.PLAYER;

    // Use preFX glow for an outline that follows the sprite shape
    // Parameters: color, outerStrength, innerStrength, knockout
    if (this.sprite.preFX) {
      // Clear any existing effects
      this.sprite.preFX.clear();

      // Add subtle glow outline with faction color
      // outerStrength: 2 (subtle), innerStrength: 0 (no inner glow), knockout: false
      this.factionGlow = this.sprite.preFX.addGlow(factionColor, 2, 0, false);
    } else {
      // Fallback: apply a very light tint if preFX not available
      // Blend faction color with white for a subtle effect
      const r = ((factionColor >> 16) & 0xFF);
      const g = ((factionColor >> 8) & 0xFF);
      const b = (factionColor & 0xFF);
      // Mix with white (lighten the tint significantly)
      const lightR = Math.min(255, r + 180);
      const lightG = Math.min(255, g + 180);
      const lightB = Math.min(255, b + 180);
      const lightTint = (lightR << 16) | (lightG << 8) | lightB;
      this.sprite.setTint(lightTint);
    }
  }

  /**
   * Draw the unit
   */
  draw() {
    // Clear previous graphics
    this.healthBarBg.clear();
    this.healthBarFill.clear();

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

    // Resolve collisions with other units and buildings
    this.resolveCollisions();

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
    this.animTime += delta / 1000;
    updateIdleAnimation(this.sprite, this.animTime);
  }

  /**
   * Update moving state
   */
  updateMoving(delta) {
    if (!this.currentPath || this.currentPath.length === 0) {
      if (window.gcVerbose) console.log('Unit: No path, going idle');
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Check if we've finished the path
    if (this.currentPathIndex >= this.currentPath.length) {
      if (window.gcVerbose) console.log('Unit: Path complete, going idle');
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
    this.stuckTimer += delta;
    if (this.stuckTimer >= this.stuckThreshold) {
      // Check total distance moved over the threshold window
      const movedDistance = Phaser.Math.Distance.Between(this.x, this.y, this.stuckCheckPosition.x, this.stuckCheckPosition.y);

      if (movedDistance < 15) {
        this.stuckRecoveryAttempts++;
        console.warn(`Unit: Stuck for ${this.stuckThreshold}ms (attempt ${this.stuckRecoveryAttempts}/${this.maxStuckRecoveryAttempts})`);

        // Give up after too many attempts
        if (this.stuckRecoveryAttempts >= this.maxStuckRecoveryAttempts) {
          console.error('Unit: Too many stuck recovery attempts, giving up');

          // Before giving up, if we have a target resource or building, check if we're "close enough" and try to proceed
          if ((this.pendingGatherStart && this.targetResource) || (this.pendingReturnToBase) || (this.pendingConstruction && this.targetBuilding)) {
            const destDist = this.finalDestination ? Phaser.Math.Distance.Between(this.x, this.y, this.finalDestination.x, this.finalDestination.y) : 999;
            if (destDist < 100) {
              console.log(`Unit: Trapped but close to objective (${Math.round(destDist)}px), forcing transition.`);
              this.currentPath = [];
              this.currentPathIndex = 0;

              if (this.pendingGatherStart) {
                this.setState(UNIT_STATES.GATHERING);
                this.pendingGatherStart = false;
              } else if (this.pendingReturnToBase) {
                this.setState(UNIT_STATES.RETURNING);
                this.pendingReturnToBase = false;
              } else if (this.pendingConstruction) {
                this.setState(UNIT_STATES.CONSTRUCTING);
                this.pendingConstruction = false;
              }
              return;
            }
          }

          this.setState(UNIT_STATES.IDLE);
          return;
        }

        // First attempt: apply a small jitter to get un-stuck from corners
        if (this.stuckRecoveryAttempts === 1) {
          console.log(`Unit: Applying anti-stuck jitter`);
          this.x += (Math.random() - 0.5) * 15;
          this.y += (Math.random() - 0.5) * 15;
          return;
        }

        // Second attempt: skip to next waypoint (might be blocked by current one)
        if (this.stuckRecoveryAttempts === 2 && this.currentPath.length > this.currentPathIndex + 1) {
          this.currentPathIndex++;
          console.log(`Unit: Skipping waypoint, trying next (${this.currentPathIndex}/${this.currentPath.length})`);
          return;
        }

        // Second attempt: check if we're close enough to final destination
        if (this.finalDestination) {
          const distToFinal = Phaser.Math.Distance.Between(this.x, this.y, this.finalDestination.x, this.finalDestination.y);
          if (distToFinal < 80) {
            console.log(`Unit: Close enough to destination (${Math.round(distToFinal)}px), considering arrived`);
            this.currentPath = [];
            this.currentPathIndex = 0;
            this.setState(UNIT_STATES.IDLE);
            return;
          }

          // Recalculate path
          this.currentPath = [];
          this.currentPathIndex = 0;
          this.moveTo(this.finalDestination.x, this.finalDestination.y);
        } else {
          console.warn('Unit: No target destination, going idle');
          this.setState(UNIT_STATES.IDLE);
        }

        // Reset check window after a recovery attempt
        this.stuckTimer = 0;
        this.stuckCheckPosition = { x: this.x, y: this.y };
        return;
      } else {
        // Not stuck: reset check window for the next period
        this.stuckTimer = 0;
        this.stuckCheckPosition = { x: this.x, y: this.y };
      }
    }

    // Get current target node
    const targetNode = this.currentPath[this.currentPathIndex];
    const targetWorld = this.scene.isometricMap.getWorldPosCenter(targetNode.x, targetNode.y);

    // Calculate distance to target
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetWorld.x, targetWorld.y);

    // Check if reached waypoint
    // Using 35 pixels threshold for smoother navigation
    if (distance < 35) {
      this.currentPathIndex++;
      if (window.gcVerbose) console.log(`Unit: Reached waypoint ${this.currentPathIndex}/${this.currentPath.length}`);

      if (this.currentPathIndex >= this.currentPath.length) {
        // Reached final destination
        if (window.gcVerbose) console.log(`Unit: Reached final destination`);

        // Reset stuck detection
        this.stuckTimer = 0;

        // Check if this is a goose with pending operations
        if (this.pendingGatherStart && this.targetResource) {
          if (window.gcVerbose) console.log(`Unit: Transitioning to GATHERING state`);
          this.setState(UNIT_STATES.GATHERING);
          this.pendingGatherStart = false;
        } else if (this.pendingReturnToBase) {
          if (window.gcVerbose) console.log(`Unit: Transitioning to RETURNING state`);
          this.setState(UNIT_STATES.RETURNING);
          this.pendingReturnToBase = false;
        } else if (this.pendingConstruction && this.targetBuilding) {
          if (window.gcVerbose) console.log(`Unit: Transitioning to CONSTRUCTING state`);
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

      // Mirror sprite horizontally based on movement direction
      // If moving left (angle between 90° and 270°), flip sprite
      // Reset container rotation (no rotation, only flip)
      this.rotation = 0;
      if (Math.cos(angle) < 0) {
        this.sprite.setFlipX(true);
      } else {
        this.sprite.setFlipX(false);
      }

      // Walking wobble animation
      this.animTime += delta / 1000;
      this.applyMovingAnimation(delta);
    }
  }

  /**
   * Update gathering state
   */
  updateGathering(delta) {
    // Gathering behavior is handled by Goose subclass
  }

  /**
   * Apply movement animation - override in subclasses for unit-type-specific motion.
   */
  applyMovingAnimation(delta) {
    updateWalkAnimation(this.sprite, this.animTime, this.speed);
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
      if (window.gcVerbose) {
        const debugInfo = newState === UNIT_STATES.MOVING ?
          ` (path length: ${this.currentPath?.length}, index: ${this.currentPathIndex})` : '';
        console.log(`Unit ${this.unitType}: ${this.state} -> ${newState}${debugInfo}`);
      }

      // Reset sprite transforms to neutral on every state transition
      resetAnimation(this.sprite);
      this.animTime = 0;

      this.state = newState;

      // State entry actions
      if (newState === UNIT_STATES.IDLE) {
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.targetNode = null;
        this.finalDestination = null; // Clear destination when going idle
        this.stuckTimer = 0;
        this.movementTimer = 0;
        this.stuckRecoveryAttempts = 0;
      } else if (newState === UNIT_STATES.MOVING) {
        // Reset stuck detection when starting new movement
        this.stuckTimer = 0;
        this.movementTimer = 0;
        this.stuckCheckPosition = { x: this.x, y: this.y };
        // Don't reset stuckRecoveryAttempts here - it persists across path retries
        // Don't reset finalDestination - keep it for recovery
      }
    }
  }

  /**
   * Move to a target position (world coordinates)
   */
  moveTo(worldX, worldY) {
    // Store the original destination for stuck recovery
    this.finalDestination = { x: worldX, y: worldY };

    // Convert positions to grid coordinates
    const startGrid = worldToGridInt(this.x, this.y);
    const endGrid = worldToGridInt(worldX, worldY);

    if (window.gcVerbose) console.log(`Unit moving from grid (${startGrid.x}, ${startGrid.y}) to (${endGrid.x}, ${endGrid.y})`);

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

    if (window.gcVerbose) console.log(`Unit: Path found with ${path.length} nodes from (${path[0].x}, ${path[0].y}) to (${path[path.length - 1].x}, ${path[path.length - 1].y})`);

    // Special case: path has only one node (already at destination)
    if (path.length === 1) {
      if (window.gcVerbose) console.log('Unit: Already at destination');
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.targetNode = null;

      // Check if this is a goose with pending operations
      if (this.pendingGatherStart && this.targetResource) {
        if (window.gcVerbose) console.log(`Unit: Transitioning to GATHERING state (already at destination)`);
        this.setState(UNIT_STATES.GATHERING);
        this.pendingGatherStart = false;
      } else if (this.pendingReturnToBase) {
        if (window.gcVerbose) console.log(`Unit: Transitioning to RETURNING state (already at destination)`);
        this.setState(UNIT_STATES.RETURNING);
        this.pendingReturnToBase = false;
      } else if (this.pendingConstruction && this.targetBuilding) {
        if (window.gcVerbose) console.log(`Unit: Transitioning to CONSTRUCTING state (already at destination)`);
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

  // ========== Research Bonus Methods ==========

  /**
   * Apply speed bonus from research (Swift Feet)
   */
  applySpeedBonus(multiplier) {
    if (!this.baseSpeed) {
      this.baseSpeed = this.speed;
    }
    this.speed = Math.floor(this.baseSpeed * multiplier);
    console.log(`Unit ${this.unitType}: Speed increased to ${this.speed}`);
  }

  /**
   * Apply vision bonus from research (Eagle Eyes)
   */
  applyVisionBonus(bonus) {
    if (!this.baseVisionRange) {
      this.baseVisionRange = this.visionRange;
    }
    this.visionRange = this.baseVisionRange + bonus;
    console.log(`Unit ${this.unitType}: Vision range increased to ${this.visionRange}`);
  }

  /**
   * Apply health bonus from research (Thick Feathers)
   */
  applyHealthBonus(multiplier) {
    if (!this.baseMaxHealth) {
      this.baseMaxHealth = this.maxHealth;
    }
    const oldMax = this.maxHealth;
    this.maxHealth = Math.floor(this.baseMaxHealth * multiplier);
    // Also heal the bonus amount
    this.currentHealth += (this.maxHealth - oldMax);
    this.draw();
    console.log(`Unit ${this.unitType}: Max HP increased to ${this.maxHealth}`);
  }

  /**
   * Apply gathering bonus from research (Efficient Gathering)
   * Override in worker classes
   */
  applyGatheringBonus(multiplier) {
    // Base implementation does nothing - override in Goose.js
  }

  /**
   * Apply damage bonus from building upgrade (Combat Drills)
   */
  applyDamageBonus(multiplier) {
    if (this.damage) {
      if (!this.baseDamage) {
        this.baseDamage = this.damage;
      }
      this.damage = Math.floor(this.baseDamage * multiplier);
      console.log(`Unit ${this.unitType}: Damage increased to ${this.damage}`);
    }
  }

  /**
   * Check and apply all relevant research bonuses (for newly spawned units)
   */
  applyResearchBonuses() {
    const upgrades = this.scene.researchUpgrades;
    if (!upgrades) return;

    if (upgrades.swiftFeet) {
      this.applySpeedBonus(1.25);
    }
    if (upgrades.eagleEyes) {
      this.applyVisionBonus(3);
    }
    if (upgrades.thickFeathers) {
      this.applyHealthBonus(1.2);
    }
    if (upgrades.efficientGathering && this.unitType === 'worker') {
      this.applyGatheringBonus(1.5);
    }
  }

  /**
   * Resolve collisions with other units and buildings
   */
  resolveCollisions() {
    const pushStrength = 0.2; // How strongly to push apart (0-1) - lowered to reduce jitter

    // Check collision with other units
    if (this.scene.units) {
      this.scene.units.forEach(other => {
        if (!other.active || other === this) return;

        // Aerial units only collide with other aerial units
        if (this.isAerial !== other.isAerial) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const minDist = this.collisionRadius + other.collisionRadius;

        if (dist < minDist && dist > 0) {
          // Calculate push direction (away from other unit)
          const angle = Phaser.Math.Angle.Between(other.x, other.y, this.x, this.y);
          const overlap = minDist - dist;
          const pushDist = overlap * pushStrength;

          // Push this unit away
          this.x += Math.cos(angle) * pushDist;
          this.y += Math.sin(angle) * pushDist;
        }
      });
    }

    // Ground units also collide with buildings
    if (!this.isAerial && this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (!building.active) return;

        // Allow workers returning to their home base to get close
        if (this.homeBase === building) {
          if (this.state === UNIT_STATES.RETURNING) return;
          if (this.pendingReturnToBase) return;
        }

        // Allow any unit with resources to approach friendly buildings
        if (this.inventory && building.faction === this.faction) {
          const totalResources = (this.inventory.food || 0) + (this.inventory.water || 0) +
            (this.inventory.sticks || 0) + (this.inventory.tools || 0);
          if (totalResources > 0) return;
        }

        // Use smaller collision radius (35% of building size) to allow units closer
        const buildingRadius = building.size * 0.35;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
        const minDist = this.collisionRadius + buildingRadius;

        if (dist < minDist && dist > 0) {
          // Push unit away from building (building doesn't move)
          const angle = Phaser.Math.Angle.Between(building.x, building.y, this.x, this.y);
          const overlap = minDist - dist;

          // Push fully out of building
          this.x += Math.cos(angle) * overlap;
          this.y += Math.sin(angle) * overlap;
        }
      });
    }
  }

  /**
   * Unit dies
   */
  die() {
    console.log(`Unit ${this.unitType} died`);

    // Check for tool recycling (Factory upgrade)
    if (this.scene.researchUpgrades?.toolRecycling) {
      const resourceManager = this.scene.resourceManager;
      if (resourceManager) {
        resourceManager.addResources('tools', 1);
        console.log('Tool recycled from fallen unit');
      }
    }

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
    // Clear preFX glow effect
    if (this.sprite?.preFX) {
      this.sprite.preFX.clear();
    }
    super.destroy();
  }

  /**
   * Serialize for save game
   */
  toJSON() {
    return {
      unitType: this.unitType,
      x: this.x,
      y: this.y,
      faction: this.faction,
      state: this.state,
      health: this.currentHealth,
      maxHealth: this.maxHealth,
      speed: this.speed,
      inventory: this.inventory ? { ...this.inventory } : null
    };
  }

  /**
   * Load from save game
   */
  fromJSON(data) {
    if (!data) return;
    this.state = data.state || this.state;
    this.currentHealth = data.health ?? this.currentHealth;
    this.maxHealth = data.maxHealth || this.maxHealth;
    this.speed = data.speed || this.speed;

    if (data.inventory && this.inventory) {
      this.inventory = { ...data.inventory };
    }

    this.draw();
  }
}
