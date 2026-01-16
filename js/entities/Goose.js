// Goose - Worker Unit

import CombatUnit from './CombatUnit.js';
import { UNIT, UNIT_STATES, BUILDING_STATES, FACTIONS } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';

export default class Goose extends CombatUnit {
  constructor(scene, x, y, faction) {
    // Configure worker goose properties (use builder sprite for worker units)
    const config = {
      type: 'goose',
      health: UNIT.HEALTH_MAX,
      speed: UNIT.SPEED_WORKER,
      visionRange: UNIT.VISION_RANGE,
      spriteKey: 'builder', // Use builder sprite for worker
      size: 32,
      // Combat properties - workers can fight but are weak
      damage: 1,
      attackRange: 50,        // Melee range
      attackSpeed: 2000,      // Slow attack (2 seconds)
      engagementRange: 80     // Short engagement range
    };

    super(scene, x, y, config, faction);

    // Workers are melee - cannot hit aerial
    this.canHitAerial = false;
    this.isRanged = false;

    // Worker-specific properties
    this.inventory = {
      food: 0,
      water: 0,
      sticks: 0,
      tools: 0
    };
    this.inventoryMax = UNIT.INVENTORY_MAX;
    this.baseInventoryMax = UNIT.INVENTORY_MAX;
    this.targetResource = null;
    this.homeBase = null; // Will be set to nearest building

    // Gathering timer
    this.gatherTimer = 0;
    this.gatherDuration = UNIT.GATHER_DURATION;
    this.baseGatherDuration = UNIT.GATHER_DURATION;

    // Apply worker-specific research bonuses at spawn
    this.applyWorkerBonuses();

    // Pending gather flag (set when moving to resource)
    this.pendingGatherStart = false;

    // Pending return to base flag (set when moving to base)
    this.pendingReturnToBase = false;

    // Building construction
    this.targetBuilding = null;
    this.pendingConstruction = false;

    // Create status text for gathering
    this.statusText = scene.add.text(0, -this.size / 2 - 25, '', {
      fontSize: '14px',
      fill: '#FFD700',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.statusText.setOrigin(0.5);
    this.add(this.statusText);
  }

  /**
   * Override update to handle gathering states
   */
  update(time, delta) {
    // Call parent update for movement
    super.update(time, delta);

    // Handle gathering-specific states
    if (this.state === UNIT_STATES.GATHERING) {
      this.updateGatheringBehavior(delta);
    } else if (this.state === UNIT_STATES.RETURNING) {
      this.updateReturningBehavior(delta);
    } else if (this.state === UNIT_STATES.CONSTRUCTING) {
      this.updateConstructing(delta);
    } else if (this.state === UNIT_STATES.MOVING && this.pendingGatherStart) {
      // Check if target resource was depleted while moving to it
      if (!this.targetResource || !this.targetResource.hasResources()) {
        console.log('Goose: Target resource depleted while moving, finding new resource');
        this.pendingGatherStart = false;
        const resourceType = this.targetResource ? this.targetResource.getResourceType() : null;
        this.targetResource = null;
        if (resourceType) {
          this.findAndGatherNearestResource(resourceType);
        } else {
          this.setState(UNIT_STATES.IDLE);
        }
      }
    }

    // Check if carrying resources and near any friendly building - deposit automatically
    const totalResources = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
    if (totalResources > 0) {
      const nearbyBuilding = this.findNearbyDepositBuilding();
      if (nearbyBuilding) {
        // Check if there's storage space for any resource we're carrying
        const hasSpace = this.hasStorageSpaceForInventory();
        if (hasSpace) {
          console.log(`Goose: Near building ${nearbyBuilding.buildingName}, depositing ${totalResources} resources`);
          this.pendingReturnToBase = false;
          this.depositResources();
          // If was returning to base, continue gathering
          if (this.state === UNIT_STATES.RETURNING || this.state === UNIT_STATES.MOVING) {
            if (this.targetResource && this.targetResource.hasResources()) {
              this.gatherFrom(this.targetResource);
            } else if (this.targetResource) {
              this.findAndGatherNearestResource(this.targetResource.getResourceType());
            } else {
              this.setState(UNIT_STATES.IDLE);
            }
          }
        } else {
          // Storage full - wait here
          if (this.state === UNIT_STATES.MOVING || this.state === UNIT_STATES.RETURNING) {
            this.setState(UNIT_STATES.IDLE);
            this.pendingReturnToBase = false;
          }
        }
      }
    }

    // Update status text
    this.updateStatusDisplay();
  }

  /**
   * Check if there's storage space for any resource in inventory
   */
  hasStorageSpaceForInventory() {
    // For player faction, check resource manager
    if (this.faction === FACTIONS.PLAYER && this.scene.resourceManager) {
      // Check if any resource we're carrying has storage space
      if (this.inventory.food > 0 && this.scene.resourceManager.hasStorageSpaceFor('food')) return true;
      if (this.inventory.water > 0 && this.scene.resourceManager.hasStorageSpaceFor('water')) return true;
      if (this.inventory.sticks > 0 && this.scene.resourceManager.hasStorageSpaceFor('sticks')) return true;
      if (this.inventory.tools > 0 && this.scene.resourceManager.hasStorageSpaceFor('tools')) return true;
      return false;
    }
    // AI doesn't have storage limits for now
    return true;
  }

  /**
   * Find a nearby friendly building to deposit resources
   */
  findNearbyDepositBuilding() {
    const depositRadius = 120; // Realistic deposit radius
    const buildings = this.scene.buildings;

    for (const building of buildings) {
      if (!building.active) continue;
      if (building.faction !== this.faction) continue;
      if (building.state !== 'OPERATIONAL') continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
      if (distance < depositRadius) {
        return building;
      }
    }
    return null;
  }

  /**
   * Update status display based on current state
   */
  updateStatusDisplay() {
    if (!this.statusText) return;

    if (this.state === UNIT_STATES.GATHERING && this.targetResource) {
      const progress = Math.floor((this.gatherTimer / this.gatherDuration) * 100);
      const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
      this.statusText.setText(`⛏️ ${progress}% [${total}/${this.inventoryMax}]`);
      this.statusText.setVisible(true);
    } else if (this.state === UNIT_STATES.RETURNING) {
      const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
      this.statusText.setText(`📦 ${total} → Base`);
      this.statusText.setVisible(true);
    } else if (this.state === UNIT_STATES.CONSTRUCTING && this.targetBuilding) {
      const progress = Math.floor(this.targetBuilding.constructionProgress);
      this.statusText.setText(`🔨 Building ${progress}%`);
      this.statusText.setVisible(true);
    } else if (this.state === UNIT_STATES.MOVING) {
      const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
      if (total > 0) {
        // Carrying resources while moving
        this.statusText.setText(`📦 ${total}`);
        this.statusText.setVisible(true);
      } else if (this.pendingGatherStart && this.targetResource) {
        // Moving to resource
        this.statusText.setText(`→ ${this.targetResource.getResourceType()}`);
        this.statusText.setVisible(true);
      } else if (this.pendingConstruction && this.targetBuilding) {
        // Moving to building
        this.statusText.setText(`→ 🔨 ${this.targetBuilding.buildingName}`);
        this.statusText.setVisible(true);
      } else {
        this.statusText.setVisible(false);
      }
    } else if (this.state === UNIT_STATES.IDLE) {
      const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
      if (total > 0) {
        // Idle with resources - likely waiting for storage space
        const nearbyBuilding = this.findNearbyDepositBuilding();
        if (nearbyBuilding && !this.hasStorageSpaceForInventory()) {
          this.statusText.setText(`⏳ Storage Full`);
          this.statusText.setVisible(true);
        } else {
          this.statusText.setText(`📦 ${total}`);
          this.statusText.setVisible(true);
        }
      } else {
        this.statusText.setVisible(false);
      }
    } else {
      this.statusText.setVisible(false);
    }
  }

  /**
   * Update gathering behavior
   */
  updateGatheringBehavior(delta) {
    if (!this.targetResource || !this.targetResource.hasResources()) {
      // Resource depleted or gone
      console.log(`Goose: Resource depleted or gone, returning to IDLE`);
      this.setState(UNIT_STATES.IDLE);
      this.targetResource = null;
      return;
    }

    // Check if we're at the resource
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.targetResource.x, this.targetResource.y
    );

    // Gather distance - needs to account for:
    // 1. Resource spawn offset (±20 pixels)
    // 2. Unit arriving at grid cell center vs exact resource position
    // Water resources need extra range since units can't walk on water
    const gatherDistance = this.targetResource.getResourceType() === 'water' ? 100 : 70;

    if (distance < gatherDistance) {
      // At the resource, start gathering
      this.gatherTimer += delta;

      if (this.gatherTimer >= this.gatherDuration) {
        // Gather complete
        const resourceType = this.targetResource.getResourceType();
        const amountGathered = this.targetResource.gather(10);

        if (amountGathered > 0) {
          this.addToInventory(resourceType, amountGathered);

          // Only log for player units with verbose logging
          if (this.faction === FACTIONS.PLAYER && window.gcVerbose) {
            console.log(`Goose: Gathered ${amountGathered} ${resourceType}, inventory: food=${this.inventory.food} water=${this.inventory.water} sticks=${this.inventory.sticks} tools=${this.inventory.tools}`);
          }

          // Play gathering sound effect for player units
          if (this.faction === FACTIONS.PLAYER && this.scene.soundManager) {
            if (resourceType === 'sticks') {
              this.scene.soundManager.playSFX('sfx-gather-sticks');
            } else if (resourceType === 'water') {
              this.scene.soundManager.playSFX('sfx-gather-water');
            }
          }
        }

        this.gatherTimer = 0;

        // Check if inventory is full or should continue
        if (this.isInventoryFull()) {
          if (window.gcVerbose) console.log(`Goose: Inventory full (${this.inventoryMax}), returning to base`);
          this.returnToBase();
        } else if (!this.targetResource.hasResources()) {
          if (window.gcVerbose) console.log(`Goose: Resource depleted after gathering`);
          this.findAndGatherNearestResource(resourceType);
        } else if (window.gcVerbose) {
          console.log(`Goose: Continue gathering (${this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools}/${this.inventoryMax})`);
        }
        // Otherwise continue gathering
      }
    } else {
      // Not at resource yet - shouldn't happen in GATHERING state
      if (window.gcVerbose) {
        console.log(`Goose: In GATHERING state but too far from resource (distance: ${Math.round(distance)}), moving to resource`);
      }
      this.gatherFrom(this.targetResource);
    }
  }

  /**
   * Update returning behavior
   */
  updateReturningBehavior(delta) {
    // Check if we're close enough to the base to deposit
    if (!this.homeBase) {
      console.log('Goose: RETURNING state but no home base, depositing anyway');
      this.depositResources();
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Check if homeBase was destroyed
    if (this.homeBase.active === false || !this.homeBase.scene) {
      console.log('Goose: Home base was destroyed during return, depositing anyway');
      this.homeBase = null;
      this.depositResources();
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.homeBase.x, this.homeBase.y
    );
    const depositRadius = 120; // Deposit radius

    // If within deposit radius, deposit
    if (distance < depositRadius) {
      if (window.gcVerbose) console.log(`Goose: Within deposit radius (${Math.round(distance)}px < ${depositRadius}px) - depositing resources`);
      this.depositResources();

      // Return to gathering if resource still available
      if (this.targetResource && this.targetResource.hasResources()) {
        console.log('Goose: Resource still available, returning to gather');
        this.gatherFrom(this.targetResource);
      } else if (this.targetResource) {
        // Resource depleted, try to find another one of same type
        const resourceType = this.targetResource.getResourceType();
        console.log(`Goose: Resource depleted, searching for nearest ${resourceType}`);
        this.findAndGatherNearestResource(resourceType);
      } else {
        console.log('Goose: No target resource, going IDLE');
        this.setState(UNIT_STATES.IDLE);
      }
    }
    // If not within radius, unit is still moving (handled by parent update)
  }

  /**
   * Check if a resource is inside a building (unreachable)
   */
  isResourceInsideBuilding(resourceNode) {
    if (!this.scene.buildings) return false;

    for (const building of this.scene.buildings) {
      if (!building.active) continue;
      const dist = Phaser.Math.Distance.Between(resourceNode.x, resourceNode.y, building.x, building.y);
      // If resource is within building's collision radius, it's inside
      if (dist < building.size * 0.5) {
        return true;
      }
    }
    return false;
  }

  /**
   * Command to gather from a resource node
   */
  gatherFrom(resourceNode) {
    console.log(`Goose: gatherFrom called for ${resourceNode.getResourceType()} at (${resourceNode.x}, ${resourceNode.y})`);

    if (!resourceNode || !resourceNode.hasResources()) {
      console.log('Goose: Resource not available');
      return;
    }

    // Check if resource is inside a building (unreachable)
    if (this.isResourceInsideBuilding(resourceNode)) {
      console.log('Goose: Resource is inside a building, finding another');
      this.findAndGatherNearestResource(resourceNode.getResourceType());
      return;
    }

    this.targetResource = resourceNode;
    this.targetResource.assignWorker(this);
    console.log(`Goose: Assigned worker to resource ${resourceNode.getResourceType()}`);

    // Find nearest building as home base
    this.findHomeBase();
    console.log(`Goose: Home base: ${this.homeBase ? this.homeBase.buildingName : 'none'}`);

    // Reset gather timer
    this.gatherTimer = 0;

    // Check if already at the resource
    const distance = Phaser.Math.Distance.Between(this.x, this.y, resourceNode.x, resourceNode.y);
    console.log(`Goose: Distance to resource: ${Math.round(distance)}`);

    // Gathering distance - must match the check in updateGatheringBehavior
    // Water resources need extra range since units gather from adjacent land
    const gatherDistance = resourceNode.getResourceType() === 'water' ? 100 : 70;

    if (distance < gatherDistance) {
      // Already at resource, start gathering immediately
      console.log(`Goose: Already at resource (distance: ${Math.round(distance)}), starting to gather immediately`);
      this.setState(UNIT_STATES.GATHERING);
    } else {
      // For water resources, pathfind to adjacent land tile instead of water tile
      if (resourceNode.getResourceType() === 'water') {
        const adjacentTile = this.findAdjacentWalkableTile(resourceNode.x, resourceNode.y);
        if (adjacentTile) {
          console.log(`Goose: Moving to adjacent tile near water resource at (${Math.round(adjacentTile.x)}, ${Math.round(adjacentTile.y)})`);
          this.moveTo(adjacentTile.x, adjacentTile.y);
        } else {
          console.error('Goose: Could not find accessible tile near water resource!');
          this.setState(UNIT_STATES.IDLE);
          return;
        }
      } else {
        // Regular land resources - move directly to them
        console.log(`Goose: Moving to resource at (${resourceNode.x}, ${resourceNode.y})`);
        this.moveTo(resourceNode.x, resourceNode.y);
      }

      // State will be set to MOVING by onPathFound callback
      // We'll transition to GATHERING when we arrive
      this.pendingGatherStart = true;
    }

    console.log(`Goose: Starting to gather ${resourceNode.getResourceType()}`);
  }

  /**
   * Find nearest building to use as home base
   */
  findHomeBase() {
    const buildings = this.scene.buildings;
    if (buildings.length === 0) {
      this.homeBase = null;
      return;
    }

    let nearestBuilding = null;
    let nearestDistance = Infinity;

    buildings.forEach(building => {
      if (building.active && building.state === 'OPERATIONAL') {
        const distance = Phaser.Math.Distance.Between(
          this.x, this.y,
          building.x, building.y
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestBuilding = building;
        }
      }
    });

    this.homeBase = nearestBuilding;
  }

  /**
   * Return to base with resources
   */
  returnToBase() {
    if (!this.homeBase) {
      this.findHomeBase();
    }

    if (!this.homeBase) {
      console.log('Goose: No home base available, depositing resources anyway');
      this.depositResources();
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Additional check: ensure homeBase wasn't destroyed
    if (this.homeBase.active === false || !this.homeBase.scene) {
      console.log('Goose: Home base was destroyed, finding new base');
      this.homeBase = null;
      this.findHomeBase();
      if (!this.homeBase) {
        this.depositResources();
        this.setState(UNIT_STATES.IDLE);
        return;
      }
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.homeBase.x, this.homeBase.y);
    const depositRadius = 120; // Deposit radius

    if (distance < depositRadius) {
      // Within deposit radius, deposit immediately without pathfinding
      if (window.gcVerbose) console.log(`Goose: Within deposit radius (${Math.round(distance)}px < ${depositRadius}px), depositing`);
      this.depositResources();

      // Continue gathering if resource available
      if (this.targetResource && this.targetResource.hasResources()) {
        this.gatherFrom(this.targetResource);
      } else if (this.targetResource) {
        this.findAndGatherNearestResource(this.targetResource.getResourceType());
      } else {
        this.setState(UNIT_STATES.IDLE);
      }
    } else {
      // Too far, move closer to base
      this.pendingReturnToBase = true;

      // Find a walkable tile near the base - auto-deposit will trigger when we're close enough
      const adjacentTile = this.findAdjacentWalkableTile(this.homeBase.x, this.homeBase.y);

      if (adjacentTile) {
        console.log(`Goose: Returning to base, moving to walkable tile (${Math.round(adjacentTile.x)}, ${Math.round(adjacentTile.y)})`);
        this.moveTo(adjacentTile.x, adjacentTile.y);
      } else {
        // No walkable tile found, just move toward base - auto-deposit will handle it
        console.log(`Goose: No walkable tile near base, moving toward base center`);
        this.moveTo(this.homeBase.x, this.homeBase.y);
      }
    }
  }

  /**
   * Deposit resources at base (to player or AI resource pool based on faction)
   */
  depositResources() {
    const resources = this.emptyInventory();
    const isPlayer = this.faction === FACTIONS.PLAYER;

    if (isPlayer) {
      console.log(`Goose: Depositing resources: food=${resources.food}, water=${resources.water}, sticks=${resources.sticks}, tools=${resources.tools}`);
    }

    // Check faction and deposit to appropriate manager
    if (this.faction === 'ENEMY_AI') {
      // Deposit to AI manager
      if (this.scene.aiManager) {
        for (const [type, amount] of Object.entries(resources)) {
          if (amount > 0) {
            this.scene.aiManager.addResources(type, amount);
          }
        }
      } else {
        console.error('Goose: No AI manager found for AI worker!');
      }
    } else {
      // Deposit to player resource manager
      if (this.scene.resourceManager) {
        for (const [type, amount] of Object.entries(resources)) {
          if (amount > 0) {
            if (isPlayer) {
              console.log(`Goose: Adding ${amount} ${type} to player stockpile`);
            }
            this.scene.resourceManager.addResources(type, amount);
          }
        }
      } else {
        console.error('Goose: No resource manager found!');
      }
    }

    if (isPlayer) {
      console.log('Goose: Resources deposited successfully');
    }
  }

  /**
   * Check if inventory is full
   */
  isInventoryFull() {
    const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
    return total >= this.inventoryMax;
  }

  /**
   * Add resource to inventory (capped at max capacity)
   */
  addToInventory(resourceType, amount) {
    if (this.inventory.hasOwnProperty(resourceType)) {
      const currentTotal = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
      const spaceLeft = this.inventoryMax - currentTotal;
      const actualAmount = Math.min(amount, spaceLeft);
      this.inventory[resourceType] += actualAmount;
      return actualAmount;
    }
    return 0;
  }

  /**
   * Empty inventory (deposit resources)
   */
  emptyInventory() {
    const resources = { ...this.inventory };
    this.inventory.food = 0;
    this.inventory.water = 0;
    this.inventory.sticks = 0;
    this.inventory.tools = 0;
    return resources;
  }

  /**
   * Find an adjacent walkable tile near a world position (uses pathfinding grid)
   */
  findAdjacentWalkableTile(worldX, worldY) {
    const centerGrid = worldToGridInt(worldX, worldY);
    const grid = this.scene.isometricMap.getPathfindingGrid();

    // Search in expanding circles around the target (up to 4 tiles away for 3x3 buildings)
    const searchOffsets = [
      // Adjacent tiles (1 step away)
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
      // 2 steps away
      { dx: 2, dy: 0 }, { dx: -2, dy: 0 }, { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
      { dx: 2, dy: 1 }, { dx: 2, dy: -1 }, { dx: -2, dy: 1 }, { dx: -2, dy: -1 },
      { dx: 1, dy: 2 }, { dx: -1, dy: 2 }, { dx: 1, dy: -2 }, { dx: -1, dy: -2 },
      { dx: 2, dy: 2 }, { dx: 2, dy: -2 }, { dx: -2, dy: 2 }, { dx: -2, dy: -2 },
      // 3 steps away (for 3x3 buildings)
      { dx: 3, dy: 0 }, { dx: -3, dy: 0 }, { dx: 0, dy: 3 }, { dx: 0, dy: -3 },
      { dx: 3, dy: 1 }, { dx: 3, dy: -1 }, { dx: -3, dy: 1 }, { dx: -3, dy: -1 },
      { dx: 1, dy: 3 }, { dx: -1, dy: 3 }, { dx: 1, dy: -3 }, { dx: -1, dy: -3 },
      // 4 steps away (safety margin)
      { dx: 4, dy: 0 }, { dx: -4, dy: 0 }, { dx: 0, dy: 4 }, { dx: 0, dy: -4 }
    ];

    for (const offset of searchOffsets) {
      const testX = centerGrid.x + offset.dx;
      const testY = centerGrid.y + offset.dy;

      // Check bounds and pathfinding grid (0 = walkable)
      if (testY >= 0 && testY < grid.length && testX >= 0 && testX < grid[0].length) {
        if (grid[testY][testX] === 0) {
          const worldPos = this.scene.isometricMap.getWorldPosCenter(testX, testY);
          return worldPos;
        }
      }
    }

    console.warn('Goose: No walkable tiles found near target');
    return null;
  }

  /**
   * Find and gather from nearest resource of the given type
   */
  findAndGatherNearestResource(resourceType) {
    // Use spatial hash for efficient nearest neighbor search
    const searchRadius = 1000; // Search within 1000px radius (reduced to prevent wandering)

    const nearestNode = this.scene.resourceSpatialHash.findNearest(
      this.x,
      this.y,
      searchRadius,
      (node) => {
        // Filter: only active nodes of matching type with resources available
        return node.active &&
               node.getResourceType() === resourceType &&
               node.hasResources();
      }
    );

    if (nearestNode) {
      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        nearestNode.x, nearestNode.y
      );
      console.log(`Goose: Found nearest ${resourceType} at distance ${Math.round(distance)}`);
      this.gatherFrom(nearestNode);
    } else {
      console.log(`Goose: No more ${resourceType} resources available within ${searchRadius}px, going IDLE`);
      this.targetResource = null;
      this.setState(UNIT_STATES.IDLE);
    }
  }

  /**
   * Command to build/repair a building
   */
  buildConstruction(building) {
    if (!building) {
      console.log('Goose: No building to construct');
      return;
    }

    console.log(`Goose: Assigned to build ${building.buildingName}`);
    this.targetBuilding = building;

    // Move to building location
    const buildDistance = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
    const constructionRadius = 100;

    if (buildDistance < constructionRadius) {
      // Already at building, start constructing
      console.log('Goose: Already at building, starting construction');
      this.setState(UNIT_STATES.CONSTRUCTING);
    } else {
      // Move to building
      console.log(`Goose: Moving to building (distance: ${Math.round(buildDistance)})`);
      this.pendingConstruction = true;
      this.moveTo(building.x, building.y);
    }
  }

  /**
   * Update constructing behavior
   */
  updateConstructing(delta) {
    if (!this.targetBuilding || !this.targetBuilding.active) {
      console.log('Goose: Building no longer exists, going idle');
      this.targetBuilding = null;
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Check if building is complete
    if (this.targetBuilding.state === BUILDING_STATES.OPERATIONAL) {
      console.log('Goose: Building complete, going idle');
      this.targetBuilding = null;
      this.setState(UNIT_STATES.IDLE);
      return;
    }

    // Check if still in range
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.targetBuilding.x, this.targetBuilding.y
    );
    const constructionRadius = 100;

    if (distance > constructionRadius) {
      console.log('Goose: Too far from building, moving closer');
      this.moveTo(this.targetBuilding.x, this.targetBuilding.y);
      return;
    }

    // Contribute to construction progress
    const buildRate = 0.1; // % per second
    const progress = (buildRate * delta) / 1000 * 100;
    this.targetBuilding.addConstructionProgress(progress);
  }

  /**
   * Stop gathering and return to idle (keeps resources in inventory)
   */
  stopGathering() {
    console.log('Goose: Stopping gathering');

    // Remove from resource node
    if (this.targetResource) {
      this.targetResource.removeWorker(this);
      this.targetResource = null;
    }

    // Clear any pending operations
    this.pendingGatherStart = false;
    this.pendingReturnToBase = false;

    // Keep resources in inventory - will deposit when near a building

    // Go to idle state
    this.setState(UNIT_STATES.IDLE);
  }

  /**
   * Override setState to handle gathering cleanup
   */
  setState(newState) {
    // If leaving gathering state, remove worker from resource
    if (this.state === UNIT_STATES.GATHERING && newState !== UNIT_STATES.GATHERING) {
      if (this.targetResource) {
        this.targetResource.removeWorker(this);
      }
    }

    // Clear pending flags if transitioning to IDLE (e.g., path failed)
    if (newState === UNIT_STATES.IDLE) {
      this.pendingGatherStart = false;
      this.pendingReturnToBase = false;
      // Keep resources in inventory - will deposit when near a building
    }

    super.setState(newState);
  }

  /**
   * Apply worker-specific bonuses at spawn
   */
  applyWorkerBonuses() {
    // Only apply for player faction
    if (this.faction !== FACTIONS.PLAYER) return;

    // Check for building upgrades (Coop's Large Nests)
    if (this.scene.buildingUpgrades?.largeNests) {
      this.applyCarryBonus(10);
    }

    // Check for research upgrades (Efficient Gathering)
    if (this.scene.researchUpgrades?.efficientGathering) {
      this.applyGatheringBonus(1.25); // 25% faster
    }
  }

  /**
   * Apply carry capacity bonus (e.g., from Large Nests upgrade)
   */
  applyCarryBonus(amount) {
    this.inventoryMax = this.baseInventoryMax + amount;
    console.log(`Goose: Carry capacity increased to ${this.inventoryMax}`);
  }

  /**
   * Apply gathering speed bonus (e.g., from Efficient Gathering research)
   */
  applyGatheringBonus(multiplier) {
    this.gatherDuration = Math.floor(this.baseGatherDuration / multiplier);
    console.log(`Goose: Gather duration reduced to ${this.gatherDuration}ms`);
  }
}
