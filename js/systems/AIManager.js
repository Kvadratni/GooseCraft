// AI Manager - Controls enemy AI faction

import { FACTIONS, UNIT_STATES, BUILDING_STATES, MAP, BUILDING } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';
import Coop from '../buildings/Coop.js';
import ResourceStorage from '../buildings/ResourceStorage.js';
import Barracks from '../buildings/Barracks.js';
import Factory from '../buildings/Factory.js';
import Mine from '../buildings/Mine.js';
import Goose from '../entities/Goose.js';
import Guard from '../entities/Guard.js';
import Scout from '../entities/Scout.js';

export default class AIManager {
  constructor(scene) {
    this.scene = scene;
    this.faction = FACTIONS.ENEMY_AI;

    // AI state machine
    this.aiState = 'GATHERING'; // GATHERING, BUILDING, DEFENDING, ATTACKING
    this.updateTimer = 0;
    this.updateInterval = 2000; // Make decisions every 2 seconds

    // AI resources (separate from player)
    this.resources = {
      food: 200,
      water: 100,
      sticks: 150,
      tools: 0
    };

    // AI entity tracking
    this.aiBase = null;
    this.aiBuildings = [];
    this.aiWorkers = [];
    this.aiCombatUnits = [];

    // AI behavior settings
    this.aggression = 0.5; // 0-1, affects when AI attacks
    this.economyFocus = 0.7; // 0-1, affects worker vs military ratio
    this.maxWorkers = 5;
    this.attackArmySize = 3; // Minimum combat units before attacking

    console.log('AIManager: Initialized');
  }

  /**
   * Spawn AI base in opposite corner from player
   */
  spawnAIBase() {
    // AI base location - southeast corner (diagonally opposite player's northwest at 0.3, 0.3)
    const aiBaseGridX = Math.floor(this.scene.mapWidth || MAP.GRID_WIDTH * 0.7);
    const aiBaseGridY = Math.floor(this.scene.mapHeight || MAP.GRID_HEIGHT * 0.7);

    // Find walkable tile
    let spawnGridX = aiBaseGridX;
    let spawnGridY = aiBaseGridY;
    let foundWalkable = false;

    // Spiral search for walkable tile
    for (let radius = 0; radius < 10 && !foundWalkable; radius++) {
      for (let dx = -radius; dx <= radius && !foundWalkable; dx++) {
        for (let dy = -radius; dy <= radius && !foundWalkable; dy++) {
          const testX = aiBaseGridX + dx;
          const testY = aiBaseGridY + dy;
          if (this.scene.isometricMap.isWalkable(testX, testY)) {
            spawnGridX = testX;
            spawnGridY = testY;
            foundWalkable = true;
          }
        }
      }
    }

    const baseWorld = this.scene.isometricMap.getWorldPosCenter(spawnGridX, spawnGridY);

    // Create AI Coop
    this.aiBase = new Coop(this.scene, baseWorld.x, baseWorld.y, FACTIONS.ENEMY_AI);
    this.scene.buildings.push(this.aiBase);
    this.aiBuildings.push(this.aiBase);

    console.log(`AIManager: Spawned AI base at grid (${spawnGridX}, ${spawnGridY})`);

    // Spawn starting workers
    this.spawnStartingWorkers(spawnGridX, spawnGridY);
  }

  /**
   * Spawn starting AI workers
   */
  spawnStartingWorkers(baseX, baseY) {
    const spawnOffsets = [
      { dx: 2, dy: 0 },
      { dx: 3, dy: 1 },
      { dx: 2, dy: 2 }
    ];

    let spawnedCount = 0;

    for (const offset of spawnOffsets) {
      const testX = baseX + offset.dx;
      const testY = baseY + offset.dy;

      if (this.scene.isometricMap.isWalkable(testX, testY)) {
        const spawnWorld = this.scene.isometricMap.getWorldPosCenter(testX, testY);
        const worker = new Goose(this.scene, spawnWorld.x, spawnWorld.y, FACTIONS.ENEMY_AI);
        this.scene.units.push(worker);
        this.aiWorkers.push(worker);
        spawnedCount++;
      }
    }

    console.log(`AIManager: Spawned ${spawnedCount} AI workers`);
  }

  /**
   * Main AI update loop
   */
  update(delta) {
    // Update decision timer
    this.updateTimer += delta;

    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0;
      this.makeDecisions();
    }

    // Always manage economy and army
    this.manageEconomy();
    this.manageArmy();
  }

  /**
   * AI decision-making (state machine)
   */
  makeDecisions() {
    // Update unit lists
    this.updateUnitLists();

    // Check if base destroyed
    if (!this.aiBase || !this.aiBase.active) {
      console.log('AIManager: AI base destroyed, AI defeated');
      return;
    }

    // Count resources and units
    const workerCount = this.aiWorkers.length;
    const combatCount = this.aiCombatUnits.length;
    const totalResources = this.resources.food + this.resources.water + this.resources.sticks;

    // State transitions
    switch (this.aiState) {
      case 'GATHERING':
        // Gather resources, train workers
        if (workerCount < this.maxWorkers && this.canAfford({ food: 50 })) {
          this.trainWorker();
        }

        // Transition to BUILDING if enough resources
        if (totalResources > 500) {
          this.aiState = 'BUILDING';
          console.log('AIManager: Transitioning to BUILDING');
        }

        // Transition to DEFENDING if enemies near base
        if (this.detectEnemyNearBase()) {
          this.aiState = 'DEFENDING';
          console.log('AIManager: Transitioning to DEFENDING - enemies detected!');
        }
        break;

      case 'BUILDING':
        // Build structures
        this.buildStructures();

        // Transition to ATTACKING if army is ready
        if (combatCount >= this.attackArmySize) {
          this.aiState = 'ATTACKING';
          console.log('AIManager: Transitioning to ATTACKING - army ready!');
        }

        // Transition to GATHERING if low resources
        if (totalResources < 200) {
          this.aiState = 'GATHERING';
          console.log('AIManager: Transitioning to GATHERING - low resources');
        }
        break;

      case 'DEFENDING':
        // Recall units, defend base
        // Transition back to GATHERING when threat cleared
        if (!this.detectEnemyNearBase()) {
          this.aiState = 'GATHERING';
          console.log('AIManager: Transitioning to GATHERING - threat cleared');
        }
        break;

      case 'ATTACKING':
        // Send units to attack
        // Transition to DEFENDING if base under attack
        if (this.detectEnemyNearBase()) {
          this.aiState = 'DEFENDING';
          console.log('AIManager: Transitioning to DEFENDING - base under attack!');
        }

        // Transition to GATHERING if army destroyed
        if (combatCount < 1) {
          this.aiState = 'GATHERING';
          console.log('AIManager: Transitioning to GATHERING - army destroyed');
        }
        break;
    }
  }

  /**
   * Manage AI economy
   */
  manageEconomy() {
    // Find incomplete buildings that need construction
    const incompleteBuildings = this.aiBuildings.filter(b =>
      b.active && b.state === BUILDING_STATES.CONSTRUCTION
    );

    // Count how many workers are already constructing
    const constructingWorkers = this.aiWorkers.filter(w =>
      w.active && w.state === UNIT_STATES.CONSTRUCTING
    ).length;

    // Limit construction workers (leave some for gathering)
    const maxConstructionWorkers = Math.min(2, Math.ceil(this.aiWorkers.length / 2));

    // Assign workers to tasks
    this.aiWorkers.forEach(worker => {
      if (!worker.active) return;

      // Ensure workers deposit to AI base
      if (!worker.homeBase || worker.homeBase !== this.aiBase) {
        worker.homeBase = this.aiBase;
      }

      // Check if worker has resources in inventory
      const hasResources = worker.inventory &&
        (worker.inventory.food + worker.inventory.water + worker.inventory.sticks + worker.inventory.tools) > 0;

      // Priority 1: Assign idle workers to construction (if buildings need it)
      if (worker.state === UNIT_STATES.IDLE && incompleteBuildings.length > 0) {
        // Check if we need more construction workers
        const currentConstructing = this.aiWorkers.filter(w =>
          w.active && (w.state === UNIT_STATES.CONSTRUCTING || w.targetBuilding)
        ).length;

        if (currentConstructing < maxConstructionWorkers) {
          const targetBuilding = incompleteBuildings[0];
          worker.buildConstruction(targetBuilding);
          if (window.gcVerbose) console.log(`AIManager: Assigned worker to construct ${targetBuilding.buildingName}`);
          return;
        }
      }

      // Priority 2: Assign idle workers to gather resources
      if (worker.state === UNIT_STATES.IDLE || (worker.state === UNIT_STATES.RETURNING && !hasResources)) {
        const resource = this.findNearestResource(worker);
        if (resource && resource.hasResources()) {
          worker.gatherFrom(resource);
        }
      }
    });
  }

  /**
   * Manage AI army
   */
  manageArmy() {
    // Train combat units if in BUILDING or ATTACKING state
    if ((this.aiState === 'BUILDING' || this.aiState === 'ATTACKING') && this.aiBase) {
      // Check if we have resources and production capacity
      if (this.aiCombatUnits.length < this.attackArmySize * 2) {
        // Try to train a guard (alternate with scout for variety)
        const shouldTrainGuard = this.aiCombatUnits.length % 2 === 0;
        if (shouldTrainGuard && this.canAfford({ food: 75, water: 25, sticks: 50, tools: 5 })) {
          this.trainCombatUnit('guard');
        } else if (this.canAfford({ food: 40, water: 30, sticks: 20, tools: 3 })) {
          this.trainCombatUnit('scout');
        }
      }
    }

    // Command combat units based on state
    if (this.aiState === 'ATTACKING') {
      this.commandAttack();
    } else if (this.aiState === 'DEFENDING') {
      this.commandDefend();
    }
  }

  /**
   * Command AI units to attack player base
   */
  commandAttack() {
    // Find player base
    const playerBase = this.findPlayerMainBase();
    if (!playerBase) return;

    // Send all combat units toward player base
    this.aiCombatUnits.forEach(unit => {
      if (!unit.active) return;

      // If unit is idle or has no target, move to player base
      if (unit.state === UNIT_STATES.IDLE || !unit.targetEnemy) {
        const distance = Phaser.Math.Distance.Between(unit.x, unit.y, playerBase.x, playerBase.y);

        // If not near player base, move there
        if (distance > 300) {
          unit.moveTo(playerBase.x, playerBase.y);
        } else {
          // Near player base, look for enemies to attack
          const enemy = unit.findNearestEnemy();
          if (enemy) {
            unit.engageTarget(enemy);
          }
        }
      }
    });
  }

  /**
   * Command AI units to defend base
   */
  commandDefend() {
    if (!this.aiBase) return;

    // Position combat units near base
    this.aiCombatUnits.forEach(unit => {
      if (!unit.active) return;

      const distanceToBase = Phaser.Math.Distance.Between(unit.x, unit.y, this.aiBase.x, this.aiBase.y);

      // If far from base, move back
      if (distanceToBase > 400) {
        unit.moveTo(this.aiBase.x, this.aiBase.y);
      } else if (unit.state === UNIT_STATES.IDLE) {
        // Patrol around base
        const angle = Math.random() * Math.PI * 2;
        const patrolDist = 200;
        const patrolX = this.aiBase.x + Math.cos(angle) * patrolDist;
        const patrolY = this.aiBase.y + Math.sin(angle) * patrolDist;
        unit.moveTo(patrolX, patrolY);
      }
    });
  }

  /**
   * Train a worker
   */
  trainWorker() {
    if (!this.aiBase || !this.aiBase.productionQueue) return;

    // Deduct resources manually for AI
    const cost = { food: 50, water: 0, sticks: 0, tools: 0 };
    if (!this.spendResources(cost)) return;

    // Spawn worker directly (AI doesn't use production queue timing for simplicity)
    const spawnX = this.aiBase.x + 80;
    const spawnY = this.aiBase.y + 30;
    const worker = new Goose(this.scene, spawnX, spawnY, FACTIONS.ENEMY_AI);
    this.scene.units.push(worker);
    this.aiWorkers.push(worker);

    console.log('AIManager: Trained worker');
  }

  /**
   * Train a combat unit
   */
  trainCombatUnit(unitType) {
    if (!this.aiBase) return;

    // Get cost
    let cost, UnitClass;
    if (unitType === 'guard') {
      cost = { food: 75, water: 25, sticks: 50, tools: 5 };
      UnitClass = Guard;
    } else if (unitType === 'scout') {
      cost = { food: 40, water: 30, sticks: 20, tools: 3 };
      UnitClass = Scout;
    } else {
      return;
    }

    // Deduct resources
    if (!this.spendResources(cost)) return;

    // Spawn unit
    const spawnX = this.aiBase.x + 80;
    const spawnY = this.aiBase.y + 30;
    const unit = new UnitClass(this.scene, spawnX, spawnY, FACTIONS.ENEMY_AI);
    this.scene.units.push(unit);
    this.aiCombatUnits.push(unit);

    console.log(`AIManager: Trained ${unitType}`);
  }

  /**
   * Find nearest resource to unit
   */
  findNearestResource(unit) {
    let nearest = null;
    let nearestDist = Infinity;

    this.scene.resourceNodes.forEach(node => {
      if (!node.active || !node.hasResources()) return;

      const dist = Phaser.Math.Distance.Between(unit.x, unit.y, node.x, node.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = node;
      }
    });

    return nearest;
  }

  /**
   * Find player main base
   */
  findPlayerMainBase() {
    for (const building of this.scene.buildings) {
      if (building.faction === FACTIONS.PLAYER && building.buildingType === 'COOP') {
        return building;
      }
    }
    return null;
  }

  /**
   * Detect if enemy units are near AI base
   */
  detectEnemyNearBase() {
    if (!this.aiBase) return false;

    const threatRadius = 500;

    // Check for enemy units near base
    for (const unit of this.scene.units) {
      if (unit.faction === FACTIONS.PLAYER) {
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, this.aiBase.x, this.aiBase.y);
        if (dist < threatRadius) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update unit lists (remove destroyed units)
   */
  updateUnitLists() {
    this.aiWorkers = this.aiWorkers.filter(u => u.active && u.faction === FACTIONS.ENEMY_AI && u.unitType === 'goose');
    this.aiCombatUnits = this.aiCombatUnits.filter(u => u.active && u.faction === FACTIONS.ENEMY_AI && u.unitType !== 'goose');
  }

  /**
   * Check if AI can afford cost
   */
  canAfford(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Spend AI resources
   */
  spendResources(cost) {
    if (!this.canAfford(cost)) return false;

    for (const resource in cost) {
      this.resources[resource] -= cost[resource];
    }

    return true;
  }

  /**
   * Build structures (called during BUILDING state)
   */
  buildStructures() {
    // Build priority: ResourceStorage -> Factory -> Mine -> Barracks

    // Check if we need ResourceStorage (for capacity and unlocks)
    const hasStorage = this.aiBuildings.some(b => b.buildingType === 'RESOURCE_STORAGE' && b.active);
    if (!hasStorage && this.canAfford({ food: 50, water: 0, sticks: 100, tools: 0 })) {
      this.buildBuilding('RESOURCE_STORAGE');
      return;
    }

    // Check if we need Factory (for tool production)
    const hasFactory = this.aiBuildings.some(b => b.buildingType === 'FACTORY' && b.active);
    if (!hasFactory && hasStorage && this.canAfford({ food: 100, water: 50, sticks: 200, tools: 0 })) {
      this.buildBuilding('FACTORY');
      return;
    }

    // Build Mine on rock terrain (limit to 2)
    const mineCount = this.aiBuildings.filter(b => b.buildingType === 'MINE' && b.active).length;
    if (mineCount < 2 && hasFactory && this.canAfford({ food: 0, water: 50, sticks: 200, tools: 10 })) {
      this.buildBuilding('MINE');
      return;
    }

    // Check if we need Barracks (for combat unit production)
    const hasBarracks = this.aiBuildings.some(b => b.buildingType === 'BARRACKS' && b.active);
    if (!hasBarracks && hasFactory && this.canAfford({ food: 150, water: 0, sticks: 250, tools: 25 })) {
      this.buildBuilding('BARRACKS');
      return;
    }
  }

  /**
   * Build a building
   */
  buildBuilding(buildingType) {
    if (!this.aiBase) return;

    // Building class map
    const buildingClassMap = {
      'RESOURCE_STORAGE': ResourceStorage,
      'BARRACKS': Barracks,
      'FACTORY': Factory,
      'MINE': Mine
    };

    const BuildingClass = buildingClassMap[buildingType];
    if (!BuildingClass) {
      console.error(`AIManager: Unknown building type ${buildingType}`);
      return;
    }

    const config = BUILDING[buildingType];
    if (!config) {
      console.error(`AIManager: No config for building type ${buildingType}`);
      return;
    }

    // Deduct resources
    if (!this.spendResources(config.cost)) {
      console.warn(`AIManager: Not enough resources to build ${buildingType}`);
      return;
    }

    // Find build location near AI base
    const buildLocation = this.findBuildLocation(config.footprint);
    if (!buildLocation) {
      console.warn(`AIManager: No valid build location for ${buildingType}`);
      // Refund resources
      for (const [resource, amount] of Object.entries(config.cost)) {
        this.resources[resource] += amount;
      }
      return;
    }

    // Create building
    const building = new BuildingClass(
      this.scene,
      buildLocation.x,
      buildLocation.y,
      FACTIONS.ENEMY_AI
    );

    this.scene.buildings.push(building);
    this.aiBuildings.push(building);

    console.log(`AIManager: Started building ${buildingType} at (${buildLocation.x}, ${buildLocation.y})`);
  }

  /**
   * Find a valid build location near AI base
   */
  findBuildLocation(footprint) {
    if (!this.aiBase) return null;

    const baseGridPos = worldToGridInt(this.aiBase.x, this.aiBase.y);

    // Search in expanding radius
    for (let radius = 3; radius < 15; radius++) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const testX = Math.round(baseGridPos.x + Math.cos(angle) * radius);
        const testY = Math.round(baseGridPos.y + Math.sin(angle) * radius);

        // Check if location is valid for building
        if (this.isValidBuildLocation(testX, testY, footprint)) {
          const worldPos = this.scene.isometricMap.getWorldPosCenter(testX, testY);
          return worldPos;
        }
      }
    }

    return null;
  }

  /**
   * Check if a location is valid for building placement
   */
  isValidBuildLocation(gridX, gridY, footprint) {
    // Check all footprint tiles
    for (const offset of footprint) {
      const tileX = gridX + offset[0];
      const tileY = gridY + offset[1];

      // Check if tile is walkable
      if (!this.scene.isometricMap.isWalkable(tileX, tileY)) {
        return false;
      }

      // Check if not on water
      const tile = this.scene.isometricMap.getTile(tileX, tileY);
      if (tile && tile.type === 'water') {
        return false;
      }

      // Check if no existing buildings at this location
      const worldPos = this.scene.isometricMap.getWorldPosCenter(tileX, tileY);
      for (const building of this.scene.buildings) {
        if (building.active) {
          const distance = Phaser.Math.Distance.Between(worldPos.x, worldPos.y, building.x, building.y);
          if (distance < 80) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Add resources to AI (called when AI workers deposit)
   */
  addResources(type, amount) {
    if (!this.resources[type]) {
      this.resources[type] = 0;
    }
    this.resources[type] += amount;
    // Silent - AI resource gains don't need to be logged
  }
}
