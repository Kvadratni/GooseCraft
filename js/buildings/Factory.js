// Factory - Tool Production Building (Resource Conversion)

import Building from '../entities/Building.js';
import { BUILDING } from '../utils/Constants.js';

export default class Factory extends Building {
  constructor(scene, x, y, faction) {
    const config = BUILDING.FACTORY;

    const buildingConfig = {
      type: 'FACTORY',
      name: config.name,
      health: config.health,
      constructionTime: config.constructionTime,
      footprint: config.footprint,
      spriteKey: 'factory',
      size: Math.max(config.width, config.height)
    };

    super(scene, x, y, buildingConfig, faction);

    // Resource conversion settings
    this.conversionRecipe = {
      input: 'sticks',
      inputAmount: 10,
      output: 'tools',
      outputAmount: 1,
      time: 5000 // 5 seconds
    };

    this.conversionProgress = 0;
    this.isConverting = false;
    this.canProduce = ['tools']; // For UI display
  }

  /**
   * Override update to process conversion
   */
  update(time, delta) {
    super.update(time, delta);

    // Process resource conversion if operational
    if (this.state === 'OPERATIONAL') {
      this.updateConversion(delta);
    }
  }

  /**
   * Update resource conversion
   */
  updateConversion(delta) {
    // Check if we have resources to convert
    const resourceManager = this.scene.resourceManager;
    if (!resourceManager) return;

    // Check faction - only convert for player faction (AI has separate resources)
    if (this.faction !== 'PLAYER') return;

    // If not converting, check if we can start
    if (!this.isConverting) {
      if (resourceManager.resources[this.conversionRecipe.input] >= this.conversionRecipe.inputAmount) {
        // Start conversion
        this.isConverting = true;
        this.conversionProgress = 0;
        resourceManager.removeResources(this.conversionRecipe.input, this.conversionRecipe.inputAmount);
        console.log(`Factory: Started converting ${this.conversionRecipe.inputAmount} ${this.conversionRecipe.input} to ${this.conversionRecipe.outputAmount} ${this.conversionRecipe.output}`);
      }
      return;
    }

    // Update conversion progress
    this.conversionProgress += delta;

    // Check if conversion complete
    if (this.conversionProgress >= this.conversionRecipe.time) {
      // Add output resources
      resourceManager.addResources(this.conversionRecipe.output, this.conversionRecipe.outputAmount);
      console.log(`Factory: Conversion complete! Produced ${this.conversionRecipe.outputAmount} ${this.conversionRecipe.output}`);

      // Reset for next conversion
      this.isConverting = false;
      this.conversionProgress = 0;
    }
  }

  /**
   * Get conversion status for UI
   */
  getConversionStatus() {
    if (!this.isConverting) {
      return {
        isConverting: false,
        recipe: this.conversionRecipe
      };
    }

    const progressPercent = (this.conversionProgress / this.conversionRecipe.time) * 100;
    const timeRemaining = this.conversionRecipe.time - this.conversionProgress;

    return {
      isConverting: true,
      recipe: this.conversionRecipe,
      progress: progressPercent,
      timeRemaining: timeRemaining
    };
  }

  /**
   * Override construction complete
   */
  onConstructionComplete() {
    console.log('Factory: Tool production facility operational - converts sticks to tools');
  }
}
