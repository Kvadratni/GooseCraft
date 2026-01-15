// Selection Manager - Unit Selection System

import { INPUT, FACTIONS } from '../utils/Constants.js';
import SelectionBox from '../ui/SelectionBox.js';
import { screenToWorld } from '../utils/IsometricUtils.js';

export default class SelectionManager {
  constructor(scene) {
    this.scene = scene;

    // Selected units
    this.selectedUnits = [];

    // Control groups (1-9)
    this.controlGroups = {};

    // Box selection state
    this.isBoxSelecting = false;
    this.boxStartX = 0;
    this.boxStartY = 0;
    this.selectionBox = null;

    // Double-click tracking
    this.lastClickTime = 0;
    this.lastClickedUnit = null;

    // Initialization flag - prevent selection until scene is ready
    this.isReady = false;
    this.scene.time.delayedCall(100, () => {
      this.isReady = true;
      console.log('SelectionManager: Ready for input');
    });

    console.log('SelectionManager: Initialized');
  }

  /**
   * Handle pointer down (start of click or drag)
   */
  handlePointerDown(pointer) {
    if (!pointer || !pointer.leftButtonDown()) {
      return;
    }

    // Safety check: ensure scene and units are ready
    if (!this.isReady || !this.scene || !this.scene.units || !this.scene.buildings) {
      console.warn('SelectionManager: Scene not ready for selection');
      return;
    }

    // Store starting position for box selection
    this.boxStartX = pointer.x;
    this.boxStartY = pointer.y;

    // Check if shift is held
    const shiftKey = this.scene.input.keyboard.addKey('SHIFT', false);
    const shiftHeld = shiftKey && shiftKey.isDown;

    if (!shiftHeld) {
      // Not shift-clicking, will potentially start box selection
      this.isBoxSelecting = false;
    }
  }

  /**
   * Handle pointer move (dragging)
   */
  handlePointerMove(pointer) {
    if (!pointer || !pointer.leftButtonDown()) {
      return;
    }

    // Safety check
    if (!this.isReady || !this.scene || !this.scene.units) {
      return;
    }

    // Calculate drag distance
    const dragDistance = Phaser.Math.Distance.Between(
      this.boxStartX, this.boxStartY,
      pointer.x, pointer.y
    );

    // Start box selection if dragged beyond threshold
    if (dragDistance > INPUT.DRAG_THRESHOLD && !this.isBoxSelecting) {
      this.startBoxSelection();
    }

    // Update box selection
    if (this.isBoxSelecting && this.selectionBox) {
      this.selectionBox.update(pointer.x, pointer.y);
    }
  }

  /**
   * Handle pointer up (end of click or drag)
   */
  handlePointerUp(pointer) {
    if (!pointer || !pointer.leftButtonReleased()) {
      return;
    }

    // Safety check
    if (!this.isReady || !this.scene || !this.scene.units || !this.scene.buildings) {
      console.warn('SelectionManager: Scene not ready for selection');
      return;
    }

    if (this.isBoxSelecting) {
      // Finalize box selection
      this.finalizeBoxSelection(pointer);
    } else {
      // Single click selection
      this.handleSingleClick(pointer);
    }

    // Clean up
    if (this.selectionBox) {
      this.selectionBox.destroy();
      this.selectionBox = null;
    }
    this.isBoxSelecting = false;
  }

  /**
   * Start box selection
   */
  startBoxSelection() {
    this.isBoxSelecting = true;
    this.selectionBox = new SelectionBox(this.scene, this.boxStartX, this.boxStartY);
  }

  /**
   * Finalize box selection
   */
  finalizeBoxSelection(pointer) {
    const camera = this.scene.cameras.main;

    // Convert screen positions to world positions
    const startWorld = screenToWorld(this.boxStartX, this.boxStartY, camera);
    const endWorld = screenToWorld(pointer.x, pointer.y, camera);

    // Create selection rectangle
    const minX = Math.min(startWorld.x, endWorld.x);
    const maxX = Math.max(startWorld.x, endWorld.x);
    const minY = Math.min(startWorld.y, endWorld.y);
    const maxY = Math.max(startWorld.y, endWorld.y);

    // Find units within box (only player faction can be selected)
    const unitsInBox = this.scene.units.filter(unit => {
      return unit.active &&
             unit.faction === FACTIONS.PLAYER &&
             unit.x >= minX && unit.x <= maxX &&
             unit.y >= minY && unit.y <= maxY;
    });

    // Check if shift is held
    const shiftKey = this.scene.input.keyboard.addKey('SHIFT', false);
    const shiftHeld = shiftKey && shiftKey.isDown;

    if (!shiftHeld) {
      // Clear previous selection
      this.clearSelection();
    }

    // Add units to selection
    unitsInBox.forEach(unit => {
      this.addToSelection(unit);
    });

    console.log(`Box selected ${unitsInBox.length} units`);
  }

  /**
   * Handle single click
   */
  handleSingleClick(pointer) {
    const worldPos = screenToWorld(pointer.x, pointer.y, this.scene.cameras.main);
    console.log(`SelectionManager: Click at screen (${pointer.x}, ${pointer.y}) -> world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);

    // Check if shift is held
    const shiftKey = this.scene.input.keyboard.addKey('SHIFT', false);
    const shiftHeld = shiftKey && shiftKey.isDown;

    // Find clicked unit or building
    const clickedUnit = this.findUnitAtPosition(worldPos.x, worldPos.y);
    const clickedBuilding = clickedUnit ? null : this.findBuildingAtPosition(worldPos.x, worldPos.y);

    // Check for double-click
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime < INPUT.DOUBLE_CLICK_THRESHOLD) &&
                          (clickedUnit === this.lastClickedUnit);
    this.lastClickTime = now;
    this.lastClickedUnit = clickedUnit;

    if (isDoubleClick && clickedUnit) {
      // Double-click: select all units of same type on screen
      this.selectAllOfType(clickedUnit.unitType);
      return;
    }

    if (clickedUnit) {
      if (shiftHeld) {
        // Shift-click: toggle unit in selection
        if (this.selectedUnits.includes(clickedUnit)) {
          this.removeFromSelection(clickedUnit);
        } else {
          this.addToSelection(clickedUnit);
        }
      } else {
        // Normal click: select only this unit
        this.clearSelection();
        this.addToSelection(clickedUnit);
      }
    } else if (clickedBuilding) {
      // Buildings can be selected (for info display)
      console.log(`SelectionManager: Clicked building: ${clickedBuilding.buildingName}`);

      // Clear unit selection
      this.clearSelection();

      // Show building UI
      this.showBuildingUI(clickedBuilding);
    } else if (!shiftHeld) {
      // Clicked empty space, clear selection
      this.clearSelection();
      this.hideBuildingUI();
    }
  }

  /**
   * Show building UI
   */
  showBuildingUI(building) {
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.showBuildingPanel) {
      uiScene.showBuildingPanel(building);
    }
  }

  /**
   * Hide building UI
   */
  hideBuildingUI() {
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.hideBuildingPanel) {
      uiScene.hideBuildingPanel();
    }
  }

  /**
   * Find unit at world position (only player faction units)
   */
  findUnitAtPosition(worldX, worldY) {
    const clickRadius = 50; // Larger radius for easier selection

    // Check units from top to bottom (reverse order for proper z-order)
    for (let i = this.scene.units.length - 1; i >= 0; i--) {
      const unit = this.scene.units[i];
      if (!unit.active) continue;

      // Only allow selecting player faction units
      if (unit.faction !== FACTIONS.PLAYER) continue;

      const distance = Phaser.Math.Distance.Between(worldX, worldY, unit.x, unit.y);
      if (distance < clickRadius) {
        console.log(`SelectionManager: Found unit at (${unit.x}, ${unit.y}), distance: ${distance}`);
        return unit;
      }
    }

    return null;
  }

  /**
   * Find building at world position
   */
  findBuildingAtPosition(worldX, worldY) {
    const clickRadius = 80; // Larger radius for buildings

    for (let i = this.scene.buildings.length - 1; i >= 0; i--) {
      const building = this.scene.buildings[i];
      if (!building.active) continue;

      const distance = Phaser.Math.Distance.Between(worldX, worldY, building.x, building.y);
      if (distance < clickRadius) {
        console.log(`SelectionManager: Found building at (${building.x}, ${building.y})`);
        return building;
      }
    }

    return null;
  }

  /**
   * Select all units of a specific type visible on screen (player faction only)
   */
  selectAllOfType(unitType) {
    const camera = this.scene.cameras.main;
    const viewBounds = camera.worldView;

    this.clearSelection();

    this.scene.units.forEach(unit => {
      if (unit.active && unit.faction === FACTIONS.PLAYER && unit.unitType === unitType) {
        // Check if unit is visible
        if (Phaser.Geom.Rectangle.Contains(viewBounds, unit.x, unit.y)) {
          this.addToSelection(unit);
        }
      }
    });

    console.log(`Selected all ${unitType} units: ${this.selectedUnits.length}`);
  }

  /**
   * Add unit to selection
   */
  addToSelection(unit) {
    if (!this.selectedUnits.includes(unit)) {
      this.selectedUnits.push(unit);
      unit.setSelected(true);
      this.updateUI();
    }
  }

  /**
   * Remove unit from selection
   */
  removeFromSelection(unit) {
    const index = this.selectedUnits.indexOf(unit);
    if (index !== -1) {
      this.selectedUnits.splice(index, 1);
      unit.setSelected(false);
      this.updateUI();
    }
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedUnits.forEach(unit => unit.setSelected(false));
    this.selectedUnits = [];
    this.updateUI();
  }

  /**
   * Update UI with current selection
   */
  updateUI() {
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene && uiScene.updateUnitInfo) {
      uiScene.updateUnitInfo(this.selectedUnits);
    }
  }

  /**
   * Save current selection to a control group
   */
  saveControlGroup(groupNumber) {
    if (this.selectedUnits.length > 0) {
      this.controlGroups[groupNumber] = [...this.selectedUnits];
      console.log(`Saved ${this.selectedUnits.length} units to group ${groupNumber}`);
    }
  }

  /**
   * Recall a control group
   */
  recallControlGroup(groupNumber, appendToSelection = false) {
    const group = this.controlGroups[groupNumber];
    if (!group || group.length === 0) {
      return;
    }

    if (!appendToSelection) {
      this.clearSelection();
    }

    // Add units from group to selection (if they still exist)
    group.forEach(unit => {
      if (unit.active && this.scene.units.includes(unit)) {
        this.addToSelection(unit);
      }
    });

    console.log(`Recalled group ${groupNumber}: ${this.selectedUnits.length} units`);
  }

  /**
   * Handle keyboard input for control groups
   */
  handleKeyPress(key) {
    const num = parseInt(key);
    if (isNaN(num) || num < 1 || num > 9) {
      return;
    }

    const ctrlKey = this.scene.input.keyboard.addKey('CTRL', false);
    const ctrlHeld = ctrlKey && ctrlKey.isDown;

    if (ctrlHeld) {
      // Save control group
      this.saveControlGroup(num);
    } else {
      // Recall control group
      this.recallControlGroup(num);
    }
  }

  /**
   * Get selected units
   */
  getSelectedUnits() {
    return [...this.selectedUnits];
  }

  /**
   * Issue move command to all selected units
   */
  issueMoveTo(worldX, worldY) {
    if (this.selectedUnits.length === 0) {
      return;
    }

    this.selectedUnits.forEach(unit => {
      unit.moveTo(worldX, worldY);
    });
  }
}
