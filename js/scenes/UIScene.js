// UI Scene - HUD Overlay

import { STARTING_RESOURCES, GAME_CONFIG, UI, BUILDING, FACTION_COLORS } from '../utils/Constants.js';
import Goose from '../entities/Goose.js';
import { createStyledButton } from '../ui/StyledButton.js';

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

    // Create tooltip
    this.createTooltip();

    // Create HUD elements
    this.createTopBar();
    this.createBuildMenu();
    this.createBottomPanel();
    this.createMinimap();
    this.createBuildingPanel();
    this.createDebugToggle();
    this.createSettingsPanel();

    // Update minimap after a short delay to ensure GameScene is ready
    this.time.delayedCall(500, () => {
      this.updateMinimap();
    });

    console.log('UIScene: HUD ready');
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
  }

  /**
   * Create top bar with resources and title
   */
  createTopBar() {
    const barHeight = 50;

    // Background
    const bg = this.add.rectangle(0, 0, GAME_CONFIG.WIDTH, barHeight, 0x1a1a1a, 0.9);
    bg.setOrigin(0, 0);
    bg.setDepth(1000);

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
    const spacing = 130;

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

    // Tools
    this.toolsText = this.add.text(resourceX + spacing * 3, resourceY, `🔧 ${this.resources.tools}`, {
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
    const menuX = GAME_CONFIG.WIDTH - menuWidth;
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
      'FEED_STORAGE': '🏪',
      'RESOURCE_EXTRACTOR': '⚙️',
      'FACTORY': '🏭',
      'NESTING_BOX': '🪺',
      'BARRACKS': '🏰',
      'WATCHTOWER': '🗼',
      'POWER_STATION': '⚡'
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
    if (tooltipX + width > GAME_CONFIG.WIDTH) {
      tooltipX = GAME_CONFIG.WIDTH - width - 10;
    }

    // Don't go off bottom edge
    if (tooltipY + height > GAME_CONFIG.HEIGHT) {
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
   * Create bottom panel for unit info
   */
  createBottomPanel() {
    const panelHeight = 120;
    const panelY = GAME_CONFIG.HEIGHT - panelHeight;

    // Background
    const bg = this.add.rectangle(0, panelY, GAME_CONFIG.WIDTH - 220, panelHeight, 0x1a1a1a, 0.9);
    bg.setOrigin(0, 0);
    bg.setDepth(1000);

    // Unit info text
    this.unitInfoText = this.add.text(20, panelY + 10, 'No units selected', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setDepth(1001);

    // Selection count
    this.selectionCountText = this.add.text(20, panelY + 40, '', {
      fontSize: '14px',
      fill: '#aaaaaa',
      fontFamily: 'Arial'
    }).setDepth(1001);

    // Instructions
    this.add.text(20, panelY + 70, 'Left-click: Select | Drag: Box Select | Shift-click: Add/Remove | Ctrl+1-9: Save Group | 1-9: Recall', {
      fontSize: '12px',
      fill: '#666666',
      fontFamily: 'Arial'
    }).setDepth(1001);
  }

  /**
   * Create minimap
   */
  createMinimap() {
    const minimapSize = 150;
    // Position at bottom-left to avoid overlap with build menu
    const minimapX = 20;
    const minimapY = GAME_CONFIG.HEIGHT - minimapSize - 140;

    // Background
    const bg = this.add.rectangle(minimapX - 10, minimapY - 30, minimapSize + 20, minimapSize + 40, 0x000000, 0.8);
    bg.setOrigin(0, 0);
    bg.setDepth(1000);

    // Label
    this.add.text(minimapX, minimapY - 20, 'Minimap', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setDepth(1001);

    // Border
    const border = this.add.rectangle(minimapX, minimapY, minimapSize, minimapSize);
    border.setOrigin(0, 0);
    border.setStrokeStyle(2, 0x4CAF50);
    border.setFillStyle(0x1a3a1a, 0.5);
    border.setDepth(1001);

    // Store minimap properties
    this.minimapX = minimapX;
    this.minimapY = minimapY;
    this.minimapSize = minimapSize;

    // Create graphics object for static terrain rendering (cached)
    this.minimapTerrainGraphics = this.add.graphics();
    this.minimapTerrainGraphics.setDepth(1002);

    // Create graphics object for dynamic elements (units, buildings)
    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setDepth(1003);

    // Flag to track if terrain has been rendered
    this.minimapTerrainCached = false;

    // Initial render
    this.updateMinimap();
  }

  /**
   * Update minimap to show current game state
   */
  updateMinimap() {
    if (!this.minimapGraphics) return;

    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.isometricMap) return;

    const map = gameScene.isometricMap;
    const gridWidth = map.gridWidth;
    const gridHeight = map.gridHeight;

    // Calculate pixel size for each grid tile on minimap
    const pixelSize = this.minimapSize / Math.max(gridWidth, gridHeight);

    // Render static terrain only once (cached)
    if (!this.minimapTerrainCached) {
      this.minimapTerrainGraphics.clear();

      // Render each tile as a colored pixel
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

          // Draw pixel
          this.minimapTerrainGraphics.fillStyle(color, 1);
          this.minimapTerrainGraphics.fillRect(
            this.minimapX + x * pixelSize,
            this.minimapY + y * pixelSize,
            pixelSize + 0.5,  // Slight overlap to avoid gaps
            pixelSize + 0.5
          );
        }
      }

      this.minimapTerrainCached = true;
    }

    // Update dynamic elements (units, buildings) on separate layer
    this.minimapGraphics.clear();

    // Draw buildings (with faction colors)
    if (gameScene.buildings) {
      gameScene.buildings.forEach(building => {
        // Use faction color, slightly brighter for buildings
        const factionColor = FACTION_COLORS[building.faction] || FACTION_COLORS.PLAYER;
        this.minimapGraphics.fillStyle(factionColor, 1);

        const gridPos = { x: Math.floor(building.x / 32), y: Math.floor(building.y / 16) };
        this.minimapGraphics.fillRect(
          this.minimapX + gridPos.x * pixelSize,
          this.minimapY + gridPos.y * pixelSize,
          pixelSize * 2,
          pixelSize * 2
        );
      });
    }

    // Draw units (with faction colors)
    if (gameScene.units && gameScene.units.length < 50) {
      gameScene.units.forEach(unit => {
        // Use faction color for units
        const factionColor = FACTION_COLORS[unit.faction] || FACTION_COLORS.PLAYER;
        this.minimapGraphics.fillStyle(factionColor, 1);

        const gridPos = { x: Math.floor(unit.x / 32), y: Math.floor(unit.y / 16) };
        this.minimapGraphics.fillRect(
          this.minimapX + gridPos.x * pixelSize,
          this.minimapY + gridPos.y * pixelSize,
          pixelSize,
          pixelSize
        );
      });
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
   */
  createBuildingPanel() {
    const panelWidth = 250;
    const panelHeight = 200;
    const panelX = (GAME_CONFIG.WIDTH - 220 - panelWidth) / 2;
    const panelY = GAME_CONFIG.HEIGHT - 120 - panelHeight - 20;

    // Container for all building panel elements
    this.buildingPanelContainer = this.add.container(0, 0);
    this.buildingPanelContainer.setDepth(2000);
    this.buildingPanelContainer.setVisible(false);

    // Background
    const bg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x2a2a2a, 0.95);
    bg.setOrigin(0, 0);
    this.buildingPanelContainer.add(bg);

    // Border
    const border = this.add.rectangle(panelX, panelY, panelWidth, panelHeight);
    border.setOrigin(0, 0);
    border.setStrokeStyle(3, 0x4CAF50);
    this.buildingPanelContainer.add(border);

    // Title
    this.buildingNameText = this.add.text(panelX + 10, panelY + 10, 'Building', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.buildingPanelContainer.add(this.buildingNameText);

    // Status text
    this.buildingStatusText = this.add.text(panelX + 10, panelY + 40, 'Status: Operational', {
      fontSize: '14px',
      fill: '#4CAF50',
      fontFamily: 'Arial'
    });
    this.buildingPanelContainer.add(this.buildingStatusText);

    // Production label
    this.productionLabel = this.add.text(panelX + 10, panelY + 70, 'Train Units:', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.buildingPanelContainer.add(this.productionLabel);

    // Train worker button
    this.trainWorkerButton = this.createProductionButton(
      panelX + 10,
      panelY + 100,
      'Train Worker',
      '50 🌾',
      () => this.trainUnit('worker')
    );
    this.buildingPanelContainer.add(this.trainWorkerButton.bg);
    this.buildingPanelContainer.add(this.trainWorkerButton.icon);
    this.buildingPanelContainer.add(this.trainWorkerButton.label);
    this.buildingPanelContainer.add(this.trainWorkerButton.cost);

    // Train Guard button
    this.trainGuardButton = this.createProductionButton(
      panelX + 10,
      panelY + 100,
      'Train Guard',
      '75 🌾 25 💧 50 🪵 5 🔧',
      () => this.trainUnit('guard')
    );
    this.buildingPanelContainer.add(this.trainGuardButton.bg);
    this.buildingPanelContainer.add(this.trainGuardButton.icon);
    this.buildingPanelContainer.add(this.trainGuardButton.label);
    this.buildingPanelContainer.add(this.trainGuardButton.cost);

    // Train Scout button
    this.trainScoutButton = this.createProductionButton(
      panelX + 10,
      panelY + 155,
      'Train Scout',
      '40 🌾 30 💧 20 🪵 3 🔧',
      () => this.trainUnit('scout')
    );
    this.buildingPanelContainer.add(this.trainScoutButton.bg);
    this.buildingPanelContainer.add(this.trainScoutButton.icon);
    this.buildingPanelContainer.add(this.trainScoutButton.label);
    this.buildingPanelContainer.add(this.trainScoutButton.cost);

    // Close button
    const closeBtn = this.add.text(panelX + panelWidth - 30, panelY + 5, '✕', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hideBuildingPanel());
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff0000'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff'));
    this.buildingPanelContainer.add(closeBtn);
  }

  /**
   * Create a production button
   */
  createProductionButton(x, y, label, cost, onClick) {
    const btnWidth = 230;
    const btnHeight = 45;

    // Create styled button
    const bg = createStyledButton(
      this,
      x + btnWidth / 2,
      y + btnHeight / 2,
      '', // No text, we'll add custom content
      onClick,
      {
        width: btnWidth,
        height: btnHeight,
        cornerRadius: 10,
        fontSize: '14px',
        disabled: false
      }
    );

    // Remove default button text
    if (bg.buttonText) {
      bg.buttonText.destroy();
    }

    // Choose icon based on label
    let iconEmoji = '👷';
    if (label.includes('Guard')) iconEmoji = '🛡️';
    else if (label.includes('Scout')) iconEmoji = '🏹';
    else if (label.includes('Honker')) iconEmoji = '💥';

    const icon = this.add.text(x + 5, y + btnHeight / 2 - 10, iconEmoji, {
      fontSize: '20px'
    });

    const labelText = this.add.text(x + 35, y + 8, label, {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });

    const costText = this.add.text(x + 35, y + 26, cost, {
      fontSize: '11px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });

    return { bg, icon, label: labelText, cost: costText };
  }

  /**
   * Show building panel
   */
  showBuildingPanel(building) {
    this.selectedBuilding = building;
    this.buildingNameText.setText(building.buildingName);

    if (building.state === 'CONSTRUCTION') {
      this.buildingStatusText.setText(`Building ${Math.floor(building.constructionProgress)}%`);
      this.buildingStatusText.setColor('#FFD700');
      this.productionLabel.setVisible(false);
      this.trainWorkerButton.bg.setVisible(false);
      this.trainWorkerButton.icon.setVisible(false);
      this.trainWorkerButton.label.setVisible(false);
      this.trainWorkerButton.cost.setVisible(false);
    } else {
      this.buildingStatusText.setText('Status: Operational');
      this.buildingStatusText.setColor('#4CAF50');

      // Show production UI for buildings with production capability
      if (building.productionQueue && building.canProduce && building.canProduce.length > 0) {
        this.productionLabel.setVisible(true);

        // Show production queue status
        const queueStatus = building.productionQueue.getQueueStatus();
        if (queueStatus.isProducing) {
          const timeLeft = (queueStatus.timeRemaining / 1000).toFixed(1);
          const progressPercent = Math.floor(queueStatus.progress);
          this.productionLabel.setText(`Producing: ${queueStatus.currentUnit} [${progressPercent}%] ${timeLeft}s | Queue: ${queueStatus.queueLength - 1}`);
        } else if (queueStatus.queueLength > 0) {
          this.productionLabel.setText(`Queue: ${queueStatus.queueLength} waiting`);
        } else {
          this.productionLabel.setText('Production: Idle');
        }

        // Show worker button for Coop/NestingBox
        const showWorker = building.canProduce.includes('worker');
        this.trainWorkerButton.bg.setVisible(showWorker);
        this.trainWorkerButton.icon.setVisible(showWorker);
        this.trainWorkerButton.label.setVisible(showWorker);
        this.trainWorkerButton.cost.setVisible(showWorker);

        // Show Guard button for Barracks
        const showGuard = building.canProduce.includes('guard');
        this.trainGuardButton.bg.setVisible(showGuard);
        this.trainGuardButton.icon.setVisible(showGuard);
        this.trainGuardButton.label.setVisible(showGuard);
        this.trainGuardButton.cost.setVisible(showGuard);

        // Show Scout button for Barracks
        const showScout = building.canProduce.includes('scout');
        this.trainScoutButton.bg.setVisible(showScout);
        this.trainScoutButton.icon.setVisible(showScout);
        this.trainScoutButton.label.setVisible(showScout);
        this.trainScoutButton.cost.setVisible(showScout);
      } else {
        this.productionLabel.setVisible(false);
        this.trainWorkerButton.bg.setVisible(false);
        this.trainWorkerButton.icon.setVisible(false);
        this.trainWorkerButton.label.setVisible(false);
        this.trainWorkerButton.cost.setVisible(false);
        this.trainGuardButton.bg.setVisible(false);
        this.trainGuardButton.icon.setVisible(false);
        this.trainGuardButton.label.setVisible(false);
        this.trainGuardButton.cost.setVisible(false);
        this.trainScoutButton.bg.setVisible(false);
        this.trainScoutButton.icon.setVisible(false);
        this.trainScoutButton.label.setVisible(false);
        this.trainScoutButton.cost.setVisible(false);
      }
    }

    this.buildingPanelContainer.setVisible(true);
  }

  /**
   * Hide building panel
   */
  hideBuildingPanel() {
    this.selectedBuilding = null;
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
   * Update resource display
   */
  updateResources(food, water, sticks, tools = 0) {
    this.resources.food = food;
    this.resources.water = water;
    this.resources.sticks = sticks;
    this.resources.tools = tools;

    this.foodText.setText(`🌾 ${food}`);
    this.waterText.setText(`💧 ${water}`);
    this.sticksText.setText(`🪵 ${sticks}`);
    this.toolsText.setText(`🔧 ${tools}`);
  }

  /**
   * Update unit selection info
   */
  updateUnitInfo(selectedUnits) {
    if (selectedUnits.length === 0) {
      this.unitInfoText.setText('No units selected');
      this.selectionCountText.setText('');
    } else if (selectedUnits.length === 1) {
      const unit = selectedUnits[0];
      this.unitInfoText.setText(`${unit.unitType} - HP: ${unit.currentHealth}/${unit.maxHealth}`);
      this.selectionCountText.setText('');
    } else {
      this.unitInfoText.setText('Multiple units selected');
      this.selectionCountText.setText(`${selectedUnits.length} units`);
    }
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
    const btnX = GAME_CONFIG.WIDTH - 240;
    const btnY = GAME_CONFIG.HEIGHT - 140;
    const btnWidth = 100;
    const btnHeight = 30;

    // Button background
    this.debugButton = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0xFF5722, 1);
    this.debugButton.setOrigin(0, 0);
    this.debugButton.setDepth(1001);
    this.debugButton.setInteractive({ useHandCursor: true });

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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Settings button (gear icon in top-right corner)
    const settingsButton = this.add.text(width - 50, 10, '⚙️', {
      fontSize: '32px',
      padding: { x: 10, y: 10 }
    });
    settingsButton.setInteractive({ useHandCursor: true });
    settingsButton.setScrollFactor(0);
    settingsButton.setDepth(1000);

    // Settings panel (hidden by default)
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

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
    settingsButton.on('pointerdown', () => {
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
