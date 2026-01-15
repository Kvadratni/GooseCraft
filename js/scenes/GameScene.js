// Game Scene - Main Gameplay

import { CAMERA, MAP, TILE, FACTIONS } from '../utils/Constants.js';
import IsometricMap from '../systems/IsometricMap.js';
import PathfindingManager from '../systems/PathfindingManager.js';
import SelectionManager from '../systems/SelectionManager.js';
import ResourceManager from '../systems/ResourceManager.js';
import BuildingManager from '../systems/BuildingManager.js';
import BuildingUnlockManager from '../systems/BuildingUnlockManager.js';
import AIManager from '../systems/AIManager.js';
import FogOfWar from '../systems/FogOfWar.js';
import SpatialHash from '../utils/SpatialHash.js';
import Goose from '../entities/Goose.js';
import ResourceNode from '../entities/ResourceNode.js';
import Coop from '../buildings/Coop.js';
import { screenToWorld } from '../utils/IsometricUtils.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('GameScene: Initializing...');

    // Initialize core systems
    this.isometricMap = new IsometricMap(this);
    this.pathfindingManager = new PathfindingManager(this, this.isometricMap);
    this.selectionManager = new SelectionManager(this);
    this.resourceManager = new ResourceManager(this);
    this.buildingUnlockManager = new BuildingUnlockManager(this);
    this.buildingManager = new BuildingManager(this);
    this.aiManager = new AIManager(this);
    this.fogOfWar = new FogOfWar(this);

    // Initialize spatial hash for efficient resource queries (cell size = 200px)
    this.resourceSpatialHash = new SpatialHash(200);

    // Debug mode
    this.debugMode = false;
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(10000); // Draw on top

    // Setup camera
    this.setupCamera();

    // Setup input controls
    this.setupInput();

    // Create custom cursor
    this.createCursor();

    // Initialize game state
    this.units = [];
    this.buildings = [];
    this.resourceNodes = [];

    // Store base spawn location
    this.baseSpawnGrid = null;

    // Spawn starting base
    this.spawnStartingBase();

    // Spawn starting units (3 worker geese)
    this.spawnStartingUnits();

    // Spawn resource nodes
    this.spawnResourceNodes();

    // Spawn AI enemy base and units
    this.aiManager.spawnAIBase();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    console.log('GameScene: Ready');
  }

  update(time, delta) {
    // Update camera controls
    this.updateCameraControls(delta);

    // Update custom cursor position
    if (this.customCursor && this.input.activePointer) {
      this.customCursor.x = this.input.activePointer.x;
      this.customCursor.y = this.input.activePointer.y;
    }

    // Update AI manager
    if (this.aiManager) {
      this.aiManager.update(delta);
    }

    // Update fog of war
    if (this.fogOfWar) {
      this.fogOfWar.update();
    }

    // Update all units
    this.units.forEach(unit => {
      if (unit.active) {
        unit.update(time, delta);
      }
    });

    // Update resource nodes
    this.resourceNodes.forEach(node => {
      if (node.active) {
        node.update(time, delta);
      }
    });

    // Update buildings
    this.buildings.forEach(building => {
      if (building.active) {
        building.update(time, delta);
      }
    });

    // Draw debug hitboxes if debug mode is enabled
    if (this.debugMode) {
      this.drawDebugHitboxes();
    }
  }

  /**
   * Check if a water tile is accessible (has adjacent land tiles) and is at edge
   */
  isWaterTileAccessible(gridX, gridY) {
    // Check all 8 adjacent tiles
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];

    let adjacentLandCount = 0;
    let adjacentWaterCount = 0;

    for (const [dx, dy] of offsets) {
      const checkX = gridX + dx;
      const checkY = gridY + dy;
      const tile = this.isometricMap.getTile(checkX, checkY);

      if (!tile) continue;

      if (tile.walkable) {
        adjacentLandCount++;
      } else if (tile.terrainType === 'water') {
        adjacentWaterCount++;
      }
    }

    // Water resource should be at edge: has land nearby but not completely surrounded by land
    // At least 2 adjacent land tiles for accessibility, but not more than 5 (to avoid center of lakes)
    return adjacentLandCount >= 2 && adjacentLandCount <= 5;
  }

  /**
   * Spawn resource nodes on the map
   */
  spawnResourceNodes() {
    const baseSpawnGridX = Math.floor(MAP.GRID_WIDTH * 0.3);
    const baseSpawnGridY = Math.floor(MAP.GRID_HEIGHT * 0.3);

    // Configuration for resource distribution (scaled for larger map)
    const resourceConfig = {
      trees: {
        count: 1000,  // 25x more trees for 5x larger map (40 * 25)
        type: 'sticks',
        terrainTypes: ['grass', 'dirt', 'rock']  // Trees can spawn on various land types
      },
      crops: {
        count: 500,  // 25x more food sources (20 * 25)
        type: 'food',
        terrainTypes: ['grass', 'dirt']  // Crops prefer grass/dirt
      },
      water: {
        count: 375,  // 25x more water sources (15 * 25)
        type: 'water',
        terrainTypes: ['water']  // Only on water
      }
    };

    // Spawn each resource type
    for (const [resourceName, config] of Object.entries(resourceConfig)) {
      let spawned = 0;
      let attempts = 0;
      const maxAttempts = config.count * 10;  // Allow multiple attempts per resource

      while (spawned < config.count && attempts < maxAttempts) {
        attempts++;

        // Generate random grid position across the entire map
        const gridX = Math.floor(Math.random() * MAP.GRID_WIDTH);
        const gridY = Math.floor(Math.random() * MAP.GRID_HEIGHT);

        // Don't spawn too close to base spawn area
        const distFromBase = Math.sqrt(
          Math.pow(gridX - baseSpawnGridX, 2) +
          Math.pow(gridY - baseSpawnGridY, 2)
        );
        if (distFromBase < 6) continue;  // Skip if too close to base

        // Get tile to check terrain
        const tile = this.isometricMap.getTile(gridX, gridY);
        if (!tile) continue;

        // Check if terrain type is valid for this resource
        if (!config.terrainTypes.includes(tile.terrainType)) {
          continue;
        }

        // Special check for water resources - must be accessible from land
        if (config.type === 'water') {
          if (!this.isWaterTileAccessible(gridX, gridY)) {
            continue;  // Skip water tiles that aren't adjacent to land
          }
        }

        // Get world position for this grid cell
        const worldPos = this.isometricMap.getWorldPosCenter(gridX, gridY);

        // Add small random offset for visual variety
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;

        const node = new ResourceNode(
          this,
          worldPos.x + offsetX,
          worldPos.y + offsetY,
          config.type
        );

        this.resourceNodes.push(node);

        // Add to spatial hash for efficient queries
        this.resourceSpatialHash.insert(node, node.x, node.y);

        spawned++;
      }

      console.log(`GameScene: Spawned ${spawned} ${resourceName} (${config.type})`);
    }

    console.log(`GameScene: Total resource nodes spawned: ${this.resourceNodes.length}`);
  }

  /**
   * Spawn starting base (Coop)
   */
  spawnStartingBase() {
    // Base spawn area - southwest quadrant, away from center
    const baseAreaX = Math.floor(MAP.GRID_WIDTH * 0.3); // 30% from left
    const baseAreaY = Math.floor(MAP.GRID_HEIGHT * 0.3); // 30% from top

    // Find a walkable tile in the base area
    let spawnGridX = baseAreaX;
    let spawnGridY = baseAreaY;

    // Search in a spiral pattern from base area for walkable tile
    let found = false;
    for (let radius = 0; radius < 15 && !found; radius++) {
      for (let dx = -radius; dx <= radius && !found; dx++) {
        for (let dy = -radius; dy <= radius && !found; dy++) {
          const testX = baseAreaX + dx;
          const testY = baseAreaY + dy;

          if (this.isometricMap.isWalkable(testX, testY)) {
            spawnGridX = testX;
            spawnGridY = testY;
            found = true;
            console.log(`GameScene: Found walkable spawn at grid (${spawnGridX}, ${spawnGridY})`);
          }
        }
      }
    }

    // Store the spawn location
    this.baseSpawnGrid = { x: spawnGridX, y: spawnGridY };

    const baseWorld = this.isometricMap.getWorldPosCenter(spawnGridX, spawnGridY);

    // Create the starting Coop
    const coop = new Coop(this, baseWorld.x, baseWorld.y, FACTIONS.PLAYER);
    this.buildings.push(coop);

    // Center camera on the starting base
    this.cameras.main.centerOn(baseWorld.x, baseWorld.y);

    console.log(`GameScene: Spawned starting Coop at world (${baseWorld.x}, ${baseWorld.y}), grid (${spawnGridX}, ${spawnGridY})`);
  }

  /**
   * Spawn starting units
   */
  spawnStartingUnits() {
    if (!this.baseSpawnGrid) {
      console.error('GameScene: No base spawn location found!');
      return;
    }

    // Spawn units near the base on walkable tiles
    const spawnOffsets = [
      { dx: 2, dy: 0 },
      { dx: 3, dy: 1 },
      { dx: 2, dy: 2 }
    ];

    let spawnedCount = 0;
    for (const offset of spawnOffsets) {
      const testX = this.baseSpawnGrid.x + offset.dx;
      const testY = this.baseSpawnGrid.y + offset.dy;

      // Check if this position is walkable
      if (this.isometricMap.isWalkable(testX, testY)) {
        const spawnWorld = this.isometricMap.getWorldPosCenter(testX, testY);
        const goose = new Goose(this, spawnWorld.x, spawnWorld.y, FACTIONS.PLAYER);
        this.units.push(goose);
        spawnedCount++;
        console.log(`GameScene: Spawned worker at grid (${testX}, ${testY})`);
      } else {
        console.warn(`GameScene: Skip spawn at (${testX}, ${testY}) - not walkable`);

        // Find nearest walkable tile
        for (let radius = 1; radius < 5; radius++) {
          let foundWalkable = false;
          for (let dx = -radius; dx <= radius && !foundWalkable; dx++) {
            for (let dy = -radius; dy <= radius && !foundWalkable; dy++) {
              const altX = testX + dx;
              const altY = testY + dy;
              if (this.isometricMap.isWalkable(altX, altY)) {
                const spawnWorld = this.isometricMap.getWorldPosCenter(altX, altY);
                const goose = new Goose(this, spawnWorld.x, spawnWorld.y, FACTIONS.PLAYER);
                this.units.push(goose);
                spawnedCount++;
                foundWalkable = true;
                console.log(`GameScene: Spawned worker at alternate location (${altX}, ${altY})`);
              }
            }
          }
          if (foundWalkable) break;
        }
      }
    }

    console.log(`GameScene: Spawned ${spawnedCount} starting workers`);
  }

  /**
   * Setup camera bounds and properties
   */
  setupCamera() {
    const camera = this.cameras.main;

    // Calculate isometric world bounds
    // Isometric map forms a diamond shape
    const mapWidthInWorld = MAP.GRID_WIDTH * TILE.WIDTH_HALF;
    const mapHeightInWorld = MAP.GRID_HEIGHT * TILE.HEIGHT_HALF;

    // Total diamond dimensions
    const diamondWidth = mapWidthInWorld * 2; // Left to right extent
    const diamondHeight = mapHeightInWorld * 2; // Top to bottom extent

    // Set camera bounds with padding
    const padding = 200;
    camera.setBounds(
      -mapWidthInWorld - padding,
      -padding,
      diamondWidth + padding * 2,
      diamondHeight + padding * 2
    );

    // Set initial camera position (center of diamond)
    camera.centerOn(0, mapHeightInWorld);

    // Set initial zoom
    camera.setZoom(CAMERA.ZOOM_DEFAULT);

    console.log('GameScene: Camera configured with isometric bounds');
  }

  /**
   * Setup keyboard and mouse input
   */
  setupInput() {
    // Keyboard input for camera panning
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Mouse wheel zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      this.handleZoom(deltaY);
    });

    // Disable right-click context menu
    this.input.mouse.disableContextMenu();

    // Mouse events for selection and building placement
    this.input.on('pointerdown', (pointer) => {
      // Check if in building placement mode
      if (this.buildingManager.isInPlacementMode()) {
        this.buildingManager.handlePointerDown(pointer);
      } else {
        this.selectionManager.handlePointerDown(pointer);

        // Right click - move command
        if (pointer.rightButtonDown()) {
          this.handleRightClick(pointer);
        }
      }
    });

    this.input.on('pointermove', (pointer) => {
      // Building placement takes priority
      if (this.buildingManager.isInPlacementMode()) {
        this.buildingManager.handlePointerMove(pointer);
      } else {
        this.selectionManager.handlePointerMove(pointer);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.buildingManager.isInPlacementMode()) {
        this.selectionManager.handlePointerUp(pointer);
      }
    });

    // Keyboard input for control groups (1-9)
    for (let i = 1; i <= 9; i++) {
      this.input.keyboard.on('keydown-' + i, () => {
        this.selectionManager.handleKeyPress(i.toString());
      });
    }

    // Edge scrolling
    this.edgeScrollMargin = CAMERA.EDGE_SCROLL_MARGIN;

    console.log('GameScene: Input configured');
  }

  /**
   * Create custom cursor
   */
  createCursor() {
    // Hide the default browser cursor
    this.input.setDefaultCursor('none');

    // Create a custom cursor graphic
    this.customCursor = this.add.graphics();
    this.customCursor.setDepth(DEPTH.UI + 100); // Above everything
    this.customCursor.setScrollFactor(0, 0); // Fixed to screen

    // Draw the cursor (simple arrow pointer)
    this.customCursor.fillStyle(0xFFFFFF, 1);
    this.customCursor.lineStyle(2, 0x000000, 1);

    // Draw arrow shape
    this.customCursor.beginPath();
    this.customCursor.moveTo(0, 0);
    this.customCursor.lineTo(0, 16);
    this.customCursor.lineTo(4, 12);
    this.customCursor.lineTo(8, 18);
    this.customCursor.lineTo(10, 16);
    this.customCursor.lineTo(6, 10);
    this.customCursor.lineTo(12, 10);
    this.customCursor.closePath();
    this.customCursor.fillPath();
    this.customCursor.strokePath();

    console.log('GameScene: Custom cursor created');
  }

  /**
   * Handle right click (move, gather, or build command)
   */
  handleRightClick(pointer) {
    console.log('GameScene: Right-click detected');

    const selectedUnits = this.selectionManager.getSelectedUnits();
    console.log(`GameScene: ${selectedUnits.length} units selected`);

    if (selectedUnits.length === 0) {
      console.log('GameScene: No units selected, ignoring right-click');
      return;
    }

    const worldPos = screenToWorld(pointer.x, pointer.y, this.cameras.main);

    // Check if clicking on a resource node
    const clickedResource = this.findResourceAtPosition(worldPos.x, worldPos.y);

    // Check if clicking on a building under construction
    const clickedBuilding = this.findBuildingAtPosition(worldPos.x, worldPos.y);

    if (clickedResource && clickedResource.hasResources()) {
      // Command workers to gather from this resource
      selectedUnits.forEach(unit => {
        if (unit.unitType === 'goose' && unit.gatherFrom) {
          unit.gatherFrom(clickedResource);
        }
      });

      console.log(`GameScene: Gather command on ${clickedResource.getResourceType()}`);

      // Visual feedback - show gather indicator
      this.showGatherIndicator(clickedResource.x, clickedResource.y);
    } else if (clickedBuilding && clickedBuilding.state === 'CONSTRUCTION') {
      // Command workers to build this construction
      selectedUnits.forEach(unit => {
        if (unit.unitType === 'goose' && unit.buildConstruction) {
          unit.buildConstruction(clickedBuilding);
        }
      });

      console.log(`GameScene: Build command on ${clickedBuilding.buildingName}`);

      // Visual feedback - show build indicator
      this.showBuildIndicator(clickedBuilding.x, clickedBuilding.y);
    } else {
      // Regular move command - this also cancels any current gathering
      selectedUnits.forEach(unit => {
        if (unit.unitType === 'goose' && unit.stopGathering) {
          unit.stopGathering();
        }
        unit.moveTo(worldPos.x, worldPos.y);
      });

      console.log(`GameScene: Move command to (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);

      // Visual feedback - show move indicator
      this.showMoveIndicator(worldPos.x, worldPos.y);
    }
  }

  /**
   * Find resource node at position
   */
  findResourceAtPosition(worldX, worldY) {
    const clickRadius = 60; // Increased for easier clicking

    for (let i = this.resourceNodes.length - 1; i >= 0; i--) {
      const node = this.resourceNodes[i];
      if (!node.active) continue;

      const distance = Phaser.Math.Distance.Between(worldX, worldY, node.x, node.y);
      if (distance < clickRadius) {
        console.log(`GameScene: Found resource ${node.getResourceType()} at (${node.x}, ${node.y})`);
        return node;
      }
    }

    return null;
  }

  /**
   * Find building at position
   */
  findBuildingAtPosition(worldX, worldY) {
    const clickRadius = 80; // Larger radius for buildings

    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      if (!building.active) continue;

      const distance = Phaser.Math.Distance.Between(worldX, worldY, building.x, building.y);
      if (distance < clickRadius) {
        console.log(`GameScene: Found building ${building.buildingName} at (${building.x}, ${building.y})`);
        return building;
      }
    }

    return null;
  }

  /**
   * Show visual feedback for gather command
   */
  showGatherIndicator(x, y) {
    // Create a pulsing circle at the resource location
    const indicator = this.add.circle(x, y, 15, 0xFFD700, 0.6);

    // Animate
    this.tweens.add({
      targets: indicator,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 600,
      onComplete: () => indicator.destroy()
    });
  }

  /**
   * Show visual feedback for move command
   */
  showMoveIndicator(x, y) {
    // Create a pulsing circle at the target location
    const indicator = this.add.circle(x, y, 10, 0x00ff00, 0.5);

    // Animate
    this.tweens.add({
      targets: indicator,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => indicator.destroy()
    });
  }

  /**
   * Show visual feedback for build command
   */
  showBuildIndicator(x, y) {
    // Create a pulsing circle at the building location
    const indicator = this.add.circle(x, y, 20, 0xFFAA00, 0.6);

    // Animate
    this.tweens.add({
      targets: indicator,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 600,
      onComplete: () => indicator.destroy()
    });
  }

  /**
   * Update camera controls each frame
   */
  updateCameraControls(delta) {
    const camera = this.cameras.main;
    const panSpeed = CAMERA.PAN_SPEED * (delta / 1000); // Adjust for frame rate

    let panX = 0;
    let panY = 0;

    // WASD / Arrow key panning
    if (this.cursors.left.isDown || this.wasd.a.isDown) {
      panX -= panSpeed;
    }
    if (this.cursors.right.isDown || this.wasd.d.isDown) {
      panX += panSpeed;
    }
    if (this.cursors.up.isDown || this.wasd.w.isDown) {
      panY -= panSpeed;
    }
    if (this.cursors.down.isDown || this.wasd.s.isDown) {
      panY += panSpeed;
    }

    // Mouse edge scrolling
    const pointer = this.input.activePointer;
    if (pointer.x < this.edgeScrollMargin) {
      panX -= panSpeed;
    }
    if (pointer.x > this.cameras.main.width - this.edgeScrollMargin) {
      panX += panSpeed;
    }
    if (pointer.y < this.edgeScrollMargin) {
      panY -= panSpeed;
    }
    if (pointer.y > this.cameras.main.height - this.edgeScrollMargin) {
      panY += panSpeed;
    }

    // Apply panning
    if (panX !== 0 || panY !== 0) {
      camera.scrollX += panX;
      camera.scrollY += panY;
    }
  }

  /**
   * Handle zoom via mouse wheel
   */
  handleZoom(deltaY) {
    const camera = this.cameras.main;
    let newZoom = camera.zoom;

    if (deltaY > 0) {
      // Zoom out
      newZoom -= CAMERA.ZOOM_STEP;
    } else {
      // Zoom in
      newZoom += CAMERA.ZOOM_STEP;
    }

    // Clamp zoom
    newZoom = Phaser.Math.Clamp(newZoom, CAMERA.ZOOM_MIN, CAMERA.ZOOM_MAX);

    // Apply zoom smoothly
    this.tweens.add({
      targets: camera,
      zoom: newZoom,
      duration: 200,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Get the isometric map system
   */
  getIsometricMap() {
    return this.isometricMap;
  }

  /**
   * Get all units
   */
  getUnits() {
    return this.units;
  }

  /**
   * Get all buildings
   */
  getBuildings() {
    return this.buildings;
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (!enabled) {
      this.debugGraphics.clear();
    }
    console.log(`GameScene: Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Draw debug hitboxes
   */
  drawDebugHitboxes() {
    this.debugGraphics.clear();

    // Draw unit hitboxes (cyan circles)
    this.debugGraphics.lineStyle(2, 0x00FFFF, 0.8);
    this.units.forEach(unit => {
      if (unit.active) {
        this.debugGraphics.strokeCircle(unit.x, unit.y, 50); // Increased from 35
      }
    });

    // Draw building hitboxes (green circles)
    this.debugGraphics.lineStyle(2, 0x00FF00, 0.8);
    this.buildings.forEach(building => {
      if (building.active) {
        this.debugGraphics.strokeCircle(building.x, building.y, 80); // Increased from 60
      }
    });

    // Draw resource node hitboxes (yellow circles)
    this.debugGraphics.lineStyle(2, 0xFFFF00, 0.8);
    this.resourceNodes.forEach(node => {
      if (node.active) {
        this.debugGraphics.strokeCircle(node.x, node.y, 60); // Increased from 40
      }
    });
  }
}
