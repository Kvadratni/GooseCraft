// UI Scene - HUD Overlay

import { STARTING_RESOURCES, GAME_CONFIG, UI, BUILDING, FACTION_COLORS, FACTIONS, STORAGE, UNIT_COSTS } from '../utils/Constants.js';
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

    // Selected unit (for ability panels like Spy)
    this.selectedUnit = null;

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
    // Debug toggle removed - use keyboard shortcut in GameScene if needed
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
    // Update top bar (fixed width, positioned at left)
    if (this.topBarBg) {
      const barWidth = 550;
      const barHeight = this.topBarHeight || 35;
      this.topBarBg.setDisplaySize(barWidth, barHeight);
      this.topBarBg.x = barWidth / 2;
    }

    // Update build menu position
    if (this.buildMenuContainer) {
      const menuWidth = 215;
      const menuY = 45;
      const menuX = this.screenWidth - menuWidth - 5;

      this.buildMenuX = menuX;
      this.buildMenuY = menuY;
      this.buildMenuWidth = menuWidth;
      // Refresh build menu buttons (will recalculate height)
      this.updateBuildMenu();
    }

    // Update minimap position
    if (this.minimapBg) {
      const frameScale = 0.4;
      const frameWidth = 620 * frameScale;
      const frameHeight = 508 * frameScale;
      const frameX = 15;
      const frameY = this.screenHeight - frameHeight - 10;

      const contentPadding = { left: 22, top: 32, right: 22, bottom: 18 };
      const minimapWidth = frameWidth - contentPadding.left - contentPadding.right;
      const minimapHeight = frameHeight - contentPadding.top - contentPadding.bottom;
      const minimapSize = Math.min(minimapWidth, minimapHeight);
      const minimapX = frameX + contentPadding.left + (minimapWidth - minimapSize) / 2;
      const minimapY = frameY + contentPadding.top + (minimapHeight - minimapSize) / 2;

      this.minimapX = minimapX;
      this.minimapY = minimapY;
      this.minimapSize = minimapSize;
      this.minimapFrameY = frameY;

      this.minimapBg.x = frameX + frameWidth / 2;
      this.minimapBg.y = frameY + frameHeight / 2;
      if (this.minimapBorder) {
        this.minimapBorder.x = minimapX;
        this.minimapBorder.y = minimapY;
        this.minimapBorder.setSize(minimapSize, minimapSize);
      }
      this.minimapTerrainCached = false; // Force terrain redraw
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

    // Update building panel progress bar (every 100ms for smooth animation)
    if (this.buildingPanelContainer?.visible && this.selectedBuilding) {
      this.panelRefreshTimer = (this.panelRefreshTimer || 0) + delta;
      if (this.panelRefreshTimer > 100) {
        this.updateProgressBar();
        this.panelRefreshTimer = 0;
      }

      // Refresh building panel affordability states (every 1 second)
      this.panelAffordabilityTimer = (this.panelAffordabilityTimer || 0) + delta;
      if (this.panelAffordabilityTimer > 1000) {
        this.showBuildingPanel(this.selectedBuilding);
        this.panelAffordabilityTimer = 0;
      }
    }

    // Update unit panel (Spy abilities) every second to show cooldown changes
    if (this.buildingPanelContainer?.visible && this.selectedUnit) {
      this.unitPanelRefreshTimer = (this.unitPanelRefreshTimer || 0) + delta;
      if (this.unitPanelRefreshTimer > 1000) {
        this.showUnitPanel(this.selectedUnit);
        this.unitPanelRefreshTimer = 0;
      }
    }

    // Periodically update build menu to refresh affordability (every 500ms)
    if (!this.buildMenuRefreshTimer) {
      this.buildMenuRefreshTimer = 0;
    }
    this.buildMenuRefreshTimer += delta;
    if (this.buildMenuRefreshTimer > 500) {
      this.updateBuildMenu();
      this.buildMenuRefreshTimer = 0;
    }
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
    // Top bar image: 842x93 original size - make it smaller and only wide enough for resources
    const barHeight = 35;
    const barWidth = 550; // Just enough to fit resources

    // Background image - positioned at left, only wide enough for content
    this.topBarBg = this.add.image(barWidth / 2, barHeight / 2, 'ui-top-bar');
    this.topBarBg.setDisplaySize(barWidth, barHeight);
    this.topBarBg.setDepth(1000);

    // Resource display - centered vertically on the bar, starting from left
    const resourceX = 35;
    const resourceY = barHeight / 2;
    const spacing = 105;

    // Food
    this.foodText = this.add.text(resourceX, resourceY, `🌾 ${this.resources.food}/${STORAGE.FOOD}`, {
      fontSize: '15px',
      fill: '#f5deb3',
      fontFamily: 'Arial',
      stroke: '#3d2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(1001);

    // Water
    this.waterText = this.add.text(resourceX + spacing, resourceY, `💧 ${this.resources.water}/${STORAGE.WATER}`, {
      fontSize: '15px',
      fill: '#87ceeb',
      fontFamily: 'Arial',
      stroke: '#3d2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(1001);

    // Sticks
    this.sticksText = this.add.text(resourceX + spacing * 2, resourceY, `🪵 ${this.resources.sticks}/${STORAGE.STICKS}`, {
      fontSize: '15px',
      fill: '#deb887',
      fontFamily: 'Arial',
      stroke: '#3d2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(1001);

    // Stone
    this.stoneText = this.add.text(resourceX + spacing * 3, resourceY, `🪨 ${this.resources.stone || 0}/${STORAGE.STONE}`, {
      fontSize: '15px',
      fill: '#a9a9a9',
      fontFamily: 'Arial',
      stroke: '#3d2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(1001);

    // Tools
    this.toolsText = this.add.text(resourceX + spacing * 4, resourceY, `🔧 ${this.resources.tools}/${STORAGE.TOOLS}`, {
      fontSize: '15px',
      fill: '#c0c0c0',
      fontFamily: 'Arial',
      stroke: '#3d2817',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(1001);

    // Store bar height for repositioning
    this.topBarHeight = barHeight;
  }

  /**
   * Create build menu on the right side using segmented images (top/middle/bottom)
   */
  createBuildMenu() {
    // Build menu segments for dynamic sizing
    const menuWidth = 215;
    const menuY = 45; // Below top bar
    const menuX = this.screenWidth - menuWidth - 5;

    // Segment heights (will be determined from images or set manually)
    this.buildMenuTopHeight = 60;    // Header section
    this.buildMenuMiddleHeight = 58; // Repeating middle section (per button)
    this.buildMenuBottomHeight = 50; // Footer section

    // Store menu position
    this.buildMenuX = menuX;
    this.buildMenuY = menuY;
    this.buildMenuWidth = menuWidth;

    // Create container for all menu segments
    this.buildMenuContainer = this.add.container(0, 0);
    this.buildMenuContainer.setDepth(1000);

    // Create segment images (will be positioned in updateBuildMenu)
    this.buildMenuTop = this.add.image(0, 0, 'ui-build-menu-top');
    this.buildMenuTop.setOrigin(0.5, 0);
    this.buildMenuContainer.add(this.buildMenuTop);

    // Middle segments array (will grow/shrink based on content)
    this.buildMenuMiddles = [];

    this.buildMenuBottom = this.add.image(0, 0, 'ui-build-menu-bottom');
    this.buildMenuBottom.setOrigin(0.5, 0);
    this.buildMenuContainer.add(this.buildMenuBottom);

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
    if (!this.buildButtons || !this.buildMenuContainer) {
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

    // Clear old middle segments
    this.buildMenuMiddles.forEach(segment => segment.destroy());
    this.buildMenuMiddles = [];

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.buildingUnlockManager) {
      return;
    }

    const unlockManager = gameScene.buildingUnlockManager;
    const resourceManager = gameScene.resourceManager;

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
      'AIRSTRIP': '✈️',
      'FARM': '🌾',
      'WELL': '💧',
      'LUMBER_MILL': '🪵'
    };

    // First pass: count unlocked buildings to size the menu
    let unlockedBuildings = [];
    for (const buildingKey in BUILDING) {
      const building = BUILDING[buildingKey];
      if (!building.buildable) continue;
      const isUnlocked = unlockManager.isBuildingUnlocked(buildingKey);
      if (!isUnlocked) continue;
      unlockedBuildings.push({ key: buildingKey, config: building });
    }

    const numButtons = unlockedBuildings.length;
    const menuCenterX = this.buildMenuX + this.buildMenuWidth / 2;

    // Position and size top segment
    this.buildMenuTop.setPosition(menuCenterX, this.buildMenuY);
    this.buildMenuTop.setDisplaySize(this.buildMenuWidth, this.buildMenuTopHeight);

    // Create middle segments based on button count
    let currentY = this.buildMenuY + this.buildMenuTopHeight;
    for (let i = 0; i < numButtons; i++) {
      const middleSegment = this.add.image(menuCenterX, currentY, 'ui-build-menu-middle');
      middleSegment.setOrigin(0.5, 0);
      middleSegment.setDisplaySize(this.buildMenuWidth, this.buildMenuMiddleHeight);
      middleSegment.setDepth(1000);
      this.buildMenuMiddles.push(middleSegment);
      currentY += this.buildMenuMiddleHeight;
    }

    // Position bottom segment
    this.buildMenuBottom.setPosition(menuCenterX, currentY);
    this.buildMenuBottom.setDisplaySize(this.buildMenuWidth, this.buildMenuBottomHeight);

    // Calculate total menu height
    this.buildMenuHeight = this.buildMenuTopHeight + (numButtons * this.buildMenuMiddleHeight) + this.buildMenuBottomHeight;

    // Second pass: create buttons
    let yOffset = this.buildMenuTopHeight + 1; // Start just below header
    for (const { key: buildingKey, config: building } of unlockedBuildings) {
      const canAfford = resourceManager ? resourceManager.canAfford(building.cost) : true;
      const btnY = this.buildMenuY + yOffset;

      const button = this.createBuildButton(
        this.buildMenuX + 8,
        btnY,
        building.displayName,
        building.cost,
        buildingIcons[buildingKey] || '🏗️',
        buildingKey,
        canAfford
      );

      this.buildButtons.push(button);
      yOffset += this.buildMenuMiddleHeight;
    }
  }

  /**
   * Create a build button (with scroll background)
   */
  createBuildButton(x, y, label, cost, icon, buildingType, canAfford = true) {
    // Button image: 279x74, scale to fit menu
    const btnWidth = 195;
    const btnHeight = 52;

    const button = {};

    // Create button using scroll image
    const buttonBg = this.add.image(x + btnWidth / 2, y + btnHeight / 2, 'ui-build-button');
    buttonBg.setDisplaySize(btnWidth, btnHeight);
    buttonBg.setDepth(1001);

    // Apply grayscale effect if can't afford
    if (!canAfford) {
      buttonBg.setTint(0x888888);
    }

    // Make interactive
    buttonBg.setInteractive({ useHandCursor: canAfford });

    if (canAfford) {
      buttonBg.on('pointerdown', () => {
        console.log(`Build: ${label}`);
        this.hideTooltip();
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.buildingManager) {
          gameScene.buildingManager.startPlacement(buildingType);
        }
      });

      buttonBg.on('pointerover', () => {
        buttonBg.setTint(0xddddaa); // Highlight on hover
        const building = BUILDING[buildingType];
        if (building && building.description) {
          const tooltipText = `${building.displayName}\n\n${building.description}\n\nCost: ${this.formatCost(building.cost)}`;
          this.showTooltip(x - 10, y, tooltipText);
        }
      });

      buttonBg.on('pointerout', () => {
        buttonBg.clearTint();
        this.hideTooltip();
      });
    } else {
      // Show tooltip even when can't afford
      buttonBg.on('pointerover', () => {
        const building = BUILDING[buildingType];
        if (building) {
          const tooltipText = `${building.displayName}\n\n${building.description}\n\nCost: ${this.formatCost(building.cost)}\n\n⚠️ Not enough resources`;
          this.showTooltip(x - 10, y, tooltipText);
        }
      });

      buttonBg.on('pointerout', () => {
        this.hideTooltip();
      });
    }

    button.bg = buttonBg;

    // Icon
    button.icon = this.add.text(x + 8, y + btnHeight / 2, icon, {
      fontSize: '16px'
    }).setOrigin(0, 0.5).setDepth(1002);
    if (!canAfford) button.icon.setAlpha(0.5);

    // Label
    button.label = this.add.text(x + 30, y + btnHeight / 2 - 8, label, {
      fontSize: '11px',
      fill: canAfford ? '#3d2817' : '#2a1a0a',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setDepth(1002);

    // Cost display
    const costText = this.formatCost(cost);
    button.cost = this.add.text(x + 30, y + btnHeight / 2 + 6, costText, {
      fontSize: '9px',
      fill: canAfford ? '#5a4030' : '#3a2a1a',
      fontFamily: 'Arial'
    }).setDepth(1002);

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
    // Minimap frame image: 620x508, scale to fit
    const frameScale = 0.4;
    const frameWidth = 620 * frameScale;
    const frameHeight = 508 * frameScale;

    // Position at bottom-left
    const frameX = 15;
    const frameY = this.screenHeight - frameHeight - 10;

    // The parchment content area inside the frame - use more space
    const contentPadding = { left: 22, top: 32, right: 22, bottom: 18 };
    const minimapWidth = frameWidth - contentPadding.left - contentPadding.right;
    const minimapHeight = frameHeight - contentPadding.top - contentPadding.bottom;
    const minimapSize = Math.min(minimapWidth, minimapHeight);
    const minimapX = frameX + contentPadding.left + (minimapWidth - minimapSize) / 2;
    const minimapY = frameY + contentPadding.top + (minimapHeight - minimapSize) / 2;

    // Frame image (already has "Minimap" header)
    this.minimapBg = this.add.image(frameX + frameWidth / 2, frameY + frameHeight / 2, 'ui-minimap');
    this.minimapBg.setDisplaySize(frameWidth, frameHeight);
    this.minimapBg.setDepth(1000);

    // Invisible interactive rectangle for minimap clicks
    this.minimapBorder = this.add.rectangle(minimapX, minimapY, minimapSize, minimapSize);
    this.minimapBorder.setOrigin(0, 0);
    this.minimapBorder.setFillStyle(0x000000, 0); // Transparent
    this.minimapBorder.setDepth(1001);
    this.minimapBorder.setInteractive({ useHandCursor: true });

    // Store minimap properties
    this.minimapX = minimapX;
    this.minimapY = minimapY;
    this.minimapSize = minimapSize;
    this.minimapFrameY = frameY;

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
   * Dynamic panel with scrollable content area
   */
  createBuildingPanel() {
    // Scroll image dimensions at full scale: 428x480
    // Padding at full scale: top 75px, scrollable 330px, bottom 75px
    const scrollScale = 0.6;
    this.panelScale = scrollScale;
    this.panelWidth = 428 * scrollScale;
    this.panelBaseHeight = 480 * scrollScale;
    this.panelX = (this.screenWidth - 220 - this.panelWidth) / 2;
    this.panelY = this.screenHeight - this.panelBaseHeight - 50;

    // Content padding inside the scroll (scaled from 75px top/bottom)
    const scaledTopPadding = 75 * scrollScale;    // 45px
    const scaledBottomPadding = 75 * scrollScale; // 45px
    const scaledScrollableHeight = 330 * scrollScale; // 198px

    this.panelContentPadding = {
      left: 45 * scrollScale,  // More left padding for text
      top: scaledTopPadding,
      right: 20 * scrollScale,
      bottom: scaledBottomPadding
    };

    // Scrollable area configuration
    this.scrollAreaY = this.panelY + scaledTopPadding;
    this.scrollAreaHeight = scaledScrollableHeight;
    this.scrollContentHeight = 0; // Will be set based on content
    this.scrollOffset = 0;

    // Container for all building panel elements
    this.buildingPanelContainer = this.add.container(0, 0);
    this.buildingPanelContainer.setDepth(2000);
    this.buildingPanelContainer.setVisible(false);

    // Scroll background image
    this.panelBg = this.add.image(
      this.panelX + this.panelWidth / 2,
      this.panelY + this.panelBaseHeight / 2,
      'ui-scroll'
    );
    this.panelBg.setDisplaySize(this.panelWidth, this.panelBaseHeight);
    this.buildingPanelContainer.add(this.panelBg);

    // Create scrollable content container
    this.scrollableContent = this.add.container(0, 0);
    this.buildingPanelContainer.add(this.scrollableContent);

    // Create mask for scrollable area (will be updated in updateScrollMask)
    this.scrollMaskGraphics = null;
    this.scrollMask = null;

    // Title (fixed, not scrollable)
    this.buildingNameText = this.add.text(
      this.panelX + this.panelWidth / 2,
      this.panelY + 12,
      'Building',
      {
        fontSize: '16px',
        fill: '#3d2817',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    this.buildingNameText.setOrigin(0.5, 0);
    this.buildingPanelContainer.add(this.buildingNameText);

    // Close button (fixed, not scrollable)
    this.closeBtn = this.add.text(
      this.panelX + this.panelWidth - 15,
      this.panelY + 10,
      '✕',
      {
        fontSize: '18px',
        fill: '#5a4030',
        fontFamily: 'Arial'
      }
    );
    this.closeBtn.setOrigin(1, 0);
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.hideBuildingPanel());
    this.closeBtn.on('pointerover', () => this.closeBtn.setColor('#8b0000'));
    this.closeBtn.on('pointerout', () => this.closeBtn.setColor('#5a4030'));
    this.buildingPanelContainer.add(this.closeBtn);

    // Status text (in scrollable area)
    this.buildingStatusText = this.add.text(
      this.panelX + this.panelContentPadding.left + 5,
      0, // Y position relative to scroll content
      'Status: Operational',
      {
        fontSize: '11px',
        fill: '#2e7d32',
        fontFamily: 'Arial'
      }
    );
    this.scrollableContent.add(this.buildingStatusText);

    // Info text (in scrollable area)
    this.buildingInfoText = this.add.text(
      this.panelX + this.panelContentPadding.left + 5,
      18,
      '',
      {
        fontSize: '10px',
        fill: '#8b6914',
        fontFamily: 'Arial',
        wordWrap: { width: this.panelWidth - this.panelContentPadding.left - this.panelContentPadding.right - 10 }
      }
    );
    this.scrollableContent.add(this.buildingInfoText);

    // Section label (in scrollable area)
    this.sectionLabel = this.add.text(
      this.panelX + this.panelContentPadding.left + 5,
      38,
      '',
      {
        fontSize: '12px',
        fill: '#3d2817',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    this.scrollableContent.add(this.sectionLabel);

    // Progress bar elements (in scrollable area)
    const progressBarWidth = this.panelWidth - this.panelContentPadding.left - this.panelContentPadding.right - 10;
    this.progressBarBg = this.add.rectangle(
      this.panelX + this.panelContentPadding.left + 5,
      18,
      progressBarWidth,
      16,
      0x8b7355
    );
    this.progressBarBg.setOrigin(0, 0);
    this.progressBarBg.setVisible(false);
    this.scrollableContent.add(this.progressBarBg);

    this.progressBarFill = this.add.rectangle(
      this.panelX + this.panelContentPadding.left + 7,
      20,
      0,
      12,
      0x4caf50
    );
    this.progressBarFill.setOrigin(0, 0);
    this.progressBarFill.setVisible(false);
    this.scrollableContent.add(this.progressBarFill);

    this.progressBarBorder = this.add.rectangle(
      this.panelX + this.panelContentPadding.left + 5,
      18,
      progressBarWidth,
      16
    );
    this.progressBarBorder.setOrigin(0, 0);
    this.progressBarBorder.setStrokeStyle(2, 0x5a4030);
    this.progressBarBorder.setFillStyle(0x000000, 0);
    this.progressBarBorder.setVisible(false);
    this.scrollableContent.add(this.progressBarBorder);

    this.progressBarText = this.add.text(
      this.panelX + this.panelWidth / 2,
      26,
      '',
      {
        fontSize: '10px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.progressBarText.setOrigin(0.5);
    this.progressBarText.setVisible(false);
    this.scrollableContent.add(this.progressBarText);

    // Scroll indicator (thumb) - draggable
    this.scrollThumb = this.add.rectangle(
      this.panelX + this.panelWidth - 10,
      this.scrollAreaY,
      8,
      30,
      0x8b7355,
      0.9
    );
    this.scrollThumb.setOrigin(0.5, 0);
    this.scrollThumb.setVisible(false);
    this.scrollThumb.setInteractive({ useHandCursor: true, draggable: true });
    this.buildingPanelContainer.add(this.scrollThumb);

    // Handle scrollbar dragging
    this.input.setDraggable(this.scrollThumb);
    this.scrollThumb.on('drag', (pointer, dragX, dragY) => {
      const maxScroll = Math.max(0, this.scrollContentHeight - this.scrollAreaHeight);
      if (maxScroll <= 0) return;

      const thumbHeight = Math.max(20, (this.scrollAreaHeight / this.scrollContentHeight) * this.scrollAreaHeight);
      const minThumbY = this.scrollAreaY;
      const maxThumbY = this.scrollAreaY + this.scrollAreaHeight - thumbHeight;

      // Clamp thumb position
      const clampedY = Phaser.Math.Clamp(dragY, minThumbY, maxThumbY);

      // Calculate scroll progress from thumb position
      const scrollProgress = (clampedY - minThumbY) / (maxThumbY - minThumbY);
      this.scrollOffset = scrollProgress * maxScroll;

      // Update content position
      this.scrollableContent.y = this.scrollAreaY - this.scrollOffset;
      this.updateScrollThumb();
    });

    // Dynamic buttons array (will be populated when showing panel)
    this.dynamicButtons = [];

    // Panel refresh timer
    this.panelRefreshTimer = 0;

    // Set up scroll wheel handling for the panel
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (this.buildingPanelContainer.visible && this.isPointerOverPanel(pointer)) {
        this.handlePanelScroll(deltaY);
      }
    });
  }

  /**
   * Check if pointer is over the building panel
   */
  isPointerOverPanel(pointer) {
    return pointer.x >= this.panelX &&
           pointer.x <= this.panelX + this.panelWidth &&
           pointer.y >= this.panelY &&
           pointer.y <= this.panelY + this.panelBaseHeight;
  }

  /**
   * Handle scrolling in the building panel
   */
  handlePanelScroll(deltaY) {
    const scrollSpeed = 0.5;
    const maxScroll = Math.max(0, this.scrollContentHeight - this.scrollAreaHeight);

    // Update scroll offset
    this.scrollOffset += deltaY * scrollSpeed;
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, maxScroll);

    // Update scrollable content position
    this.scrollableContent.y = this.scrollAreaY - this.scrollOffset;

    // Update scroll thumb position
    this.updateScrollThumb();
  }

  /**
   * Update the scroll thumb position and visibility
   */
  updateScrollThumb() {
    const maxScroll = Math.max(0, this.scrollContentHeight - this.scrollAreaHeight);

    if (maxScroll <= 0) {
      this.scrollThumb.setVisible(false);
      return;
    }

    this.scrollThumb.setVisible(true);

    // Calculate thumb size proportional to visible area
    const thumbHeight = Math.max(20, (this.scrollAreaHeight / this.scrollContentHeight) * this.scrollAreaHeight);
    this.scrollThumb.height = thumbHeight;

    // Calculate thumb position
    const scrollProgress = this.scrollOffset / maxScroll;
    const thumbY = this.scrollAreaY + scrollProgress * (this.scrollAreaHeight - thumbHeight);
    this.scrollThumb.y = thumbY;
  }

  /**
   * Update the scroll mask geometry (called when panel is repositioned)
   */
  updateScrollMask() {
    if (this.scrollMaskGraphics) {
      this.scrollMaskGraphics.destroy();
    }

    this.scrollMaskGraphics = this.make.graphics();
    this.scrollMaskGraphics.fillStyle(0xffffff);
    this.scrollMaskGraphics.fillRect(
      this.panelX + this.panelContentPadding.left,
      this.scrollAreaY,
      this.panelWidth - this.panelContentPadding.left - this.panelContentPadding.right,
      this.scrollAreaHeight
    );

    if (this.scrollMask) {
      this.scrollableContent.clearMask();
    }
    this.scrollMask = this.scrollMaskGraphics.createGeometryMask();
    this.scrollableContent.setMask(this.scrollMask);
  }

  /**
   * Create a dynamic button for the building panel (in scrollable area)
   * @param {number} x - X position (absolute)
   * @param {number} y - Y position (relative to scroll content, 0 = top of scroll area)
   * @param {string} label - Button label
   * @param {string} costText - Cost display text
   * @param {string} icon - Icon emoji
   * @param {function} onClick - Click handler
   * @param {boolean} disabled - Whether button is disabled
   * @param {string} tooltipText - Optional tooltip description
   */
  createDynamicButton(x, y, label, costText, icon, onClick, disabled = false, tooltipText = null) {
    const btnWidth = 180;
    const btnHeight = 36;
    const leftPadding = 5;

    // Readable font with slight style - disabled uses dark muted brown for readability on parchment
    const normalColor = disabled ? '#4a4035' : '#3d2817';
    const hoverColor = '#8b5a2b';
    const costColor = disabled ? '#5a5045' : '#5a4a3a';

    // Create invisible hit area for interaction (added to scrollable content)
    const bg = this.add.rectangle(x + leftPadding + btnWidth / 2, y + btnHeight / 2, btnWidth, btnHeight, 0x000000, 0);
    bg.setInteractive({ useHandCursor: !disabled });
    this.scrollableContent.add(bg);

    const iconText = this.add.text(x + leftPadding, y + 8, icon, {
      fontSize: '14px'
    });
    this.scrollableContent.add(iconText);

    const labelText = this.add.text(x + leftPadding + 20, y + 4, label, {
      fontSize: '12px',
      fill: normalColor,
      fontFamily: 'Georgia, serif'
    });
    this.scrollableContent.add(labelText);

    const cost = this.add.text(x + leftPadding + 20, y + 18, costText, {
      fontSize: '9px',
      fill: costColor,
      fontFamily: 'Georgia, serif'
    });
    this.scrollableContent.add(cost);

    // Store the relative Y for tooltip positioning
    const absoluteY = this.scrollAreaY + y - this.scrollOffset;

    // Hover and click interactions
    bg.on('pointerover', () => {
      if (!disabled) {
        labelText.setColor(hoverColor);
        cost.setColor(hoverColor);
        iconText.setScale(1.1);
      }
      // Show tooltip if provided - position to the left of the building panel
      if (tooltipText) {
        const tooltipContent = disabled
          ? `${label}\n\n${tooltipText}\n\n⚠️ Not enough resources`
          : `${label}\n\n${tooltipText}`;
        // Position tooltip well to the left of the panel (fixed position near left edge)
        const tooltipX = 20;
        const tooltipY = this.panelY + 50;
        this.showTooltip(tooltipX, tooltipY, tooltipContent);
      }
    });

    bg.on('pointerout', () => {
      labelText.setColor(normalColor);
      cost.setColor(costColor);
      iconText.setScale(1);
      this.hideTooltip();
    });

    if (!disabled) {
      bg.on('pointerdown', onClick);
    }

    // Elements already added to scrollableContent above
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
   * Resize the panel to fit content (with scrollable area)
   */
  resizePanel(numButtons, hasInfo = false, hasProgressBar = false) {
    const progressBarHeight = hasProgressBar ? 22 : 0;
    const infoHeight = hasInfo ? 16 : 0;
    const buttonHeight = 36;
    const headerHeight = 18; // Status text height

    // Calculate total content height
    const totalContentHeight = headerHeight + progressBarHeight + infoHeight + 20 + (numButtons * buttonHeight);
    this.scrollContentHeight = totalContentHeight;

    // Update panel position first
    this.panelY = this.screenHeight - this.panelBaseHeight - 50;
    this.panelX = (this.screenWidth - 220 - this.panelWidth) / 2;

    // Reset scroll position
    this.scrollOffset = 0;
    this.scrollAreaY = this.panelY + this.panelContentPadding.top;
    this.scrollableContent.y = this.scrollAreaY;

    // Update scroll mask for new position
    this.updateScrollMask();

    // Update scroll background position
    this.panelBg.setPosition(
      this.panelX + this.panelWidth / 2,
      this.panelY + this.panelBaseHeight / 2
    );

    // Update fixed elements (title and close button)
    this.buildingNameText.setPosition(this.panelX + this.panelWidth / 2, this.panelY + 12);
    this.closeBtn.setPosition(this.panelX + this.panelWidth - 15, this.panelY + 10);

    // Update scroll thumb position
    this.scrollThumb.x = this.panelX + this.panelWidth - 10;
    this.updateScrollThumb();

    // Update scrollable content positions (relative Y coordinates)
    // Status text at top of scroll area
    this.buildingStatusText.setPosition(this.panelX + this.panelContentPadding.left + 5, 0);

    // Progress bar below status (if visible)
    const progressY = 18;
    this.progressBarBg.setPosition(this.panelX + this.panelContentPadding.left + 5, progressY);
    this.progressBarFill.setPosition(this.panelX + this.panelContentPadding.left + 7, progressY + 2);
    this.progressBarBorder.setPosition(this.panelX + this.panelContentPadding.left + 5, progressY);
    this.progressBarText.setPosition(this.panelX + this.panelWidth / 2, progressY + 8);

    // Info text (below progress bar if present)
    const infoY = progressY + progressBarHeight;
    this.buildingInfoText.setPosition(this.panelX + this.panelContentPadding.left + 5, infoY);

    // Section label
    const sectionY = infoY + infoHeight + 4;
    this.sectionLabel.setPosition(this.panelX + this.panelContentPadding.left + 5, sectionY);

    // Store progress bar visibility state
    this.hasProgressBar = hasProgressBar;

    // Return Y position for first button (relative to scroll content)
    return sectionY + 18;
  }

  /**
   * Update the progress bar based on building state
   */
  updateProgressBar() {
    if (!this.selectedBuilding) {
      this.hideProgressBar();
      return;
    }

    const building = this.selectedBuilding;
    let progress = 0;
    let progressText = '';
    let showBar = false;
    let barColor = 0x4CAF50; // Green default

    // Check for different types of progress
    if (building.state === 'CONSTRUCTION') {
      // Building under construction
      progress = building.constructionProgress / 100;
      progressText = `Building... ${Math.floor(building.constructionProgress)}%`;
      showBar = true;
      barColor = 0xFFD700; // Gold for construction
    } else if (building.productionQueue?.getQueueStatus) {
      // Unit production queue
      const queueStatus = building.productionQueue.getQueueStatus();
      if (queueStatus?.isProducing) {
        progress = queueStatus.progress / 100;
        const timeLeft = (queueStatus.timeRemaining / 1000).toFixed(1);
        progressText = `Training ${queueStatus.currentUnit}... ${Math.floor(queueStatus.progress)}% (${timeLeft}s)`;
        showBar = true;
        barColor = 0x4CAF50; // Green for production
      }
    } else if (building.buildingType === 'RESEARCH_CENTER') {
      // Research progress
      const status = building.getResearchStatus?.();
      if (status?.isResearching) {
        progress = status.progress / 100;
        const timeLeft = (status.timeRemaining / 1000).toFixed(1);
        progressText = `Researching ${status.upgradeName}... ${Math.floor(status.progress)}% (${timeLeft}s)`;
        showBar = true;
        barColor = 0x2196F3; // Blue for research
      }
    }

    if (showBar) {
      this.showProgressBar(progress, progressText, barColor);
    } else {
      this.hideProgressBar();
    }
  }

  /**
   * Show and update the progress bar
   */
  showProgressBar(progress, text, color = 0x4CAF50) {
    // Calculate max width based on panel content area (accounting for padding)
    const maxWidth = this.panelWidth - this.panelContentPadding.left - this.panelContentPadding.right - 10;
    const fillWidth = Math.max(0, Math.min(maxWidth - 4, (maxWidth - 4) * progress)); // -4 for border

    this.progressBarBg.setVisible(true);
    this.progressBarFill.setVisible(true);
    this.progressBarFill.width = fillWidth;
    this.progressBarFill.setFillStyle(color);
    this.progressBarBorder.setVisible(true);
    this.progressBarText.setVisible(true);
    this.progressBarText.setText(text);
  }

  /**
   * Hide the progress bar
   */
  hideProgressBar() {
    this.progressBarBg.setVisible(false);
    this.progressBarFill.setVisible(false);
    this.progressBarBorder.setVisible(false);
    this.progressBarText.setVisible(false);
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
    // Hide range indicator from previous selection
    if (this.selectedBuilding && this.selectedBuilding.hideRangeIndicator) {
      this.selectedBuilding.hideRangeIndicator();
    }

    this.selectedBuilding = building;
    this.selectedUnit = null; // Clear unit selection when showing building panel
    this.clearDynamicButtons();

    // Show range indicator for watchtower
    if (building.showRangeIndicator) {
      building.showRangeIndicator();
    }

    // Reset scroll position
    this.scrollOffset = 0;
    if (this.scrollableContent) {
      this.scrollableContent.y = this.scrollAreaY;
    }

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
      case 'FARM':
        this.showFarmPanel(building);
        break;
      case 'WELL':
        this.showWellPanel(building);
        break;
      case 'LUMBER_MILL':
        this.showLumberMillPanel(building);
        break;
      case 'AIRSTRIP':
        this.showAirstripPanel(building);
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Train Worker button
    const canAffordWorker = resourceManager ? resourceManager.canAfford(UNIT_COSTS.WORKER) : true;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      'Train Worker', '50🌾',
      '👷', () => this.trainUnit('worker'),
      !canAffordWorker,
      'Train a worker goose that can gather resources and construct buildings.'
    ));
    buttonY += 38;

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      const canAffordUpgrade = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAffordUpgrade,
        upgrade.description || 'Upgrade your building.'
      ));
      buttonY += 38;
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Unit production buttons
    if (canProduce.includes('guard')) {
      const canAfford = resourceManager ? resourceManager.canAfford(UNIT_COSTS.GUARD) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Guard', '75🌾 25💧 50🪵 2🔧',
        '🛡️', () => this.trainUnit('guard'),
        !canAfford,
        'Heavy defensive unit with high health and melee damage. Slow but tanky.'
      ));
      buttonY += 38;
    }
    if (canProduce.includes('scout')) {
      const canAfford = resourceManager ? resourceManager.canAfford(UNIT_COSTS.SCOUT) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Scout', '40🌾 30💧 20🪵 1🔧',
        '🏹', () => this.trainUnit('scout'),
        !canAfford,
        'Fast ranged unit with good vision. Quick but fragile.'
      ));
      buttonY += 38;
    }
    if (canProduce.includes('spy')) {
      const canAfford = resourceManager ? resourceManager.canAfford(UNIT_COSTS.SPY) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Spy', '60🌾 40💧 30🪵 3🔧',
        '🕵️', () => this.trainUnit('spy'),
        !canAfford,
        'Stealthy reconnaissance unit with extended vision range.'
      ));
      buttonY += 38;
    }

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      const canAffordUpgrade = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAffordUpgrade,
        upgrade.description || 'Upgrade your barracks.'
      ));
      buttonY += 38;
    }
  }

  /**
   * Show Airstrip panel (Maverick production + upgrades)
   */
  showAirstripPanel(building) {
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

    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Maverick production button
    if (canProduce.includes('maverick')) {
      const canAfford = resourceManager ? resourceManager.canAfford(UNIT_COSTS.MAVERICK) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Train Maverick', '100🌾 50💧 80🪵 8🔧',
        '🦅', () => this.trainUnit('maverick'),
        !canAfford,
        'Fast aerial unit with ranged attacks. Can only be hit by other air units.'
      ));
      buttonY += 38;
    }

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      const canAffordUpgrade = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAffordUpgrade,
        upgrade.description || 'Upgrade your airstrip.'
      ));
      buttonY += 38;
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
      infoText = status.isPaused ? 'Auto-production PAUSED' : 'Auto-production enabled';
    }
    this.buildingInfoText.setText(infoText);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);
    const hasBatch = upgrades.BATCH_PRODUCTION?.purchased;
    const hasAutoProduction = status.autoProduction;
    const numButtons = 1 + (hasBatch ? 1 : 0) + (hasAutoProduction ? 1 : 0) + availableUpgrades.length;

    this.sectionLabel.setText('Tool Production & Upgrades:');
    let buttonY = this.resizePanel(numButtons, infoText !== '');

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Make Tool button
    const sticksPerTool = building.sticksPerTool || 5;
    const canAffordTool = resourceManager ? resourceManager.canAfford({ sticks: sticksPerTool }) : true;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      'Make Tool', `${sticksPerTool}🪵 → 1🔧`,
      '🔧', () => this.makeTools(),
      !canAffordTool,
      'Convert sticks into tools. Tools are required for training combat units.'
    ));
    buttonY += 38;

    // Batch Production button (if unlocked)
    if (hasBatch) {
      const batchCost = 20; // 20 sticks for 5 tools
      const canAffordBatch = resourceManager ? resourceManager.canAfford({ sticks: batchCost }) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        'Make Batch (5)', '20🪵 → 5🔧',
        '🔧🔧', () => this.makeBatchTools(),
        !canAffordBatch,
        'Produce 5 tools at once for improved efficiency.'
      ));
      buttonY += 38;
    }

    // Pause/Resume auto-production button (if auto-production is enabled)
    if (hasAutoProduction) {
      const isPaused = status.isPaused || false;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        isPaused ? 'Resume Auto' : 'Pause Auto', isPaused ? 'Start auto-production' : 'Stop auto-production',
        isPaused ? '▶️' : '⏸️', () => this.toggleBuildingPause(),
        false,
        isPaused ? 'Resume automatic tool production.' : 'Pause automatic tool production.'
      ));
      buttonY += 38;
    }

    // Upgrade buttons
    for (const [key, upgrade] of availableUpgrades) {
      const canAffordUpgrade = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAffordUpgrade,
        upgrade.description || 'Upgrade your factory.'
      ));
      buttonY += 38;
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Research buttons (limited to prevent overflow)
    let count = 0;
    for (const [key, upgrade] of availableUpgrades) {
      if (count >= 6) break; // Limit visible buttons
      const isResearching = status.isResearching && status.currentResearch === key;
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      // Disable if already researching OR can't afford
      const isDisabled = isResearching || !canAfford;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, isResearching ? `${Math.floor(status.progress)}%...` : this.formatUpgradeCost(upgrade.cost),
        '🔬', () => this.startResearch(key),
        isDisabled,
        upgrade.description || 'Research new technology.'
      ));
      buttonY += 38;
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your watchtower.'
      ));
      buttonY += 38;
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your mine.'
      ));
      buttonY += 38;
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

    // Get resource manager for affordability check
    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your power station.'
      ));
      buttonY += 38;
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
   * Show Farm panel (food production + upgrades)
   */
  showFarmPanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    const statusText = building.getStatusText?.() || '';
    this.buildingInfoText.setText(statusText || `Producing ${status.gatherAmount || 8} food every ${(status.gatherInterval || 6000) / 1000}s`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Production & Upgrades:');
    const numButtons = 1 + availableUpgrades.length; // 1 for pause/resume
    let buttonY = this.resizePanel(numButtons, true);

    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Pause/Resume button
    const isPaused = status.isPaused || false;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      isPaused ? 'Resume' : 'Pause', isPaused ? 'Start production' : 'Stop production',
      isPaused ? '▶️' : '⏸️', () => this.toggleBuildingPause(),
      false,
      isPaused ? 'Resume automatic food production.' : 'Pause automatic food production.'
    ));
    buttonY += 38;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your farm.'
      ));
      buttonY += 38;
    }
  }

  /**
   * Show Well panel (water extraction + upgrades)
   */
  showWellPanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    const statusText = building.getStatusText?.() || '';
    this.buildingInfoText.setText(statusText || `Extracting ${status.gatherAmount || 5} water every ${(status.gatherInterval || 4000) / 1000}s`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Production & Upgrades:');
    const numButtons = 1 + availableUpgrades.length; // 1 for pause/resume
    let buttonY = this.resizePanel(numButtons, true);

    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Pause/Resume button
    const isPaused = status.isPaused || false;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      isPaused ? 'Resume' : 'Pause', isPaused ? 'Start extraction' : 'Stop extraction',
      isPaused ? '▶️' : '⏸️', () => this.toggleBuildingPause(),
      false,
      isPaused ? 'Resume automatic water extraction.' : 'Pause automatic water extraction.'
    ));
    buttonY += 38;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your well.'
      ));
      buttonY += 38;
    }
  }

  /**
   * Show Lumber Mill panel (sticks production + upgrades)
   */
  showLumberMillPanel(building) {
    const status = building.getUpgradeStatus?.() || {};
    const statusText = building.getStatusText?.() || '';
    this.buildingInfoText.setText(statusText || `Producing ${status.gatherAmount || 6} sticks every ${(status.gatherInterval || 5000) / 1000}s`);

    const upgrades = building.upgrades || {};
    const availableUpgrades = Object.entries(upgrades).filter(([k, v]) => !v.purchased);

    this.sectionLabel.setText('Production & Upgrades:');
    const numButtons = 1 + availableUpgrades.length; // 1 for pause/resume
    let buttonY = this.resizePanel(numButtons, true);

    const gameScene = this.scene.get('GameScene');
    const resourceManager = gameScene?.resourceManager;

    // Pause/Resume button
    const isPaused = status.isPaused || false;
    this.dynamicButtons.push(this.createDynamicButton(
      this.panelX + 10, buttonY,
      isPaused ? 'Resume' : 'Pause', isPaused ? 'Start production' : 'Stop production',
      isPaused ? '▶️' : '⏸️', () => this.toggleBuildingPause(),
      false,
      isPaused ? 'Resume automatic stick production.' : 'Pause automatic stick production.'
    ));
    buttonY += 38;

    for (const [key, upgrade] of availableUpgrades) {
      const canAfford = resourceManager ? resourceManager.canAfford(upgrade.cost) : true;
      this.dynamicButtons.push(this.createDynamicButton(
        this.panelX + 10, buttonY,
        upgrade.name, this.formatUpgradeCost(upgrade.cost),
        '⬆️', () => this.purchaseUpgrade(key),
        !canAfford,
        upgrade.description || 'Upgrade your lumber mill.'
      ));
      buttonY += 38;
    }
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
   * Toggle pause state for the selected building's production
   */
  toggleBuildingPause() {
    if (!this.selectedBuilding) return;

    if (this.selectedBuilding.togglePause) {
      this.selectedBuilding.togglePause();
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
    // Hide range indicator when deselecting
    if (this.selectedBuilding && this.selectedBuilding.hideRangeIndicator) {
      this.selectedBuilding.hideRangeIndicator();
    }
    this.selectedBuilding = null;
    this.clearDynamicButtons();
    this.buildingPanelContainer.setVisible(false);
  }

  /**
   * Show unit panel (for units with special abilities like Spy)
   */
  showUnitPanel(unit) {
    if (!unit) return;

    // Hide building panel if visible
    this.hideBuildingPanel();

    this.selectedUnit = unit;
    this.clearDynamicButtons();

    // Reset scroll position
    this.scrollOffset = 0;
    if (this.scrollableContent) {
      this.scrollableContent.y = this.scrollAreaY;
    }

    // Set unit name
    const unitName = unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1);
    this.buildingNameText.setText(unitName);

    // Set status (health + stealth for spy)
    if (unit.unitType === 'spy') {
      this.showSpyPanel(unit);
    } else {
      // Generic unit info
      const healthPercent = Math.floor((unit.currentHealth / unit.maxHealth) * 100);
      this.buildingStatusText.setText(`Health: ${unit.currentHealth}/${unit.maxHealth} (${healthPercent}%)`);
      this.buildingStatusText.setColor(healthPercent > 50 ? '#4CAF50' : '#FF9800');
      this.buildingInfoText.setText('');
      this.sectionLabel.setText('');
      this.resizePanel(0);
    }

    this.buildingPanelContainer.setVisible(true);
  }

  /**
   * Show Spy ability panel
   */
  showSpyPanel(spy) {
    const abilityStatus = spy.getAbilityStatus();

    // Status text
    let statusText = `Health: ${spy.currentHealth}/${spy.maxHealth}`;
    if (abilityStatus.isStealthed) {
      statusText += ' | STEALTHED';
      this.buildingStatusText.setColor('#9C27B0'); // Purple for stealth
    } else {
      statusText += ' | VISIBLE';
      this.buildingStatusText.setColor('#FF9800'); // Orange for visible
    }
    this.buildingStatusText.setText(statusText);

    // Info text - cooldowns
    let infoText = '';
    if (!abilityStatus.sabotageReady) {
      infoText += `Sabotage: ${abilityStatus.sabotageCooldown}s`;
    }
    if (!abilityStatus.stealReady) {
      if (infoText) infoText += ' | ';
      infoText += `Steal: ${abilityStatus.stealCooldown}s`;
    }
    this.buildingInfoText.setText(infoText);

    this.sectionLabel.setText('Abilities:');

    // Count buttons
    const numButtons = 2; // Sabotage + Steal
    let buttonY = this.resizePanel(numButtons, infoText !== '');

    // Get GameScene for target finding
    const gameScene = this.scene.get('GameScene');

    // Sabotage button
    const sabotageLabel = abilityStatus.sabotageReady ? '⚡ Sabotage Building' : `⚡ Sabotage (${abilityStatus.sabotageCooldown}s)`;
    this.createDynamicButton(
      sabotageLabel,
      buttonY,
      () => this.useSabotage(spy),
      abilityStatus.sabotageReady,
      'Disable an enemy building for 30s.\nMust be within 100px of target.'
    );
    buttonY += 38;

    // Steal button
    const stealLabel = abilityStatus.stealReady ? '💰 Steal Resources' : `💰 Steal (${abilityStatus.stealCooldown}s)`;
    this.createDynamicButton(
      stealLabel,
      buttonY,
      () => this.useSteal(spy),
      abilityStatus.stealReady,
      'Steal 25 of each resource from enemy storage.\nMust be within 100px of target.'
    );
  }

  /**
   * Use Spy's Sabotage ability on nearest enemy building
   */
  useSabotage(spy) {
    const gameScene = this.scene.get('GameScene');
    if (!gameScene) return;

    // Find nearest enemy building in range
    let nearestBuilding = null;
    let nearestDistance = Infinity;

    if (gameScene.buildings) {
      gameScene.buildings.forEach(building => {
        if (!building.active || building.faction === spy.faction) return;

        const dist = Phaser.Math.Distance.Between(spy.x, spy.y, building.x, building.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestBuilding = building;
        }
      });
    }

    if (nearestBuilding && nearestDistance <= spy.sabotageRange) {
      const success = spy.sabotageBuilding(nearestBuilding);
      if (success) {
        // Refresh panel to show cooldown
        this.showSpyPanel(spy);
      }
    } else if (nearestBuilding) {
      console.log(`Spy: Move closer to enemy building (${Math.round(nearestDistance)}px away, need ${spy.sabotageRange}px)`);
    } else {
      console.log('Spy: No enemy buildings found');
    }
  }

  /**
   * Use Spy's Steal ability on nearest enemy storage
   */
  useSteal(spy) {
    const gameScene = this.scene.get('GameScene');
    if (!gameScene) return;

    // Find nearest enemy storage building in range
    let nearestStorage = null;
    let nearestDistance = Infinity;
    const validTypes = ['RESOURCE_STORAGE', 'COOP', 'RESOURCESTORAGE'];

    if (gameScene.buildings) {
      gameScene.buildings.forEach(building => {
        if (!building.active || building.faction === spy.faction) return;
        if (!validTypes.includes(building.buildingType?.toUpperCase())) return;

        const dist = Phaser.Math.Distance.Between(spy.x, spy.y, building.x, building.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestStorage = building;
        }
      });
    }

    if (nearestStorage && nearestDistance <= spy.stealRange) {
      const success = spy.stealResources(nearestStorage);
      if (success) {
        // Refresh panel to show cooldown
        this.showSpyPanel(spy);
      }
    } else if (nearestStorage) {
      console.log(`Spy: Move closer to enemy storage (${Math.round(nearestDistance)}px away, need ${spy.stealRange}px)`);
    } else {
      console.log('Spy: No enemy storage buildings found');
    }
  }

  /**
   * Hide unit panel
   */
  hideUnitPanel() {
    this.selectedUnit = null;
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
  updateResources(food, water, sticks, stone = 0, tools = 0, maxFood = 200, maxWater = 150, maxSticks = 300, maxStone = 100, maxTools = 20) {
    this.resources.food = food;
    this.resources.water = water;
    this.resources.sticks = sticks;
    this.resources.stone = stone;
    this.resources.tools = tools;

    // Store limits for reference
    this.storageLimits = { food: maxFood, water: maxWater, sticks: maxSticks, stone: maxStone, tools: maxTools };

    this.foodText.setText(`🌾 ${food}/${maxFood}`);
    this.waterText.setText(`💧 ${water}/${maxWater}`);
    this.sticksText.setText(`🪵 ${sticks}/${maxSticks}`);
    this.stoneText.setText(`🪨 ${stone}/${maxStone}`);
    this.toolsText.setText(`🔧 ${tools}/${maxTools}`);
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
