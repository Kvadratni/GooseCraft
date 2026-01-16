// ResearchCenter - Research upgrades and unlocks

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class ResearchCenter extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.RESEARCH_CENTER;

    const buildingConfig = {
      type: 'RESEARCH_CENTER',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'research',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Available research upgrades
    this.upgrades = {
      // Auto-complete upgrades
      SPY_TRAINING: {
        name: 'Spy Training',
        description: 'Unlocks Spy units at Barracks',
        cost: { food: 0, water: 0, sticks: 0, tools: 0 },
        researchTime: 0,
        researched: false,
        autoComplete: true
      },
      // Economy upgrades
      EFFICIENT_TOOLS: {
        name: 'Efficient Tools',
        description: 'Reduces tool cost from 5 to 3 sticks',
        cost: { food: 50, water: 50, sticks: 100, tools: 5 },
        researchTime: 15000,
        researched: false,
        autoComplete: false,
        category: 'economy'
      },
      AUTO_PRODUCTION: {
        name: 'Auto Production',
        description: 'Factory automatically produces tools',
        cost: { food: 100, water: 100, sticks: 150, tools: 10 },
        researchTime: 20000,
        researched: false,
        autoComplete: false,
        category: 'economy'
      },
      ADVANCED_SHELVING: {
        name: 'Advanced Shelving',
        description: 'Resource Storage provides 50% more capacity',
        cost: { food: 75, water: 75, sticks: 200, tools: 8 },
        researchTime: 18000,
        researched: false,
        autoComplete: false,
        category: 'economy'
      },
      EFFICIENT_GATHERING: {
        name: 'Efficient Gathering',
        description: 'Workers gather 50% more resources per trip',
        cost: { food: 50, water: 100, sticks: 60, tools: 5 },
        researchTime: 16000,
        researched: false,
        autoComplete: false,
        category: 'economy'
      },
      // Unit upgrades
      SWIFT_FEET: {
        name: 'Swift Feet',
        description: 'All units move 25% faster',
        cost: { food: 60, water: 80, sticks: 50, tools: 6 },
        researchTime: 14000,
        researched: false,
        autoComplete: false,
        category: 'units'
      },
      EAGLE_EYES: {
        name: 'Eagle Eyes',
        description: 'All units have +3 vision range',
        cost: { food: 40, water: 60, sticks: 80, tools: 4 },
        researchTime: 12000,
        researched: false,
        autoComplete: false,
        category: 'units'
      },
      THICK_FEATHERS: {
        name: 'Thick Feathers',
        description: 'All units gain +20% max HP',
        cost: { food: 100, water: 50, sticks: 150, tools: 10 },
        researchTime: 20000,
        researched: false,
        autoComplete: false,
        category: 'units'
      },
      // Building upgrades
      QUICK_BUILD: {
        name: 'Quick Build',
        description: 'Buildings construct 30% faster',
        cost: { food: 80, water: 80, sticks: 120, tools: 8 },
        researchTime: 15000,
        researched: false,
        autoComplete: false,
        category: 'buildings'
      },
      FORTIFIED_WALLS: {
        name: 'Fortified Walls',
        description: 'All buildings have +50% HP',
        cost: { food: 60, water: 40, sticks: 200, tools: 15 },
        researchTime: 18000,
        researched: false,
        autoComplete: false,
        category: 'buildings'
      }
    };

    // Current research
    this.currentResearch = null;
    this.researchProgress = 0;

    // For UI
    this.canProduce = ['research'];

    console.log(`ResearchCenter: Created at (${x}, ${y})`);
  }

  /**
   * Override update to process research
   */
  update(time, delta) {
    super.update(time, delta);

    if (this.state === 'OPERATIONAL') {
      this.updateResearch(delta);
    }
  }

  /**
   * Start researching an upgrade
   */
  startResearch(upgradeKey) {
    if (this.faction !== 'PLAYER') return false;

    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade) {
      console.log(`ResearchCenter: Unknown upgrade ${upgradeKey}`);
      return false;
    }

    if (upgrade.researched) {
      console.log(`ResearchCenter: ${upgrade.name} already researched`);
      return false;
    }

    if (this.currentResearch) {
      console.log('ResearchCenter: Already researching something');
      return false;
    }

    // Check resources
    const resourceManager = this.scene.resourceManager;
    if (!resourceManager.canAfford(upgrade.cost)) {
      console.log(`ResearchCenter: Cannot afford ${upgrade.name}`);
      return false;
    }

    // Spend resources
    resourceManager.spend(upgrade.cost);

    // Start research
    this.currentResearch = upgradeKey;
    this.researchProgress = 0;
    console.log(`ResearchCenter: Started researching ${upgrade.name}`);

    return true;
  }

  /**
   * Update research progress
   */
  updateResearch(delta) {
    if (!this.currentResearch) return;

    const upgrade = this.upgrades[this.currentResearch];
    this.researchProgress += delta;

    if (this.researchProgress >= upgrade.researchTime) {
      this.completeResearch(this.currentResearch);
    }
  }

  /**
   * Complete research and apply effects
   */
  completeResearch(upgradeKey) {
    const upgrade = this.upgrades[upgradeKey];
    upgrade.researched = true;
    this.currentResearch = null;
    this.researchProgress = 0;

    console.log(`ResearchCenter: Completed ${upgrade.name}!`);

    // Initialize research upgrades storage if needed
    if (!this.scene.researchUpgrades) {
      this.scene.researchUpgrades = {};
    }

    // Apply upgrade effects
    switch (upgradeKey) {
      case 'SPY_TRAINING':
        this.unlockSpyAtBarracks();
        break;
      case 'EFFICIENT_TOOLS':
        this.applyEfficientTools();
        break;
      case 'AUTO_PRODUCTION':
        this.applyAutoProduction();
        break;
      case 'ADVANCED_SHELVING':
        this.applyAdvancedShelving();
        break;
      case 'EFFICIENT_GATHERING':
        this.applyEfficientGathering();
        break;
      case 'SWIFT_FEET':
        this.applySwiftFeet();
        break;
      case 'EAGLE_EYES':
        this.applyEagleEyes();
        break;
      case 'THICK_FEATHERS':
        this.applyThickFeathers();
        break;
      case 'QUICK_BUILD':
        this.applyQuickBuild();
        break;
      case 'FORTIFIED_WALLS':
        this.applyFortifiedWalls();
        break;
    }
  }

  // ========== Upgrade Effect Methods ==========

  unlockSpyAtBarracks() {
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.buildingType === 'BARRACKS' && building.faction === this.faction) {
          building.unlockSpy();
        }
      });
    }
  }

  applyEfficientTools() {
    this.scene.researchUpgrades.efficientTools = true;
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.buildingType === 'FACTORY' && building.faction === this.faction) {
          building.reduceCost(3);
        }
      });
    }
  }

  applyAutoProduction() {
    this.scene.researchUpgrades.autoProduction = true;
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.buildingType === 'FACTORY' && building.faction === this.faction) {
          building.enableAutoProduction();
        }
      });
    }
  }

  applyAdvancedShelving() {
    this.scene.researchUpgrades.advancedShelving = true;
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.buildingType === 'RESOURCE_STORAGE' && building.faction === this.faction) {
          building.applyShelvingBonus();
        }
      });
    }
  }

  applyEfficientGathering() {
    this.scene.researchUpgrades.efficientGathering = true;
    // Apply to all existing workers
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (unit.unitType === 'worker' && unit.faction === this.faction) {
          unit.applyGatheringBonus(1.5); // 50% more
        }
      });
    }
    console.log('ResearchCenter: Efficient Gathering applied - workers gather 50% more');
  }

  applySwiftFeet() {
    this.scene.researchUpgrades.swiftFeet = true;
    // Apply to all existing units
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (unit.faction === this.faction) {
          unit.applySpeedBonus(1.25); // 25% faster
        }
      });
    }
    console.log('ResearchCenter: Swift Feet applied - all units 25% faster');
  }

  applyEagleEyes() {
    this.scene.researchUpgrades.eagleEyes = true;
    // Apply to all existing units
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (unit.faction === this.faction) {
          unit.applyVisionBonus(3); // +3 vision
        }
      });
    }
    console.log('ResearchCenter: Eagle Eyes applied - all units +3 vision range');
  }

  applyThickFeathers() {
    this.scene.researchUpgrades.thickFeathers = true;
    // Apply to all existing units
    if (this.scene.units) {
      this.scene.units.forEach(unit => {
        if (unit.faction === this.faction) {
          unit.applyHealthBonus(1.2); // 20% more HP
        }
      });
    }
    console.log('ResearchCenter: Thick Feathers applied - all units +20% HP');
  }

  applyQuickBuild() {
    this.scene.researchUpgrades.quickBuild = true;
    // Apply to buildings under construction
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.faction === this.faction && building.state === 'CONSTRUCTION') {
          building.applyConstructionSpeedBonus(1.3); // 30% faster
        }
      });
    }
    console.log('ResearchCenter: Quick Build applied - buildings construct 30% faster');
  }

  applyFortifiedWalls() {
    this.scene.researchUpgrades.fortifiedWalls = true;
    // Apply to all existing buildings
    if (this.scene.buildings) {
      this.scene.buildings.forEach(building => {
        if (building.faction === this.faction) {
          building.applyHealthBonus(1.5); // 50% more HP
        }
      });
    }
    console.log('ResearchCenter: Fortified Walls applied - all buildings +50% HP');
  }

  // ========== UI Methods ==========

  /**
   * Get available upgrades for UI (grouped by category)
   */
  getAvailableUpgrades() {
    const available = [];
    for (const [key, upgrade] of Object.entries(this.upgrades)) {
      if (!upgrade.researched && !upgrade.autoComplete) {
        available.push({
          key,
          ...upgrade
        });
      }
    }
    return available;
  }

  /**
   * Get upgrades by category
   */
  getUpgradesByCategory(category) {
    const upgrades = [];
    for (const [key, upgrade] of Object.entries(this.upgrades)) {
      if (upgrade.category === category && !upgrade.autoComplete) {
        upgrades.push({
          key,
          ...upgrade
        });
      }
    }
    return upgrades;
  }

  /**
   * Get research status for UI
   */
  getResearchStatus() {
    if (!this.currentResearch) {
      return {
        isResearching: false,
        upgrades: this.upgrades
      };
    }

    const upgrade = this.upgrades[this.currentResearch];
    const progressPercent = (this.researchProgress / upgrade.researchTime) * 100;

    return {
      isResearching: true,
      currentResearch: this.currentResearch,
      upgradeName: upgrade.name,
      progress: progressPercent,
      timeRemaining: upgrade.researchTime - this.researchProgress,
      upgrades: this.upgrades
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('ResearchCenter: Research facility operational');
    this.completeResearch('SPY_TRAINING');
  }
}
