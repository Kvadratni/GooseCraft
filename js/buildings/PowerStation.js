// PowerStation - Advanced energy facility with passive bonuses and aura effects

import Building from '../entities/Building.js';
import { BUILDING, FACTION_COLORS } from '../utils/Constants.js';

export default class PowerStation extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.POWER_STATION;

    const buildingConfig = {
      type: 'POWER_STATION',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'power-station',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Resource generation timer
    this.generateTimer = 0;
    this.generateInterval = 10000; // Generate resources every 10 seconds
    this.baseGenerateInterval = 10000;

    // Passive tool generation amount
    this.toolsPerCycle = 1;

    // Power aura effect
    this.auraRange = 200; // Pixels
    this.baseAuraRange = 200;
    this.auraGraphics = null;
    this.auraAlpha = 0;
    this.auraDirection = 1;

    // Upgrades
    this.upgrades = {
      EFFICIENT_CONVERSION: {
        name: 'Efficient Conversion',
        description: 'Generate 2 tools per cycle instead of 1',
        cost: { food: 75, water: 75, sticks: 200, tools: 10 },
        purchased: false
      },
      POWER_SURGE: {
        name: 'Power Surge',
        description: 'Nearby buildings produce 20% faster',
        cost: { food: 100, water: 100, sticks: 300, tools: 15 },
        purchased: false
      }
    };

    console.log(`PowerStation: Created at (${x}, ${y})`);
  }

  /**
   * Update building (called every frame)
   */
  update(time, delta) {
    super.update(time, delta);

    // Only generate when operational
    if (this.state !== 'OPERATIONAL') {
      return;
    }

    // Passive resource generation
    this.generateTimer += delta;

    if (this.generateTimer >= this.generateInterval) {
      this.generateTimer = 0;
      this.generateResources();
    }

    // Update aura animation
    this.updateAura(delta);

    // Apply power surge aura to nearby buildings
    if (this.upgrades.POWER_SURGE.purchased) {
      this.applyPowerSurgeAura();
    }
  }

  /**
   * Generate passive resources
   */
  generateResources() {
    if (this.faction !== 'PLAYER') {
      // AI Power Station
      if (this.scene.aiManager) {
        this.scene.aiManager.resources.tools += this.toolsPerCycle;
        console.log(`AI PowerStation: Generated ${this.toolsPerCycle} tool(s)`);
      }
      return;
    }

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return;

    // Power Station generates tools passively
    resourceManager.addResources('tools', this.toolsPerCycle);

    console.log(`PowerStation: Generated ${this.toolsPerCycle} tool(s) from energy conversion`);
  }

  /**
   * Update the visual aura effect
   */
  updateAura(delta) {
    if (!this.auraGraphics) {
      this.auraGraphics = this.scene.add.graphics();
      this.auraGraphics.setDepth(this.depth - 1);
    }

    // Pulsing animation
    this.auraAlpha += this.auraDirection * delta * 0.001;
    if (this.auraAlpha >= 0.3) {
      this.auraAlpha = 0.3;
      this.auraDirection = -1;
    } else if (this.auraAlpha <= 0.1) {
      this.auraAlpha = 0.1;
      this.auraDirection = 1;
    }

    // Draw aura circle
    this.auraGraphics.clear();
    const auraColor = FACTION_COLORS[this.faction] || 0xFFFF00;
    this.auraGraphics.lineStyle(2, auraColor, this.auraAlpha * 2);
    this.auraGraphics.strokeCircle(this.x, this.y, this.auraRange);
    this.auraGraphics.fillStyle(auraColor, this.auraAlpha * 0.3);
    this.auraGraphics.fillCircle(this.x, this.y, this.auraRange);
  }

  /**
   * Apply power surge bonus to nearby buildings
   */
  applyPowerSurgeAura() {
    if (!this.scene.buildings) return;

    this.scene.buildings.forEach(building => {
      if (building === this) return;
      if (building.faction !== this.faction) return;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, building.x, building.y);
      if (dist <= this.auraRange) {
        // Mark building as power-boosted (for production speed calculations)
        building.powerBoosted = true;
      }
    });
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeKey) {
    if (this.faction !== 'PLAYER') return false;

    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade || upgrade.purchased) return false;

    const resourceManager = this.scene.resourceManager;
    if (!resourceManager.canAfford(upgrade.cost)) {
      console.log(`PowerStation: Cannot afford ${upgrade.name}`);
      return false;
    }

    resourceManager.spend(upgrade.cost);
    upgrade.purchased = true;
    console.log(`PowerStation: Purchased ${upgrade.name}!`);

    // Apply upgrade effect
    this.applyUpgrade(upgradeKey);
    return true;
  }

  /**
   * Apply upgrade effects
   */
  applyUpgrade(upgradeKey) {
    switch (upgradeKey) {
      case 'EFFICIENT_CONVERSION':
        this.toolsPerCycle = 2;
        console.log('PowerStation: Efficient Conversion - now generates 2 tools per cycle');
        break;
      case 'POWER_SURGE':
        this.auraRange = Math.floor(this.baseAuraRange * 1.5);
        console.log(`PowerStation: Power Surge - nearby buildings produce 20% faster (range: ${this.auraRange}px)`);
        break;
    }
  }

  /**
   * Get upgrade status for UI
   */
  getUpgradeStatus() {
    return {
      upgrades: this.upgrades,
      toolsPerCycle: this.toolsPerCycle,
      generateInterval: this.generateInterval,
      auraRange: this.auraRange
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('PowerStation: Energy facility operational - generating passive tool production');
    this.applyResearchBonuses();
  }

  /**
   * Get status text for UI
   */
  getStatusText() {
    return `Generating ${this.toolsPerCycle} tool/${this.generateInterval / 1000}s`;
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.auraGraphics) {
      this.auraGraphics.destroy();
    }
    super.destroy();
  }
}
