// Selection Box - Visual feedback for drag selection

import { COLORS, DEPTH } from '../utils/Constants.js';

export default class SelectionBox {
  constructor(scene, startX, startY) {
    this.scene = scene;
    this.startX = startX;
    this.startY = startY;
    this.endX = startX;
    this.endY = startY;

    // Create graphics for the selection box
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH.UI);
    this.graphics.setScrollFactor(0, 0); // Selection box should be in screen space, not world space

    this.draw();
  }

  /**
   * Update the selection box end position
   */
  update(endX, endY) {
    this.endX = endX;
    this.endY = endY;
    this.draw();
  }

  /**
   * Draw the selection box
   */
  draw() {
    this.graphics.clear();

    // Calculate box dimensions
    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);

    // Draw filled rectangle with more visible transparency
    this.graphics.fillStyle(COLORS.SELECTION, 0.25);
    this.graphics.fillRect(x, y, width, height);

    // Draw border with thicker, more visible line
    this.graphics.lineStyle(3, COLORS.SELECTION, 1.0);
    this.graphics.strokeRect(x, y, width, height);

    // Draw corner indicators
    const cornerSize = 10;
    this.graphics.lineStyle(3, COLORS.SELECTION, 1);

    // Top-left corner
    this.graphics.lineBetween(x, y, x + cornerSize, y);
    this.graphics.lineBetween(x, y, x, y + cornerSize);

    // Top-right corner
    this.graphics.lineBetween(x + width - cornerSize, y, x + width, y);
    this.graphics.lineBetween(x + width, y, x + width, y + cornerSize);

    // Bottom-left corner
    this.graphics.lineBetween(x, y + height - cornerSize, x, y + height);
    this.graphics.lineBetween(x, y + height, x + cornerSize, y + height);

    // Bottom-right corner
    this.graphics.lineBetween(x + width - cornerSize, y + height, x + width, y + height);
    this.graphics.lineBetween(x + width, y + height - cornerSize, x + width, y + height);
  }

  /**
   * Destroy the selection box
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
