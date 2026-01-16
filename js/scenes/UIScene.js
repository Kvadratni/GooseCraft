// UI Scene - HUD Overlay

import { STARTING_RESOURCES, GAME_CONFIG, UI, BUILDING, FACTION_COLORS, FACTIONS } from '../utils/Constants.js';
import Goose from '../entities/Goose.js';
import { createStyledButton } from '../ui/StyledButton.js';
import { worldToGridInt } from '../utils/IsometricUtils.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    console.log('UIScene: Initializing HUD...');

    // Initialize resource values
    this.resources = { ...STARTING_RESOURCES };

    // Selected building
    this.selectedBuilding = null;

    // Debug mode
    this.debugMode = false;

    // Initialize buildButtons array
    this.buildButtons = [];

    // Store screen dimensions (will be updated on resize)
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;

    // Create tooltip
    this.createTooltip();

    // Create HUD elements
    this.createTopBar();
    this.createBuildMenu();
    this.createMinimap();
    this.createBuildingPanel();
    this.createDebugToggle();
    this.createSettingsPanel();

    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);

    // Update minimap after a short delay to ensure GameScene is ready
    this.time.delayedCall(500, () => {
      this.updateMinimap();
    });

    console.log('UIScene: HUD ready');
  }

  /**
   * Handle screen resize
   */
  handleResize(gameSize) {
    this.screenWidth = gameSize.width;
    this.screenHeight = gameSize.height;

    // Reposition UI elements
    this.repositionUI();
  }

  /**
   * Reposition all UI elements after resize
   */
  repositionUI() {
    // Update top bar background width
    if (this.topBarBg) {
      this.topBarBg.width = this.screenWidth;
    }

    // Update build menu position
    if (this.buildMenuBg) {
      const menuX = this.screenWidth - 220;
      this.buildMenuX = menuX;
      this.buildMenuBg.x = menuX;
      // Refresh build menu buttons
      this.updateBuildMenu();
    }

    // Update minimap position
    if (this.minimapBg) {
      const minimapY = this.screenHeight - this.minimapSize - 50;
      this.minimapY = minimapY;
      this.minimapBg.y = minimapY - 30;
      if (this.minimapLabel) this.minimapLabel.y = minimapY - 20;
      if (this.minimapBorder) this.minimapBorder.y = minimapY;
      this.minimapTerrainCached = false; // Force terrain redraw
    }

    // Update debug button position
    if (this.debugButton) {
      this.debugButton.x = this.screenWidth - 240;
      this.debugButton.y = this.screenHeight - 50;
      this.debugButtonText.x = this.screenWidth - 190;
      this.debugButtonText.y = this.screenHeight - 35;
    }

    // Update settings button position
    if (this.settingsButton) {
      this.settingsButton.x = this.screenWidth - 50;
    }
  }

  update(time, delta) {
    // Periodically update minimap (every 2 seconds)
    if (!this.minimapUpdateTimer) {
      this.minimapUpdateTimer = 0;
    }

    this.minimapUpdateTimer += delta;
    if (this.minimapUpdateTimer > 2000) {
      this.updateMinimap();
      this.minimapUpdateTimer = 0;
    }

    // Update minimap viewport every frame for smooth tracking
    this.updateMinimapViewportOnly();
  }

  /**
   * Update only the minimap viewport (called every frame)
   */
  updateMinimapViewportOnly() {
    if (!this.minimapViewportGraphics) return;

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.isometricMap) return;

    const map = gameScene.isometricMap;
    const gridWidth = map.gridWidth;
    const gridHeight = map.gridHeight;

    // Match the scale calculation from updateMinimap (0.9 for better visibility)
    const scale = (this.minimapSize * 0.9) / Math.max(gridWidth, gridHeight);
    const centerX = this.minimapX + this.minimapSize / 2;
    const centerY = this.minimapY + this.minimapSize / 2;

    this.updateMinimapViewport(gameScene, scale, gridWidth, gridHeight, centerX, centerY);
  }

  /**
   * Create top bar with resources and title
   */
  createTopBar() {
    const barHeight = 50;

    // Background - use current screen width
    this.topBarBg = this.add.rectangle(0, 0, this.screenWidth, barHeight, 0x1a1a1a, 0.9);
    this.topBarBg.setOrigin(0, 0);
    this.topBarBg.setDepth(1000);

    // Game title
    this.add.text(20, 15, 'GooseCraft', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setDepth(1001);

    // Resource display
    const resourceX = 200;
    const resourceY = 15;
    const spacing = 110; // Reduced to fit 5 resources

    // Food
    this.foodText = this.add.text(resourceX, resourceY, `🌾 ${this.resources.food}`, {
      fontSize: '16px',
      fill: '#FFD700',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1001);

    // Water
    this.waterText = this.add.text(resourceX + spacing, resourceY, `💧 ${this.resources.water}`, {
      fontSize: '16px',
      fill: '#42A5F5',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1001);

    // Sticks
    this.sticksText = this.add.text(resourceX + spacing * 2, resourceY, `🪵 ${this.resources.sticks}`, {
      fontSize: '16px',
      fill: '#8D6E63',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1001);

    // Stone
    this.stoneText = this.add.text(resourceX + spacing * 3, resourceY, `🪨 ${this.resources.stone || 0}`, {
      fontSize: '16px',
      fill: '#757575',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1001);

    // Tools
    this.toolsText = this.add.text(resourceX + spacing * 4, resourceY, `🔧 ${this.resources.tools}`, {
      fontSize: '16px',
      fill: '#9E9E9E',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1001);
  }

  /**
   * Create build menu on the right side
   */
  createBuildMenu() {
    const menuWidth = 220;
    const menuX = this.screenWidth - menuWidth;
    const menuY = 60;
    const menuHeight = 500;  // Increased for more buildings

    // Store menu position
    this.buildMenuX = menuX;
    this.buildMenuY = menuY;
    this.buildMenuWidth = menuWidth;

    // Background
    this.buildMenuBg = this.add.rectangle(menuX, menuY, menuWidth, menuHeight, 0x2a2a2a, 0.9);
    this.buildMenuBg.setOrigin(0, 0);
    this.buildMenuBg.setDepth(1000);

    // Title
    this.add.text(menuX + 10, menuY + 10, 'Build Menu', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setDepth(1001);

    // Store build buttons for updating
    this.buildButtons = [];

    // Initial update
    this.updateBuildMenu();
  }

  /**
   * Update build menu with unlocked buildings
   */
  updateBuildMenu() {
    // Check if build menu has been created yet
    if (!this.buildButtons) {
      return;  // Menu not initialized yet
    }

    // Clear old buttons
    this.buildButtons.forEach(button => {
      if (button.bg) button.bg.destroy();
      if (button.icon) button.icon.destroy();
      if (button.label) button.label.destroy();
      if (button.cost) button.cost.destroy();
      if (button.locked) button.locked.destroy();
    });
    this.buildButtons = [];

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.buildingUnlockManager) {
      return;
    }

    const unlockManager = gameScene.buildingUnlockManager;
    let yOffset = 50;

    // Build button icons for each building type
    const buildingIcons = {
      'COOP': '🏠',
      'RESOURCE_STORAGE': '🏪',
      'FACTORY': '🏭',
      'RESEARCH_CENTER': '🔬',
      'BARRACKS': '🏰',
      'WATCHTOWER': '🗼',
      'POWER_STATION': '⚡',
      'MINE': '⛏️',
      'AIRSTRIP': '✈️'
    };

    // Go through all buildings
    for (const buildingKey in BUILDING) {
      const building = BUILDING[buildingKey];

      // Skip non-buildable buildings
      if (!building.buildable) {
        continue;
      }

      const isUnlocked = unlockManager.isBuildingUnlocked(buildingKey);
      const btnY = this.buildMenuY + yOffset;

      // Create button (even if locked, show it grayed out)
      const button = this.createBuildButton(
        this.buildMenuX + 10,
        btnY,
        building.displayName,
        building.cost,
        buildingIcons[buildingKey] || '🏗️',
        buildingKey,
        isUnlocked,
        unlockManager.getUnlockMessage(buildingKey)
      );

      this.buildButtons.push(button);
      yOffset += 60;  // Increased spacing
    }
  }

  /**
   * Create a build button
   */
  createBuildButton(x, y, label, cost, icon, buildingType, isUnlocked = true, unlockMessage = null) {
    const btnWidth = 200;
    const btnHeight = 55;

    const button = {};

    // Create styled button using utility
    const buttonContainer = createStyledButton(
      this,
      x + btnWidth / 2,
      y + btnHeight / 2,
      '', // No text, we'll add custom content
      isUnlocked ? () => {
        console.log(`Build: ${label}`);
        this.hideTooltip();
        // Trigger building placement in GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.buildingManager) {
          gameScene.buildingManager.startPlacement(buildingType);
        }
      } : null,
      {
        width: btnWidth,
        height: btnHeight,
        cornerRadius: 12,
        fontSize: '14px',
        disabled: !isUnlocked
      }
    );
    buttonContainer.setDepth(1001);

    // Remove default button text (we'll add custom layout)
    if (buttonContainer.buttonText) {
      buttonContainer.buttonText.destroy();
    }

    button.bg = buttonContainer;

    // Icon
    button.icon = this.add.text(x + 5, y + btnHeight / 2 - 10, icon, {
      fontSize: '20px'
    }).setDepth(1002);

    // Label
    button.label = this.add.text(x + 35, y + 8, label, {
      fontSize: '14px',
      fill: isUnlocked ? '#ffffff' : '#999999',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(1002);

    // Cost display
    const costText = this.formatCost(cost);
    button.cost = this.add.text(x + 35, y + 28, costText, {
      fontSize: '11px',
      fill: isUnlocked ? '#ffffff' : '#999999',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(1002);

    // Unlock message for locked buildings
    if (!isUnlocked && unlockMessage) {
      button.locked = this.add.text(x + 35, y + 43, unlockMessage, {
        fontSize: '9px',
        fill: '#ff9999',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2
      }).setDepth(1002);
    }

    // Add tooltip on hover (only for unlocked)
    if (isUnlocked) {
      buttonContainer.on('pointerover', () => {
        // Show tooltip with full building description
        const building = BUILDING[buildingType];
        if (building && building.description) {
          const tooltipText = `${building.displayName}\n\n${building.description}\n\nCost: ${this.formatCost(building.cost)}`;
          this.showTooltip(x + 210, y, tooltipText);
        }
      });
      buttonContainer.on('pointerout', () => {
        this.hideTooltip();
      });
    }

    return button;
  }

  /**
   * Format cost object into display string
   */
  formatCost(cost) {
    const parts = [];

    if (cost.food > 0) parts.push(`${cost.food} 🌾`);
    if (cost.water > 0) parts.push(`${cost.water} 💧`);
    if (cost.sticks > 0) parts.push(`${cost.sticks} 🪵`);
    if (cost.stone > 0) parts.push(`${cost.stone} 🪨`);
    if (cost.tools > 0) parts.push(`${cost.tools} 🔧`);

    if (parts.length === 0) return 'Free';

    return parts.join(' ');
  }

  /**
   * Create tooltip for showing building descriptions
   */
  createTooltip() {
    // Tooltip background
    this.tooltipBg = this.add.rectangle(0, 0, 400, 100, 0x000000, 0.95);
    this.tooltipBg.setOrigin(0, 0);
    this.tooltipBg.setDepth(2000);
    this.tooltipBg.setVisible(false);

    // Tooltip border
    this.tooltipBorder = this.add.rectangle(0, 0, 400, 100, 0xFFFFFF, 0);
    this.tooltipBorder.setOrigin(0, 0);
    this.tooltipBorder.setStrokeStyle(2, 0xFFD700, 1);
    this.tooltipBorder.setDepth(2000);
    this.tooltipBorder.setVisible(false);

    // Tooltip text
    this.tooltipText = this.add.text(0, 0, '', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      wordWrap: { width: 380 },
      lineSpacing: 4
    });
    this.tooltipText.setOrigin(0, 0);
    this.tooltipText.setDepth(2001);
    this.tooltipText.setVisible(false);
  }

  /**
   * Show tooltip with text
   */
  showTooltip(x, y, text) {
    if (!text) return;

    // Update text
    this.tooltipText.setText(text);

    // Calculate size based on text
    const textBounds = this.tooltipText.getBounds();
    const padding = 10;
    const width = Math.min(400, textBounds.width + padding * 2);
    const height = textBounds.height + padding * 2;

    // Position tooltip (keep it on screen)
    let tooltipX = x;
    let tooltipY = y;

    // Don't go off right edge
    if (tooltipX + width > this.screenWidth) {
      tooltipX = this.screenWidth - width - 10;
    }

    // Don't go off bottom edge
    if (tooltipY + height > this.screenHeight) {
      tooltipY = y - height - 10;
    }

    // Update positions and sizes
    this.tooltipBg.setPosition(tooltipX, tooltipY);
    this.tooltipBg.setSize(width, height);
    this.tooltipBorder.setPosition(tooltipX, tooltipY);
    this.tooltipBorder.setSize(width, height);
    this.tooltipText.setPosition(tooltipX + padding, tooltipY + padding);

    // Show tooltip
    this.tooltipBg.setVisible(true);
    this.tooltipBorder.setVisible(true);
    this.tooltipText.setVisible(true);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltipBg.setVisible(false);
    this.tooltipBorder.setVisible(false);
    this.tooltipText.setVisible(false);
  }

  /**
   * Create minimap
   */
  createMinimap() {
    const minimapSize = 150;
    // Position at bottom-left
    const minimapX = 20;
    const minimapY = this.screenHeight - minimapSize - 50;

    // Background with styled border matching menu style
    this.minimapBg = this.add.rectangle(minimapX - 10, minimapY - 30, minimapSize + 20, minimapSize + 40, 0x1a1a1a, 0.9);
    this.minimapBg.setOrigin(0, 0);
    this.minimapBg.setDepth(1000);
    this.minimapBg.setStrokeStyle(2, 0x4CAF50);

    // Label
    this.minimapLabel = this.add.text(minimapX, minimapY - 20, 'Minimap', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setDepth(1001);

    // Border - make it interactive for click-to-move
    this.minimapBorder = this.add.rectangle(minimapX, minimapY, minimapSize, minimapSize);
    this.minimapBorder.setOrigin(0, 0);
    this.minimapBorder.setStrokeStyle(2, 0x4CAF50);
    this.minimapBorder.setFillStyle(0x1a3a1a, 0.5);
    this.minimapBorder.setDepth(1001);
    this.minimapBorder.setInteractive({ useHandCursor: true });

    // Store minimap properties
    this.minimapX = minimapX;
    this.minimapY = minimapY;
    this.minimapSize = minimapSize;

    // Handle minimap clicks to move camera
    this.minimapBorder.on('pointerdown', (pointer) => {
      this.handleMinimapClick(pointer.x, pointer.y);
    });

    // Also handle drag on minimap
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && this.isPointerOverMinimap(pointer.x, pointer.y)) {
        this.handleMinimapClick(pointer.x, pointer.y);
      }
    });

    // Create graphics object for static terrain rendering (cached)
    this.minimapTerrainGraphics = this.add.graphics();
    this.minimapTerrainGraphics.setDepth(1002);

    // Create graphics object for dynamic elements (units, buildings)
    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setDepth(1003);

    // Create graphics object for viewport indicator
    this.minimapViewportGraphics = this.add.graphics();
    this.minimapViewportGraphics.setDepth(1004);

    // Flag to track if terrain has been rendered
    this.minimapTerrainCached = false;

    // Track last known positions of enemy buildings (for fog of war)
    this.lastKnownEnemyBuildings = new Map(); // Map<buildingId, {gridX, gridY, type}>

    // Initial render
    this.updateMinimap();
  }

  /**
   * Update minimap to show current game state
   * Renders as a rotated diamond to match isometric view
   */
  updateMinimap() {
    if (!this.minimapGraphics) return;

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.isometricMap) return;

    const map = gameScene.isometricMap;
    const gridWidth = map.gridWidth;
    const gridHeight = map.gridHeight;

    // Minimap center
    const centerX = this.minimapX + this.minimapSize / 2;
    const centerY = this.minimapY + this.minimapSize / 2;

    // Scale to fit rotated diamond in minimap area (increased from 0.7 to 0.9 for better visibility)
    const scale = (this.minimapSize * 0.9) / Math.max(gridWidth, gridHeight);

    // Helper to check if a minimap position is within bounds
    const isWithinMinimapBounds = (isoX, isoY) => {
      return isoX >= this.minimapX && isoX <= this.minimapX + this.minimapSize &&
             isoY >= this.minimapY && isoY <= this.minimapY + this.minimapSize;
    };

    // Helper to convert grid coords to minimap position
    const gridToMinimap = (gx, gy) => {
      const isoX = (gx - gy) * scale * 0.5 + centerX;
      const isoY = (gx + gy) * scale * 0.25 + centerY - gridHeight * scale * 0.25;
      return { x: isoX, y: isoY };
    };

    // Render static terrain only once (cached)
    if (!this.minimapTerrainCached) {
      this.minimapTerrainGraphics.clear();

      // Render each tile as a rotated diamond pixel
      for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
          const tile = map.getTile(x, y);
          if (!tile) continue;

          // Map terrain types to colors
          let color;
          switch (tile.terrainType) {
            case 'water':
              color = 0x42A5F5;  // Blue
              break;
            case 'grass':
              color = 0x66BB6A;  // Green
              break;
            case 'dirt':
              color = 0x8D6E63;  // Brown
              break;
            case 'sand':
              color = 0xFFD54F;  // Yellow
              break;
            case 'rock':
              color = 0x757575;  // Gray
              break;
            case 'snow':
              color = 0xFFFFFF;  // White
              break;
            case 'ice':
              color = 0xB3E5FC;  // Light blue
              break;
            default:
              color = 0x66BB6A;  // Default green
          }

          // Convert grid to isometric minimap position
          const pos = gridToMinimap(x, y);

          // Only draw if within minimap bounds
          if (isWithinMinimapBounds(pos.x, pos.y)) {
            this.minimapTerrainGraphics.fillStyle(color, 1);
            this.minimapTerrainGraphics.fillRect(pos.x - scale * 0.3, pos.y - scale * 0.15, scale * 0.6, scale * 0.3);
          }
        }
      }

      this.minimapTerrainCached = true;
    }

    // Update dynamic elements (units, buildings) on separate layer
    this.minimapGraphics.clear();

    // Get fog of war system if available
    const fogOfWar = gameScene.fogOfWar;

    // Draw player buildings (always visible)
    if (gameScene.buildings) {
      gameScene.buildings.forEach(building => {
        // Use proper isometric world-to-grid conversion
        const gridPos = worldToGridInt(building.x, building.y);

        // For enemy buildings, track last known position and only show if explored
        if (building.faction === FACTIONS.ENEMY_AI) {
          // Check if position is currently visible or was explored
          const isVisible = fogOfWar ? fogOfWar.isVisible(gridPos.x, gridPos.y) : true;
          const isExplored = fogOfWar ? fogOfWar.isExplored(gridPos.x, gridPos.y) : true;

          if (isVisible) {
            // Update last known position
            this.lastKnownEnemyBuildings.set(building.id || `building_${building.x}_${building.y}`, {
              gridX: gridPos.x,
              gridY: gridPos.y,
              type: building.buildingType
            });
          }

          // Only draw if explored (use last known or current position)
          if (!isExplored) return;

          // Use slightly faded color if not currently visible
          const alpha = isVisible ? 1 : 0.6;
          this.minimapGraphics.fillStyle(FACTION_COLORS.ENEMY_AI, alpha);
        } else {
          // Player buildings - always fully visible
          this.minimapGraphics.fillStyle(FACTION_COLORS.PLAYER, 1);
        }

        // Convert to isometric minimap position
        const pos = gridToMinimap(gridPos.x, gridPos.y);

        // Only draw if within minimap bounds
        if (isWithinMinimapBounds(pos.x, pos.y)) {
          this.minimapGraphics.fillRect(pos.x - 2, pos.y - 1, 4, 3);
        }
      });
    }

    // Draw units (with faction colors)
    if (gameScene.units && gameScene.units.length < 100) {
      gameScene.units.forEach(unit => {
        // Use proper isometric world-to-grid conversion
        const gridPos = worldToGridInt(unit.x, unit.y);

        // For enemy units, only show if currently visible
        if (unit.faction === FACTIONS.ENEMY_AI) {
          const isVisible = fogOfWar ? fogOfWar.isVisible(gridPos.x, gridPos.y) : true;
          if (!isVisible) return; // Don't show enemy units in fog
        }

        const factionColor = FACTION_COLORS[unit.faction] || FACTION_COLORS.PLAYER;
        this.minimapGraphics.fillStyle(factionColor, 1);

        // Convert to isometric minimap position
        const pos = gridToMinimap(gridPos.x, gridPos.y);

        // Only draw if within minimap bounds
        if (isWithinMinimapBounds(pos.x, pos.y)) {
          this.minimapGraphics.fillRect(pos.x - 1, pos.y - 1, 2, 2);
        }
      });
    }

    // Draw camera viewport indicator
    this.updateMinimapViewport(gameScene, scale, gridWidth, gridHeight, centerX, centerY);
  }

  /**
   * Update the camera viewport indicator on the minimap
   * Draws a trapezoid shape to represent the isometric camera view
   */
  updateMinimapViewport(gameScene, scale, gridWidth, gridHeight, centerX, centerY) {
    if (!this.minimapViewportGraphics) return;
    this.minimapViewportGraphics.clear();

    const camera = gameScene.cameras.main;
    if (!camera) return;

    // Get camera bounds in world coordinates
    const camLeft = camera.scrollX;
    const camTop = camera.scrollY;
    const camWidth = camera.width / camera.zoom;
    const camHeight = camera.height / camera.zoom;

    // Convert camera corners from world to grid coordinates
    const tileWidthHalf = 32;
    const tileHeightHalf = 16;

    // World to grid conversion for isometric
    const worldToGrid = (wx, wy) => {
      const gx = (wx / tileWidthHalf + wy / tileHeightHalf) / 2;
      const gy = (wy / tileHeightHalf - wx / tileWidthHalf) / 2;
      return { x: gx, y: gy };
    };

    // Grid to minimap isometric position
    const gridToMinimap = (gx, gy) => {
      const isoX = (gx - gy) * scale * 0.5 + centerX;
      const isoY = (gx + gy) * scale * 0.25 + centerY - gridHeight * scale * 0.25;
      return { x: isoX, y: isoY };
    };

    // Get the 4 corners of the camera view in grid coords, then minimap coords
    const topLeftGrid = worldToGrid(camLeft, camTop);
    const topRightGrid = worldToGrid(camLeft + camWidth, camTop);
    const bottomLeftGrid = worldToGrid(camLeft, camTop + camHeight);
    const bottomRightGrid = worldToGrid(camLeft + camWidth, camTop + camHeight);

    const topLeft = gridToMinimap(topLeftGrid.x, topLeftGrid.y);
    const topRight = gridToMinimap(topRightGrid.x, topRightGrid.y);
    const bottomLeft = gridToMinimap(bottomLeftGrid.x, bottomLeftGrid.y);
    const bottomRight = gridToMinimap(bottomRightGrid.x, bottomRightGrid.y);

    // Draw trapezoid/quadrilateral viewport
    this.minimapViewportGraphics.lineStyle(2, 0xFFFFFF, 0.9);
    this.minimapViewportGraphics.beginPath();
    this.minimapViewportGraphics.moveTo(topLeft.x, topLeft.y);
    this.minimapViewportGraphics.lineTo(topRight.x, topRight.y);
    this.minimapViewportGraphics.lineTo(bottomRight.x, bottomRight.y);
    this.minimapViewportGraphics.lineTo(bottomLeft.x, bottomLeft.y);
    this.minimapViewportGraphics.closePath();
    this.minimapViewportGraphics.strokePath();
  }

  /**
   * Check if pointer is over the minimap area
   */
  isPointerOverMinimap(x, y) {
    return x >= this.minimapX &&
           x <= this.minimapX + this.minimapSize &&
           y >= this.minimapY &&
           y <= this.minimapY + this.minimapSize;
  }

  /**
   * Handle click on minimap to move camera
   */
  handleMinimapClick(clickX, clickY) {
    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.isometricMap) return;

    const map = gameScene.isometricMap;
    const gridWidth = map.gridWidth;
    const gridHeight = map.gridHeight;

    // Match the scale and center calculation from updateMinimap (0.9 for better visibility)
    const scale = (this.minimapSize * 0.9) / Math.max(gridWidth, gridHeight);
    const centerX = this.minimapX + this.minimapSize / 2;
    const centerY = this.minimapY + this.minimapSize / 2;

    // Convert click position to relative position from minimap center
    const relX = clickX - centerX;
    const relY = clickY - centerY + gridHeight * scale * 0.25;

    // Reverse the isometric transformation to get grid coordinates
    // isoX = (gx - gy) * scale * 0.5
    // isoY = (gx + gy) * scale * 0.25
    // Solving for gx and gy:
    // gx = isoX / (scale * 0.5) + isoY / (scale * 0.25)) / 2
    // gy = isoY / (scale * 0.25) - isoX / (scale * 0.5)) / 2
    const gridX = (relX / (scale * 0.5) + relY / (scale * 0.25)) / 2;
    const gridY = (relY / (scale * 0.25) - relX / (scale * 0.5)) / 2;

    // Convert grid coordinates to world coordinates
    const tileWidthHalf = 32;
    const tileHeightHalf = 16;
    const worldX = (gridX - gridY) * tileWidthHalf;
    const worldY = (gridX + gridY) * tileHeightHalf;

    // Move camera to center on this position
    const camera = gameScene.cameras.main;
    if (camera) {
      camera.centerOn(worldX, worldY);
    }
  }

  /**
   * Invalidate minimap terrain cache (call when terrain changes)
   */
  invalidateMinimapCache() {
    this.minimapTerrainCached = false;
  }

  /**
   * Create building panel (initially hidden)
   * Dynamic panel that adjusts to show upgrades for any building
   */
  createBuildingPanel() {
    // Store panel dimensions for dynamic updates
    this.panelWidth = 280;
    this.panelBaseHeight = 120; // Base height without buttons
    this.panelX = (this.screenWidth - 220 - this.panelWidth) / 2;
    this.panelY = this.screenHeight - 400; // Will be adjusted based on content

    // Container for all building panel elements
    this.buildingPanelContainer = this.add.container(0, 0);
    this.buildingPanelContainer.setDepth(2000);
    this.buildingPanelContainer.setVisible(false);

    // Background (will be resized dynamically)
    this.panelBg = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelBaseHeight, 0x2a2a2a, 0.95);
    this.panelBg.setOrigin(0, 0);
    this.buildingPanelContainer.add(this.panelBg);

    // Border (will be resized dynamically)
    this.panelBorder = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelBaseHeight);
    this.panelBorder.setOrigin(0, 0);
    this.panelBorder.setStrokeStyle(3, 0x4CAF50);
    this.buildingPanelContainer.add(this.panelBorder);

    // Title
    this.buildingNameText = this.add.text(this.panelX + 10, this.panelY + 10, 'Building', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.buildingPanelContainer.add(this.buildingNameText);

    // Status text
    this.buildingStatusText = this.add.text(this.panelX + 10, this.panelY + 40, 'Status: Operational', {
      fontSize: '14px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    this.buildingPanelContainer.add(this.buildingStatusText);

    // Info text (for building-specific info like production rates)
    this.buildingInfoText = this.add.text(this.panelX + 10, this.panelY + 60, '', {
      fontSize: '12px',
      fill: '#FFD700',
      fontFamily: 'Arial',
      wordWrap: { width: this.panelWidth - 20 }
    });
    this.buildingPanelContainer.add(this.buildingInfoText);

    // Section label (Production/Upgrades/Research)
    this.sectionLabel = this.add.text(this.panelX + 10, this.panelY + 85, '', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.buildingPanelContainer.add(this.sectionLabel);

    // Close button
    this.closeBtn = this.add.text(this.panelX + this.panelWidth - 30, this.panelY + 5, '✕', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.hideBuildingPanel());
    this.closeBtn.on('pointerover', () => this.closeBtn.setColor('#ff0000'));
    this.closeBtn.on('pointerout', () => this.closeBtn.setColor('#ffffff'));
    this.buildingPanelContainer.add(this.closeBtn);

    // Dynamic buttons array (will be populated when showing panel)
    this.dynamicButtons = [];
  }

  /**
   * Create a dynamic button for the building panel
   */
  createDynamicButton(x, y, label, costText, icon, onClick, disabled = false) {
    const btnWidth = 260;
    const btnHeight = 42;

    // Create styled button
    const bg = createStyledButton(
      this,
      x + btnWidth / 2,
      y + btnHeight / 2,
      '',
      disabled ? null : onClick,
      {
        width: btnWidth,
        height: btnHeight,
        cornerRadius: 8,
        fontSize: '14px',
        disabled: disabled
      }
    );

    // Remove default button text
    if (bg.buttonText) {
      bg.buttonText.destroy();
    }

    const iconText = this.add.text(x + 5, y + btnHeight / 2 - 10, icon, {
      fontSize: '18px'
    });

    const labelText = this.add.text(x + 30, y + 6, label, {
      fontSize: '13px',
      fill: disabled ? '#888888' : '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    const cost = this.add.text(x + 30, y + 24, costText, {
      fontSize: '10px',
      fill: disabled ? '#666666' : '#cccccc',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Add all elements to container
    this.buildingPanelContainer.add(bg);
    this.buildingPanelContainer.add(iconText);
    this.buildingPanelContainer.add(labelText);
    this.buildingPanelContainer.add(cost);

    return { bg, icon: iconText, label: labelText, cost };
  }

  /**
   * Clear all dynamic buttons from the panel
   */
  clearDynamicButtons() {
    this.dynamicButtons.forEach(btn => {
      if (btn.bg) btn.bg.destroy();
      if (btn.icon) btn.icon.destroy();
      if (btn.label) btn.label.destroy();
      if (btn.cost) btn.cost.destroy();
    });
    this.dynamicButtons = [];
  }

  /**
   * Resize the panel to fit content
   */
  resizePanel(numButtons, hasInfo = false) {
    const buttonHeight = 48;
    const infoHeight = hasInfo ? 25 : 0;
    const headerHeight = 110;
    const totalHeight = headerHeight + infoHeight + (numButtons * buttonHeight) + 20;

    // Update panel position to stay on screen
    this.panelY = this.screenHeight - totalHeight - 50;

    // Update background and border
    this.panelBg.setPosition(this.panelX, this.panelY);
    this.panelBg.setSize(this.panelWidth, totalHeight);
    this.panelBorder.setPosition(this.panelX, this.panelY);
    this.panelBorder.setSize(this.panelWidth, totalHeight);

    // Update text positions
    this.buildingNameText.setPosition(this.panelX + 10, this.panelY + 10);
    this.buildingStatusText.setPosition(this.panelX + 10, this.panelY + 40);
    this.buildingInfoText.setPosition(this.panelX + 10, this.panelY + 60);
    this.sectionLabel.setPosition(this.panelX + 10, this.panelY + 60 + infoHeight + 15);
    this.closeBtn.setPosition(this.panelX + this.panelWidth - 30, this.panelY + 5);

    return this.panelY + 60 + infoHeight + 40; // Return Y position for first button
  }

  /**
   * Format upgrade cost for display
   */
  formatUpgradeCost(cost) {
    const parts = [];
    if (cost.food > 0) parts.push(`${cost.food}🌾`);
    if (cost.water > 0) parts.push(`${cost.water}💧`);
    if (cost.sticks > 0) parts.push(`${cost.sticks}🪵`);
    if (cost.stone > 0) parts.push(`${cost.stone}🪨`);
    if (cost.tools > 0) parts.push(`${cost.tools}🔧`);
    return parts.join(' ');
  }

  /**
   * Show building panel with dynamic content based on building type
   */
  showBuildingPanel(building) {
    this.selectedBuilding = building;
    this.clearDynamicButtons();

    this.buildingNameText.setText(building.buildingName);

    // Handle construction state
    if (building.state === 'CONSTRUCTION') {
      this.buildingStatusText.setText(`Building ${Math.floor(building.constructionProgress)}%`);
      this.buildingStatusText.setColor('#FFD700');
      this.buildingInfoText.setText('');
      this.sectionLabel.setText('');
      this.resizePanel(0);
      this.buildingPanelContainer.setVisible(true);
      return;
    }

    this.buildingStatusText.setText('Status: Operational');
    this.buildingStatusText.setColor('#4CAF50');

    // Build panel content based on building type
    switch (building.buildingType) {
      case 'COOP':
        this.showCoopPanel(building);
        break;
      case 'BARRACKS':
        this.showBarracksPanel(building);
        break;
      case 'FACTORY':
        this.showFactoryPanel(building);
        break;
      case 'RESEARCH_CENTER':
        this.showResearchCenterPanel(building);
        break;
      case 'WATCHTOWER':
        this.showWatchtowerPanel(building);
        break;
      case 'MINE':
        this.showMinePanel(building);
        break;
      case 'POWER_STATION':
        this.showPowerStationPanel(building);
        break;
      case 'RESOURCE_STORAGE':
        this.showResourceStoragePanel(building);
        break;
      default:
        // Generic building with no special features
        this.buildingInfoText.setText('');
        this.sectionLabel.setText('');
        this.resizePanel(0);
    }

    this.buildingPanelContainer.setVisible(true);
  }

  /**
   * Show Coop panel (worker production + upgrades)
   */
  showCoopPanel(building) {
    const queueStatus = building.productionQueue?.getQueueStatus();
    let infoText = '';
    if (queueStatus?.isProducing) {
      infoText = `Training: ${queueStatus.currentUnit} ${Math.floor(queueStatus.progress)}%`;
    } else if (queueStatus?.queueLength > 0) {
      infoText = `Queue: ${queueStatus.queueLength}`;
    }
    this.buildingInfoText.setText(infoText);

    // Count buttons needed
    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);
    const numButtons = 1 + availableUpgrades.length; // 1 for train worker

    this.sectionLabel.setText('Production & Upgrades:');
    let buttonY = this.resizePanel(numButtons, infoText !== '');

    // Train Worker button
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      'Train Worker', '50🌾',
      '👷', () => this.trainUnit('worker')
    ));
    buttonY += 48;

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Barracks panel (combat unit production + upgrades)
   */
  showBarracksPanel(building) {
    const queueStatus = building.productionQueue?.getQueueStatus();
    let infoText = '';
    if (queueStatus?.isProducing) {
      infoText = `Training: ${queueStatus.currentUnit} ${Math.floor(queueStatus.progress)}%`;
    } else if (queueStatus?.queueLength > 0) {
      infoText = `Queue: ${queueStatus.queueLength}`;
    }
    this.buildingInfoText.setText(infoText);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);
    const canProduce = building.canProduce || [];
    const numButtons = canProduce.length + availableUpgrades.length;

    this.sectionLabel.setText('Train Units & Upgrades:');
    let buttonY = this.resizePanel(numButtons, infoText !== '');

    // Unit production buttons
    if (canProduce.includes('guard')) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Guard', '75🌾 25💧 50🪵 2🔧',
        '🛡️', () => this.trainUnit('guard')
      ));
      buttonY += 48;
    }
    if (canProduce.includes('scout')) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Scout', '40🌾 30💧 20🪵 1🔧',
        '🏹', () => this.trainUnit('scout')
      ));
      buttonY += 48;
    }
    if (canProduce.includes('spy')) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Spy', '60🌾 40💧 30🪵 3🔧',
        '🕵️', () => this.trainUnit('spy')
      ));
      buttonY += 48;
    }

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Factory panel (tool production + upgrades)
   */
  showFactoryPanel(building) {
    const status = building.getProductionStatus?.() || {};
    let infoText = '';
    if (status.isProducing) {
      infoText = `Producing: ${Math.floor(status.progress)}% | Queue: ${status.queue}`;
    } else if (status.queue > 0) {
      infoText = `Queue: ${status.queue}`;
    } else if (status.autoProduction) {
      infoText = 'Auto-production enabled';
    }
    this.buildingInfoText.setText(infoText);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);
    const hasBatch = upgrades.BATCH_PRODUCTION?.purchased;
    const numButtons = 1 + (hasBatch ? 1 : 0) + availableUpgrades.length;

    this.sectionLabel.setText('Tool Production & Upgrades:');
    let buttonY = this.resizePanel(numButtons, infoText !== '');

    // Make Tool button
    const cost = building.sticksPerTool || 5;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      'Make Tool', `${cost}🪵 → 1🔧`,
      '🔧', () => this.makeTools()
    ));
    buttonY += 48;

    // Batch Production button (if unlocked)
    if (hasBatch) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Make Batch (5)', '20🪵 → 5🔧',
        '🔧🔧', () => this.makeBatchTools()
      ));
      buttonY += 48;
    }

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Research Center panel (research upgrades)
   */
  showResearchCenterPanel(building) {
    const status = building.getResearchStatus?.() || {};
    let infoText = '';
    if (status.isResearching) {
      infoText = `Researching: ${status.upgradeName} ${Math.floor(status.progress)}%`;
    } else {
      const completed = Object.values(status.upgrades || {}).filter(u => u.researched).length;
      const total = Object.keys(status.upgrades || {}).length;
      infoText = `Completed: ${completed}/${total}`;
    }
    this.buildingInfoText.setText(infoText);

    const upgrades = status.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.researched);
    const numButtons = availableUpgrades.length;

    this.sectionLabel.setText('Research Available:');
    let buttonY = this.resizePanel(Math.min(numButtons, 6), true); // Max 6 visible

    // Research buttons (limited to prevent overflow)
    let count = 0;
    for (const [key, upgrade] of availableUpgrades) {
      if (count >= 6) break; // Limit visible buttons
      const isResearching = status.isResearching && status.currentResearch === key;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, isResearching ? `${Math.floor(status.progress)}%...` : this.formatUpgradeCost(upgrade.cost),
        '🔬', () => this.startResearch(key),
        isResearching
      ));
      buttonY += 48;
      count++;
    }
  }

  /**
   * Show Watchtower panel (defense info + upgrades)
   */
  showWatchtowerPanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    this.buildingInfoText.setText(`Range: ${status.attackRange || 200}px | Vision: ${status.visionRange || 12} tiles`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Upgrades:');
    let buttonY = this.resizePanel(availableUpgrades.length, true);

    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Mine panel (stone production info + upgrades)
   */
  showMinePanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    const statusText = building.getStatusText?.() || '';
    this.buildingInfoText.setText(statusText || `Mining ${status.gatherAmount || 0} stone every ${(status.gatherInterval || 5000) / 1000}s`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Upgrades:');
    let buttonY = this.resizePanel(availableUpgrades.length, true);

    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Power Station panel (tool generation + upgrades)
   */
  showPowerStationPanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    this.buildingInfoText.setText(`Generating ${status.toolsPerCycle || 1} tool every ${(status.generateInterval || 10000) / 1000}s`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Upgrades:');
    let buttonY = this.resizePanel(availableUpgrades.length, true);

    for (const [key, upgrade] of availableUpgrades) {
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key)
      ));
      buttonY += 48;
    }
  }

  /**
   * Show Resource Storage panel (storage info)
   */
  showResourceStoragePanel(building) {
    const status = building.getStorageStatus?.() || {};
    const bonusText = status.storageBonus > 0 ? ` (+${status.storageBonus} bonus)` : '';
    this.buildingInfoText.setText(`Storage: +${status.baseBonus || 100} capacity${bonusText}`);

    this.sectionLabel.setText('');
    this.resizePanel(0, true);
  }

  /**
   * Purchase an upgrade for the selected building
   */
  purchaseUpgrade(upgradeKey) {
    if (!this.selectedBuilding) return;

    const success = this.selectedBuilding.purchaseUpgrade?.(upgradeKey);
    if (success) {
      console.log(`UIScene: Purchased upgrade ${upgradeKey}`);
      // Refresh the panel to show updated state
      this.showBuildingPanel(this.selectedBuilding);
    }
  }

  /**
   * Make batch tools at Factory
   */
  makeBatchTools() {
    if (!this.selectedBuilding || this.selectedBuilding.buildingType !== 'FACTORY') return;

    const success = this.selectedBuilding.queueBatchProduction?.();
    if (success) {
      console.log('UIScene: Batch tool production queued');
    }
  }

  /**
   * Hide building panel
   */
  hideBuildingPanel() {
    this.selectedBuilding = null;
    this.clearDynamicButtons();
    this.buildingPanelContainer.setVisible(false);
  }

  /**
   * Train a unit (adds to production queue)
   */
  trainUnit(unitType) {
    console.log(`UIScene: Training ${unitType}`);

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !this.selectedBuilding) {
      return;
    }

    // Check if building has production queue
    if (!this.selectedBuilding.productionQueue) {
      console.warn('UIScene: Building does not have production capability');
      return;
    }

    // Add to production queue (queue will check resources and deduct cost)
    const success = this.selectedBuilding.productionQueue.addToQueue(
      unitType,
      gameScene.resourceManager
    );

    if (success) {
      console.log(`UIScene: Added ${unitType} to production queue`);
    } else {
      console.log(`UIScene: Failed to add ${unitType} to queue (insufficient resources or queue full)`);
    }
  }

  /**
   * Queue tool production at Factory
   */
  makeTools() {
    console.log('UIScene: Make Tools clicked');

    if (!this.selectedBuilding || this.selectedBuilding.buildingType !== 'FACTORY') {
      return;
    }

    const success = this.selectedBuilding.queueToolProduction();
    if (success) {
      console.log('UIScene: Tool production queued');
    }
  }

  /**
   * Start research at Research Center
   */
  startResearch(upgradeKey) {
    console.log(`UIScene: Starting research ${upgradeKey}`);

    if (!this.selectedBuilding || this.selectedBuilding.buildingType !== 'RESEARCH_CENTER') {
      return;
    }

    const success = this.selectedBuilding.startResearch(upgradeKey);
    if (success) {
      console.log(`UIScene: Research ${upgradeKey} started`);
    }
  }

  /**
   * Update resource display
   */
  updateResources(food, water, sticks, stone = 0, tools = 0) {
    this.resources.food = food;
    this.resources.water = water;
    this.resources.sticks = sticks;
    this.resources.stone = stone;
    this.resources.tools = tools;

    this.foodText.setText(`🌾 ${food}`);
    this.waterText.setText(`💧 ${water}`);
    this.sticksText.setText(`🪵 ${sticks}`);
    this.stoneText.setText(`🪨 ${stone}`);
    this.toolsText.setText(`🔧 ${tools}`);
  }

  /**
   * Update unit selection info
   * Note: Bottom panel was removed - selection info is shown via unit highlighting
   */
  updateUnitInfo(selectedUnits) {
    // Selection info is now shown via unit selection circles and status text
    // No dedicated panel needed
  }

  /**
   * Get current resources
   */
  getResources() {
    return { ...this.resources };
  }

  /**
   * Create debug toggle button
   */
  createDebugToggle() {
    const btnWidth = 100;
    const btnHeight = 30;
    const btnX = this.screenWidth - 240;
    const btnY = this.screenHeight - 50;

    // Button background with styled appearance
    this.debugButton = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0xFF5722, 1);
    this.debugButton.setOrigin(0, 0);
    this.debugButton.setDepth(1001);
    this.debugButton.setInteractive({ useHandCursor: true });
    this.debugButton.setStrokeStyle(2, 0xBF360C);

    // Button text
    this.debugButtonText = this.add.text(btnX + btnWidth / 2, btnY + btnHeight / 2, 'Debug: OFF', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.debugButtonText.setOrigin(0.5);
    this.debugButtonText.setDepth(1002);

    // Hover effects
    this.debugButton.on('pointerover', () => this.debugButton.setFillStyle(0xFF7043));
    this.debugButton.on('pointerout', () => {
      this.debugButton.setFillStyle(this.debugMode ? 0x4CAF50 : 0xFF5722);
    });
    this.debugButton.on('pointerdown', () => {
      this.debugMode = !this.debugMode;
      this.debugButton.setFillStyle(this.debugMode ? 0x4CAF50 : 0xFF5722);
      this.debugButtonText.setText(this.debugMode ? 'Debug: ON' : 'Debug: OFF');

      // Toggle debug in GameScene
      const gameScene = this.scene.get('GameScene');
      if (gameScene) {
        gameScene.setDebugMode(this.debugMode);
      }
    });
  }

  /**
   * Create settings panel for volume controls
   */
  createSettingsPanel() {
    // Settings button (gear icon in top-right corner)
    this.settingsButton = this.add.text(this.screenWidth - 50, 10, '⚙️', {
      fontSize: '32px',
      padding: { x: 10, y: 10 }
    });
    this.settingsButton.setInteractive({ useHandCursor: true });
    this.settingsButton.setScrollFactor(0);
    this.settingsButton.setDepth(1000);

    // Settings panel (hidden by default)
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = this.screenWidth / 2 - panelWidth / 2;
    const panelY = this.screenHeight / 2 - panelHeight / 2;

    // Panel background
    this.settingsPanel = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    this.settingsPanel.setOrigin(0.5);
    this.settingsPanel.setScrollFactor(0);
    this.settingsPanel.setDepth(2000);
    this.settingsPanel.setVisible(false);

    // Panel border
    const panelBorder = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight);
    panelBorder.setStrokeStyle(2, 0x4CAF50);
    panelBorder.setOrigin(0.5);
    panelBorder.setScrollFactor(0);
    panelBorder.setDepth(2000);
    panelBorder.setVisible(false);

    // Title
    const titleText = this.add.text(panelX + panelWidth / 2, panelY + 30, 'Settings', {
      fontSize: '32px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(2001);
    titleText.setVisible(false);

    // Music volume label
    const musicLabel = this.add.text(panelX + 40, panelY + 90, 'Music Volume:', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    musicLabel.setScrollFactor(0);
    musicLabel.setDepth(2001);
    musicLabel.setVisible(false);

    // Music volume value
    const musicValue = this.add.text(panelX + panelWidth - 60, panelY + 90, '20%', {
      fontSize: '20px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    musicValue.setOrigin(1, 0);
    musicValue.setScrollFactor(0);
    musicValue.setDepth(2001);
    musicValue.setVisible(false);

    // Music slider background
    const musicSliderBg = this.add.rectangle(panelX + panelWidth / 2, panelY + 130, 300, 20, 0x333333);
    musicSliderBg.setScrollFactor(0);
    musicSliderBg.setDepth(2001);
    musicSliderBg.setVisible(false);

    // Music slider fill (20% = 60px of 300px)
    const musicSliderFill = this.add.rectangle(panelX + (panelWidth / 2) - 150, panelY + 130, 60, 20, 0x4CAF50);
    musicSliderFill.setOrigin(0, 0.5);
    musicSliderFill.setScrollFactor(0);
    musicSliderFill.setDepth(2002);
    musicSliderFill.setVisible(false);

    // Music slider handle (20% = -150 + 60)
    const musicHandle = this.add.circle(panelX + panelWidth / 2 - 90, panelY + 130, 12, 0xFFFFFF);
    musicHandle.setScrollFactor(0);
    musicHandle.setDepth(2003);
    musicHandle.setVisible(false);
    musicHandle.setInteractive({ useHandCursor: true, draggable: true });

    // SFX volume label
    const sfxLabel = this.add.text(panelX + 40, panelY + 180, 'SFX Volume:', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    sfxLabel.setScrollFactor(0);
    sfxLabel.setDepth(2001);
    sfxLabel.setVisible(false);

    // SFX volume value
    const sfxValue = this.add.text(panelX + panelWidth - 60, panelY + 180, '100%', {
      fontSize: '20px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    sfxValue.setOrigin(1, 0);
    sfxValue.setScrollFactor(0);
    sfxValue.setDepth(2001);
    sfxValue.setVisible(false);

    // SFX slider background
    const sfxSliderBg = this.add.rectangle(panelX + panelWidth / 2, panelY + 220, 300, 20, 0x333333);
    sfxSliderBg.setScrollFactor(0);
    sfxSliderBg.setDepth(2001);
    sfxSliderBg.setVisible(false);

    // SFX slider fill
    const sfxSliderFill = this.add.rectangle(panelX + (panelWidth / 2) - 150, panelY + 220, 300, 20, 0x4CAF50);
    sfxSliderFill.setOrigin(0, 0.5);
    sfxSliderFill.setScrollFactor(0);
    sfxSliderFill.setDepth(2002);
    sfxSliderFill.setVisible(false);

    // SFX slider handle
    const sfxHandle = this.add.circle(panelX + panelWidth / 2 + 150, panelY + 220, 12, 0xFFFFFF);
    sfxHandle.setScrollFactor(0);
    sfxHandle.setDepth(2003);
    sfxHandle.setVisible(false);
    sfxHandle.setInteractive({ useHandCursor: true, draggable: true });

    // Close button
    const closeButton = this.add.text(panelX + panelWidth / 2, panelY + 260, 'Close', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#4CAF50',
      padding: { x: 20, y: 10 }
    });
    closeButton.setOrigin(0.5);
    closeButton.setScrollFactor(0);
    closeButton.setDepth(2001);
    closeButton.setVisible(false);
    closeButton.setInteractive({ useHandCursor: true });

    // Store all panel elements
    this.settingsPanelElements = [
      this.settingsPanel,
      panelBorder,
      titleText,
      musicLabel,
      musicValue,
      musicSliderBg,
      musicSliderFill,
      musicHandle,
      sfxLabel,
      sfxValue,
      sfxSliderBg,
      sfxSliderFill,
      sfxHandle,
      closeButton
    ];

    // Get GameScene
    const gameScene = this.scene.get('GameScene');

    // Initialize slider positions from saved volumes
    if (gameScene && gameScene.soundManager) {
      const musicVol = gameScene.soundManager.getMusicVolume();
      const sfxVol = gameScene.soundManager.getSFXVolume();

      musicHandle.x = panelX + (panelWidth / 2) - 150 + (musicVol * 300);
      musicSliderFill.width = musicVol * 300;
      musicValue.setText(`${Math.round(musicVol * 100)}%`);

      sfxHandle.x = panelX + (panelWidth / 2) - 150 + (sfxVol * 300);
      sfxSliderFill.width = sfxVol * 300;
      sfxValue.setText(`${Math.round(sfxVol * 100)}%`);
    }

    // Settings button click handler
    this.settingsButton.on('pointerdown', () => {
      const isVisible = !this.settingsPanel.visible;
      this.settingsPanelElements.forEach(element => element.setVisible(isVisible));
    });

    // Close button click handler
    closeButton.on('pointerdown', () => {
      this.settingsPanelElements.forEach(element => element.setVisible(false));
    });

    // Music slider drag handler
    musicHandle.on('drag', (pointer, dragX, dragY) => {
      const minX = panelX + (panelWidth / 2) - 150;
      const maxX = minX + 300;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

      musicHandle.x = clampedX;
      const volume = (clampedX - minX) / 300;
      musicSliderFill.width = volume * 300;
      musicValue.setText(`${Math.round(volume * 100)}%`);

      // Update volume in sound manager
      if (gameScene && gameScene.soundManager) {
        gameScene.soundManager.setMusicVolume(volume);
      }
    });

    // SFX slider drag handler
    sfxHandle.on('drag', (pointer, dragX, dragY) => {
      const minX = panelX + (panelWidth / 2) - 150;
      const maxX = minX + 300;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

      sfxHandle.x = clampedX;
      const volume = (clampedX - minX) / 300;
      sfxSliderFill.width = volume * 300;
      sfxValue.setText(`${Math.round(volume * 100)}%`);

      // Update volume in sound manager
      if (gameScene && gameScene.soundManager) {
        gameScene.soundManager.setSFXVolume(volume);
      }
    });

    console.log('UIScene: Settings panel created');
  }
}
