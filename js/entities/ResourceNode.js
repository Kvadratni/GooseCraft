// Resource Node - Harvestable resource on the map

import { RESOURCE, DEPTH, COLORS } from '../utils/Constants.js';
import { calculateDepth } from '../utils/IsometricUtils.js';

export default class ResourceNode extends Phaser.GameObjects.Container {
  constructor(scene, x, y, resourceType) {
    super(scene, x, y);

    this.scene = scene;
    this.resourceType = resourceType; // 'food', 'water', 'sticks'

    // Resource configuration
    const config = RESOURCE[resourceType.toUpperCase()];
    this.maxCapacity = config.capacity;

    // Randomize capacity for variety (80-120% of base capacity)
    // For sticks, this gives 24-36 sticks per tree with base capacity of 30
    const capacityVariation = 0.8 + Math.random() * 0.4;
    this.currentCapacity = Math.floor(this.maxCapacity * capacityVariation);

    this.gatherRate = config.gatherRate;
    this.regenerateRate = config.regenerateRate;

    // Visual properties
    this.size = 40; // Increased for sprite-based resources
    this.isDepleted = false;

    // Assigned workers
    this.assignedWorkers = [];

    // Create visual representation
    this.createSprite();

    // Add to scene
    scene.add.existing(this);

    // Set depth for resource layer (should be above terrain)
    const depth = DEPTH.RESOURCES + calculateDepth(x, y, 0);
    this.setDepth(depth);

    console.log(`ResourceNode: Created ${resourceType} at (${x}, ${y}), depth: ${depth}`);
  }

  /**
   * Create sprite for resource node
   */
  createSprite() {
    let spriteKey;
    let frame;
    let scale = 1.0; // Default scale (increased from 0.6)

    switch (this.resourceType) {
      case 'food':
        // Use wheat spritesheet - frame 0 for consistency
        spriteKey = 'wheat';
        frame = 0; // Use first frame to avoid frame issues
        scale = 0.6; // Smaller scale to fit better
        break;
      case 'water':
        // Keep water as simple visual (no spritesheet)
        const waterCircle = this.scene.add.circle(0, 0, 20, 0x42A5F5, 0.7);
        waterCircle.setStrokeStyle(2, 0x1976D2, 1);
        this.add(waterCircle);

        const waterIcon = this.scene.add.text(0, 0, '💧', {
          fontSize: '24px'
        });
        waterIcon.setOrigin(0.5);
        this.add(waterIcon);
        this.resourceSprite = waterCircle;
        this.iconSprite = waterIcon;

        // Add capacity text
        this.capacityText = this.scene.add.text(0, 30, `${Math.floor(this.currentCapacity)}`, {
          fontSize: '12px',
          fill: '#ffffff',
          fontFamily: 'Arial',
          stroke: '#000000',
          strokeThickness: 2
        });
        this.capacityText.setOrigin(0.5);
        this.add(this.capacityText);
        return; // Exit early for water

      case 'sticks':
        // Use tree spritesheet - frame 0 shows a full tree
        spriteKey = 'trees';
        frame = 0; // First tree variant
        scale = 1.0; // Increased from 0.7 for better visibility
        break;
      default:
        console.warn(`Unknown resource type: ${this.resourceType}`);
        return;
    }

    // Verify texture exists
    if (!this.scene.textures.exists(spriteKey)) {
      console.error(`ResourceNode: Texture '${spriteKey}' not found!`);
      // Fallback: create a colored circle
      this.resourceSprite = this.scene.add.circle(0, 0, 20, 0xFFD700, 1);
      this.add(this.resourceSprite);
      return;
    }

    // Create sprite from spritesheet
    this.resourceSprite = this.scene.add.sprite(0, 0, spriteKey, frame);

    // Verify the frame exists
    const texture = this.scene.textures.get(spriteKey);
    const frameData = texture.get(frame);

    if (!frameData || frameData.name === '__BASE') {
      console.error(`ResourceNode: Frame ${frame} not found in texture '${spriteKey}'`);
      console.log(`ResourceNode: Total frames in spritesheet:`, texture.frameTotal);
      console.log(`ResourceNode: First few frame names:`, Object.keys(texture.frames).slice(0, 10));

      // Use frame 0 as fallback
      this.resourceSprite.setFrame(0);
    }

    // Set display size for consistent appearance
    if (this.resourceType === 'food') {
      // For wheat, use fixed display size
      this.resourceSprite.setDisplaySize(48, 60); // Width x Height
      this.resourceSprite.setOrigin(0.5, 0.7); // Slightly adjusted origin
    } else {
      this.resourceSprite.setScale(scale);
      this.resourceSprite.setOrigin(0.5, 0.8); // Bottom-center origin
    }
    this.add(this.resourceSprite);

    // Capacity indicator
    this.capacityText = this.scene.add.text(0, 30, `${Math.floor(this.currentCapacity)}`, {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.capacityText.setOrigin(0.5);
    this.add(this.capacityText);

    console.log(`ResourceNode: Created ${this.resourceType} sprite with key: ${spriteKey}, frame: ${frame}`);
    console.log(`ResourceNode: Sprite properties - visible: ${this.resourceSprite.visible}, alpha: ${this.resourceSprite.alpha}, scale: ${scale}`);
    console.log(`ResourceNode: Sprite dimensions: ${this.resourceSprite.width}x${this.resourceSprite.height}, position: (${this.x}, ${this.y})`);
    console.log(`ResourceNode: Container children count: ${this.list.length}`);
  }

  /**
   * Update resource node each frame
   */
  update(time, delta) {
    // Regenerate resources over time if configured
    if (this.regenerateRate > 0 && this.currentCapacity < this.maxCapacity) {
      const regenAmount = this.regenerateRate * (delta / 1000);
      this.currentCapacity = Math.min(this.currentCapacity + regenAmount, this.maxCapacity);
      this.updateVisual();
    }

    // Update depth
    const depth = calculateDepth(this.x, this.y, 0);
    this.setDepth(DEPTH.RESOURCES + depth);
  }

  /**
   * Attempt to gather resources from this node
   */
  gather(amount) {
    if (this.isDepleted) {
      return 0;
    }

    const amountGathered = Math.min(amount, this.currentCapacity);
    this.currentCapacity -= amountGathered;

    if (this.currentCapacity <= 0) {
      this.currentCapacity = 0;
      this.isDepleted = true;
    }

    this.updateVisual();

    console.log(`ResourceNode: Gathered ${amountGathered} ${this.resourceType}, remaining: ${this.currentCapacity}`);

    return amountGathered;
  }

  /**
   * Update visual based on current capacity
   */
  updateVisual() {
    // Update capacity text
    if (this.capacityText) {
      this.capacityText.setText(`${Math.floor(this.currentCapacity)}`);
    }

    // Change appearance based on capacity
    const percentRemaining = this.currentCapacity / this.maxCapacity;

    // Update sprite frame based on resource type and capacity
    if (this.resourceSprite && this.resourceType === 'food') {
      // Wheat: Show different growth stages based on capacity
      // Frames 0-59 available, use mature frames 20-30 for full, 10-20 for medium, 0-10 for low
      let frame;
      if (this.isDepleted) {
        frame = 0; // Empty/harvested
      } else if (percentRemaining < 0.25) {
        frame = 5; // Early growth
      } else if (percentRemaining < 0.5) {
        frame = 15; // Mid growth
      } else if (percentRemaining < 0.75) {
        frame = 25; // Nearly mature
      } else {
        frame = 30; // Fully mature
      }
      this.resourceSprite.setFrame(frame);
      this.resourceSprite.setAlpha(this.isDepleted ? 0.4 : 1.0);
    } else if (this.resourceSprite && this.resourceType === 'sticks') {
      // Trees: Show different tree types or states
      // Frames 0-13 available (7 cols x 2 rows)
      let frame;
      if (this.isDepleted) {
        frame = 13; // Use last frame as stump/depleted
      } else if (percentRemaining < 0.33) {
        frame = Math.floor(Math.random() * 2) + 5; // Damaged trees
      } else if (percentRemaining < 0.66) {
        frame = Math.floor(Math.random() * 2) + 2; // Medium trees
      } else {
        frame = Math.floor(Math.random() * 2); // Full trees
      }
      this.resourceSprite.setFrame(frame);
      this.resourceSprite.setAlpha(this.isDepleted ? 0.5 : 1.0);
    }

    // Update text color based on capacity
    if (this.capacityText) {
      if (this.isDepleted) {
        this.capacityText.setText('Empty');
        this.capacityText.setStyle({ fill: '#ff0000' });
      } else if (percentRemaining < 0.25) {
        this.capacityText.setStyle({ fill: '#ffaa00' });
      } else if (percentRemaining < 0.5) {
        this.capacityText.setStyle({ fill: '#ffff00' });
      } else {
        this.capacityText.setStyle({ fill: '#ffffff' });
      }
    }

    // For water resources (icon-based)
    if (this.iconSprite) {
      this.iconSprite.setAlpha(this.isDepleted ? 0.3 : (percentRemaining < 0.5 ? 0.7 : 1.0));
    }
  }

  /**
   * Assign a worker to this resource node
   */
  assignWorker(worker) {
    if (!this.assignedWorkers.includes(worker)) {
      this.assignedWorkers.push(worker);
    }
  }

  /**
   * Remove worker assignment
   */
  removeWorker(worker) {
    const index = this.assignedWorkers.indexOf(worker);
    if (index !== -1) {
      this.assignedWorkers.splice(index, 1);
    }
  }

  /**
   * Check if node has resources
   */
  hasResources() {
    return !this.isDepleted && this.currentCapacity > 0;
  }

  /**
   * Get resource type
   */
  getResourceType() {
    return this.resourceType;
  }

  /**
   * Get current capacity
   */
  getCapacity() {
    return this.currentCapacity;
  }
}
