// Goose - Worker Unit

import Unit from './Unit.js';
import { UNIT, UNIT_STATES, BUILDING_STATES } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';

export default class Goose extends Unit {
  constructor(scene, x, y, faction) {
    // Configure worker goose properties (use builder sprite for worker units)
    const config = {
      type: 'goose',
      health: UNIT.HEALTH_MAX,
      speed: UNIT.SPEED_WORKER,
      visionRange: UNIT.VISION_RANGE,
      spriteKey: 'builder', // Use builder sprite for worker
      size: 32
    };

    super(scene, x, y, config, faction);

    // Worker-specific properties
    this.inventory = {
      food: 0,
      water: 0,
      sticks: 0,
      tools: 0
    };
    this.inventoryMax = UNIT.INVENTORY_MAX;
    this.targetResource = null;
    this.homeBase = null; // Will be set to nearest building

    // Gathering timer
    this.gatherTimer = 0;
    this.gatherDuration = UNIT.GATHER_DURATION;

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
    }

    // Update status text
    this.updateStatusDisplay();
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

    // Extended gather distance for water resources
    const gatherDistance = this.targetResource.getResourceType() === 'water' ? 80 : 50;

    if (distance < gatherDistance) {
      // At the resource, start gathering
      this.gatherTimer += delta;

      if (this.gatherTimer >= this.gatherDuration) {
        // Gather complete
        const resourceType = this.targetResource.getResourceType();
        const amountGathered = this.targetResource.gather(10);

        if (amountGathered > 0) {
          this.addToInventory(resourceType, amountGathered);
          console.log(`Goose: Gathered ${amountGathered} ${resourceType}, inventory: food=${this.inventory.food} water=${this.inventory.water} sticks=${this.inventory.sticks} tools=${this.inventory.tools}`);
        }

        this.gatherTimer = 0;

        // Check if inventory is full or should continue
        if (this.isInventoryFull()) {
          console.log(`Goose: Inventory full (${this.inventoryMax}), returning to base`);
          this.returnToBase();
        } else if (!this.targetResource.hasResources()) {
          console.log(`Goose: Resource depleted after gathering`);
          this.findAndGatherNearestResource(resourceType);
        } else {
          console.log(`Goose: Continue gathering (${this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools}/${this.inventoryMax})`);
        }
        // Otherwise continue gathering
      }
    } else {
      // Not at resource yet - shouldn't happen in GATHERING state
      console.log(`Goose: In GATHERING state but too far from resource (distance: ${Math.round(distance)}), moving to resource`);
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
    const depositRadius = 180; // Same as in returnToBase()

    // If within deposit radius, deposit
    if (distance < depositRadius) {
      console.log(`Goose: Within deposit radius (${Math.round(distance)}px < ${depositRadius}px) - depositing resources`);
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
   * Command to gather from a resource node
   */
  gatherFrom(resourceNode) {
    console.log(`Goose: gatherFrom called for ${resourceNode.getResourceType()} at (${resourceNode.x}, ${resourceNode.y})`);

    if (!resourceNode || !resourceNode.hasResources()) {
      console.log('Goose: Resource not available');
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

    // Gathering distance increased for water resources (gather from adjacent land tile)
    const gatherDistance = resourceNode.getResourceType() === 'water' ? 80 : 50;

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
    const depositRadius = 180; // Increased radius for easier drop-off

    if (distance < depositRadius) {
      // Within deposit radius, deposit immediately without pathfinding
      console.log(`Goose: Within deposit radius (${Math.round(distance)}px < ${depositRadius}px), depositing`);
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
      // Set state to RETURNING first, then start moving
      this.pendingReturnToBase = true;

      // Find a walkable tile near the base perimeter
      const adjacentTile = this.findAdjacentWalkableTile(this.homeBase.x, this.homeBase.y);

      if (adjacentTile) {
        console.log(`Goose: Returning to base (distance: ${Math.round(distance)}px), moving to (${Math.round(adjacentTile.x)}, ${Math.round(adjacentTile.y)})`);
        this.moveTo(adjacentTile.x, adjacentTile.y);
        // State will be set to MOVING by moveTo, but will transition to RETURNING when arrived
      } else {
        // Can't find walkable tile, but if we're reasonably close, just deposit
        if (distance < 250) {
          console.log(`Goose: Can't find path but close enough (${Math.round(distance)}px), depositing anyway`);
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
          console.error(`Goose: Could not find walkable tile near base and too far to deposit (${Math.round(distance)}px)!`);
          console.error(`Goose: Base position: (${Math.round(this.homeBase.x)}, ${Math.round(this.homeBase.y)})`);
          console.error(`Goose: Current position: (${Math.round(this.x)}, ${Math.round(this.y)})`);
          this.pendingReturnToBase = false;
          this.setState(UNIT_STATES.IDLE);
        }
      }
    }
  }

  /**
   * Deposit resources at base (to player or AI resource pool based on faction)
   */
  depositResources() {
    const resources = this.emptyInventory();

    console.log(`Goose: Depositing resources: food=${resources.food}, water=${resources.water}, sticks=${resources.sticks}, tools=${resources.tools}`);

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
            console.log(`Goose: Adding ${amount} ${type} to player stockpile`);
            this.scene.resourceManager.addResources(type, amount);
          }
        }
      } else {
        console.error('Goose: No resource manager found!');
      }
    }

    console.log('Goose: Resources deposited successfully');
  }

  /**
   * Check if inventory is full
   */
  isInventoryFull() {
    const total = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
    return total >= this.inventoryMax;
  }

  /**
   * Add resource to inventory
   */
  addToInventory(resourceType, amount) {
    if (this.inventory.hasOwnProperty(resourceType)) {
      this.inventory[resourceType] += amount;
      return true;
    }
    return false;
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
   * Find an adjacent walkable tile near a world position
   */
  findAdjacentWalkableTile(worldX, worldY) {
    const centerGrid = worldToGridInt(worldX, worldY);

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

      if (this.scene.isometricMap.isWalkable(testX, testY)) {
        const worldPos = this.scene.isometricMap.getWorldPosCenter(testX, testY);
        console.log(`Goose: Found walkable tile at grid (${testX}, ${testY}), world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
        return worldPos;
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
   * Stop gathering and return to idle
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

    // Clear inventory if carrying resources
    const totalResources = this.inventory.food + this.inventory.water + this.inventory.sticks + this.inventory.tools;
    if (totalResources > 0) {
      console.log('Goose: Depositing resources before stopping');
      this.depositResources();
    }

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
    }

    super.setState(newState);
  }
}
