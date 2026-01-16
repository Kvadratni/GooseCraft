// Building Manager - Building placement and construction

import { COLORS, BUILDING, FACTIONS } from '../utils/Constants.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';
import Building from '../entities/Building.js';
import Coop from '../buildings/Coop.js';
import ResourceStorage from '../buildings/ResourceStorage.js';
import ResearchCenter from '../buildings/ResearchCenter.js';
import Barracks from '../buildings/Barracks.js';
import Factory from '../buildings/Factory.js';
import Mine from '../buildings/Mine.js';
import Airstrip from '../buildings/Airstrip.js';
import Watchtower from '../buildings/Watchtower.js';
import PowerStation from '../buildings/PowerStation.js';
import Farm from '../buildings/Farm.js';
import Well from '../buildings/Well.js';
import LumberMill from '../buildings/LumberMill.js';

export default class BuildingManager {
  constructor(scene) {
    this.scene = scene;

    // Placement state
    this.isPlacementMode = false;
    this.currentBuildingType = null;
    this.ghostPreview = null;
    this.isValidPlacement = false;

    console.log('BuildingManager: Initialized');
  }

  /**
   * Start building placement mode
   */
  startPlacement(buildingType) {
    console.log(`BuildingManager: Starting placement for ${buildingType}`);

    this.isPlacementMode = true;
    this.currentBuildingType = buildingType;

    // Create ghost preview
    this.createGhostPreview();

    // Change cursor
    this.scene.input.setDefaultCursor('crosshair');
  }

  /**
   * Cancel building placement
   */
  cancelPlacement() {
    console.log('BuildingManager: Canceling placement');

    this.isPlacementMode = false;
    this.currentBuildingType = null;

    // Remove ghost preview
    if (this.ghostPreview) {
      this.ghostPreview.destroy();
      this.ghostPreview = null;
    }

    // Reset cursor
    this.scene.input.setDefaultCursor('default');
  }

  /**
   * Create ghost preview for building placement
   */
  createGhostPreview() {
    const config = BUILDING[this.currentBuildingType];
    if (!config) {
      console.error(`BuildingManager: Unknown building type: ${this.currentBuildingType}`);
      return;
    }

    // Create container for ghost
    this.ghostPreview = this.scene.add.container(0, 0);

    // Add range indicator for Watchtower
    if (this.currentBuildingType === 'WATCHTOWER') {
      const rangeRadius = 200; // Base attack range
      const rangeIndicator = this.scene.add.graphics();
      rangeIndicator.lineStyle(2, 0x4a90d9, 0.6);
      rangeIndicator.fillStyle(0x4a90d9, 0.1);
      rangeIndicator.beginPath();
      rangeIndicator.arc(0, 0, rangeRadius, 0, Math.PI * 2);
      rangeIndicator.closePath();
      rangeIndicator.fillPath();
      rangeIndicator.strokePath();
      this.ghostPreview.add(rangeIndicator);
      this.ghostPreview.sendToBack(rangeIndicator); // Behind the building sprite
    }

    // Create sprite (semi-transparent)
    const sprite = this.scene.add.sprite(0, 0, this.getSpriteKey(this.currentBuildingType));
    sprite.setDisplaySize(config.width, config.height);
    sprite.setAlpha(0.5);
    this.ghostPreview.add(sprite);

    // Create footprint indicators
    config.footprint.forEach(offset => {
      const indicator = this.scene.add.circle(
        offset[0] * 32,
        offset[1] * 16,
        8,
        0xffffff,
        0.3
      );
      this.ghostPreview.add(indicator);
    });

    this.ghostPreview.setDepth(999);
  }

  /**
   * Get sprite key for building type
   */
  getSpriteKey(buildingType) {
    const mapping = {
      'COOP': 'command-center',
      'RESOURCE_STORAGE': 'resource-extractor',
      'FACTORY': 'factory',
      'RESEARCH_CENTER': 'research',
      'BARRACKS': 'barracks',
      'MINE': 'mine',
      'AIRSTRIP': 'airstrip',
      'WATCHTOWER': 'tower',
      'POWER_STATION': 'power-station',
      'FARM': 'farm',
      'WELL': 'well',
      'LUMBER_MILL': 'lumber-mill'
    };
    return mapping[buildingType] || 'command-center';
  }

  /**
   * Update ghost preview position
   */
  updateGhostPreview(pointer) {
    if (!this.ghostPreview || !this.isPlacementMode) {
      return;
    }

    // Explicitly use this scene's camera for world coordinate conversion
    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const worldPos = { x: worldPoint.x, y: worldPoint.y };

    // Snap to grid
    const gridPos = worldToGridInt(worldPos.x, worldPos.y);
    const snappedWorld = this.scene.isometricMap.getWorldPosCenter(gridPos.x, gridPos.y);

    // Update ghost position
    this.ghostPreview.x = snappedWorld.x;
    this.ghostPreview.y = snappedWorld.y;

    // Check if placement is valid
    this.isValidPlacement = this.validatePlacement(gridPos.x, gridPos.y);

    // Update color based on validity
    const tint = this.isValidPlacement ? COLORS.PLACEMENT_VALID : COLORS.PLACEMENT_INVALID;
    this.ghostPreview.list.forEach(obj => {
      if (obj.setTint) {
        obj.setTint(tint);
      }
    });
  }

  /**
   * Validate building placement
   */
  validatePlacement(gridX, gridY) {
    const config = BUILDING[this.currentBuildingType];
    if (!config) {
      return false;
    }

    // Check if we can afford it
    if (!this.scene.resourceManager.canAfford(config.cost)) {
      return false;
    }

    // Track rock tiles for Mine placement
    let rockTileCount = 0;

    // Check all footprint tiles
    for (const offset of config.footprint) {
      const tileX = gridX + offset[0];
      const tileY = gridY + offset[1];

      // Check if tile is walkable and not occupied
      if (!this.scene.isometricMap.isWalkable(tileX, tileY)) {
        return false;
      }

      // Check if not on water
      const tile = this.scene.isometricMap.getTile(tileX, tileY);
      if (tile && tile.terrainType === 'water') {
        return false;
      }

      // Count rock tiles for Mine validation
      if (tile && tile.terrainType === 'rock') {
        rockTileCount++;
      }
    }

    // Mine requires at least 2 rock tiles in its footprint
    if (this.currentBuildingType === 'MINE' && rockTileCount < 2) {
      return false;
    }

    return true;
  }

  /**
   * Attempt to place building
   */
  placeBuilding(pointer) {
    if (!this.isPlacementMode || !this.isValidPlacement) {
      return false;
    }

    // Explicitly use this scene's camera for world coordinate conversion
    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const worldPos = { x: worldPoint.x, y: worldPoint.y };
    const gridPos = worldToGridInt(worldPos.x, worldPos.y);
    const snappedWorld = this.scene.isometricMap.getWorldPosCenter(gridPos.x, gridPos.y);

    const config = BUILDING[this.currentBuildingType];

    // Spend resources
    if (!this.scene.resourceManager.spend(config.cost)) {
      console.warn('BuildingManager: Cannot afford building');
      return false;
    }

    // Create the building using specific class if available
    const buildingClassMap = {
      'COOP': Coop,
      'RESOURCE_STORAGE': ResourceStorage,
      'RESEARCH_CENTER': ResearchCenter,
      'BARRACKS': Barracks,
      'FACTORY': Factory,
      'MINE': Mine,
      'AIRSTRIP': Airstrip,
      'WATCHTOWER': Watchtower,
      'POWER_STATION': PowerStation,
      'FARM': Farm,
      'WELL': Well,
      'LUMBER_MILL': LumberMill
    };

    const BuildingClass = buildingClassMap[this.currentBuildingType];
    const faction = FACTIONS.PLAYER; // Player buildings

    let building;

    if (BuildingClass) {
      // Use specialized building class
      building = new BuildingClass(this.scene, snappedWorld.x, snappedWorld.y, faction);
    } else {
      // Use generic building for other types
      const buildingConfig = {
        type: this.currentBuildingType,
        name: config.name,
        health: config.health,
        constructionTime: config.constructionTime,
        footprint: config.footprint,
        spriteKey: this.getSpriteKey(this.currentBuildingType),
        size: Math.max(config.width, config.height)
      };
      building = new Building(this.scene, snappedWorld.x, snappedWorld.y, buildingConfig, faction);
    }

    // Add to buildings array
    this.scene.buildings.push(building);

    console.log(`BuildingManager: Placed ${this.currentBuildingType} at (${snappedWorld.x}, ${snappedWorld.y})`);

    // Cancel placement mode
    this.cancelPlacement();

    return true;
  }

  /**
   * Handle pointer move during placement
   */
  handlePointerMove(pointer) {
    if (this.isPlacementMode) {
      this.updateGhostPreview(pointer);
    }
  }

  /**
   * Handle pointer down during placement
   */
  handlePointerDown(pointer) {
    if (this.isPlacementMode && pointer.leftButtonDown()) {
      this.placeBuilding(pointer);
    } else if (this.isPlacementMode && pointer.rightButtonDown()) {
      // Right-click to cancel
      this.cancelPlacement();
    }
  }

  /**
   * Check if in placement mode
   */
  isInPlacementMode() {
    return this.isPlacementMode;
  }
}
