// Resource Node - Harvestable resource on the map

import { RESOURCE, DEPTH, COLORS } from '../utils/Constants.js';
import { calculateDepth } from '../utils/IsometricUtils.js';

export default class ResourceNode extends Phaser.GameObjects.Container {
  constructor(scene, x, y, resourceType) {
    super(scene, x, y);

    this.scene = scene;
    this.resourceType = resourceType; // 'food', 'water', 'sticks', 'stone'

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
        // Use wheat spritesheet - 4 frames available (2x2 grid)
        // Pick a random variant at creation (consistent for this node)
        spriteKey = 'wheat';
        this.baseFrame = Math.floor(Math.random() * 4); // 0-3
        frame = this.baseFrame;
        scale = 0.15; // Scale down the larger 400x300 frames
        break;
      case 'water':
        // Create water puddle that shrinks as it's gathered
        // Base size scales with capacity
        this.baseWaterRadius = 25;
        this.minWaterRadius = 8;

        // Create outer puddle (darker edge)
        const waterOuter = this.scene.add.ellipse(0, 2, this.baseWaterRadius * 2, this.baseWaterRadius * 1.2, 0x1565C0, 0.6);
        this.add(waterOuter);
        this.waterOuter = waterOuter;

        // Create main water puddle
        const waterCircle = this.scene.add.ellipse(0, 0, this.baseWaterRadius * 1.8, this.baseWaterRadius * 1.0, 0x42A5F5, 0.8);
        this.add(waterCircle);
        this.resourceSprite = waterCircle;

        // Create water highlight (reflection)
        const waterHighlight = this.scene.add.ellipse(-4, -3, this.baseWaterRadius * 0.6, this.baseWaterRadius * 0.3, 0x90CAF9, 0.5);
        this.add(waterHighlight);
        this.waterHighlight = waterHighlight;

        // Add capacity text (hidden by default, shown on hover)
        this.capacityText = this.scene.add.text(0, 30, `${Math.floor(this.currentCapacity)}/${Math.floor(this.maxCapacity)}`, {
          fontSize: '12px',
          fill: '#ffffff',
          fontFamily: 'Arial',
          stroke: '#000000',
          strokeThickness: 2
        });
        this.capacityText.setOrigin(0.5);
        this.capacityText.setVisible(false);
        this.add(this.capacityText);
        this.setupHoverInteraction();
        return; // Exit early for water

      case 'sticks':
        // Use individual tree images - pick a random tree variant (1-5)
        this.treeVariant = Math.floor(Math.random() * 5) + 1; // 1-5
        spriteKey = `tree${this.treeVariant}`;
        frame = null; // Not using spritesheet frames
        scale = 1.0;
        break;
      case 'stone':
        // Stone deposits - simple visual representation
        const stoneCircle = this.scene.add.circle(0, 0, 22, 0x9E9E9E, 0.8);
        stoneCircle.setStrokeStyle(3, 0x616161, 1);
        this.add(stoneCircle);

        const stoneIcon = this.scene.add.text(0, 0, '🪨', {
          fontSize: '28px'
        });
        stoneIcon.setOrigin(0.5);
        this.add(stoneIcon);
        this.resourceSprite = stoneCircle;
        this.iconSprite = stoneIcon;

        // Add capacity text (hidden by default, shown on hover)
        this.capacityText = this.scene.add.text(0, 32, `${Math.floor(this.currentCapacity)}/${Math.floor(this.maxCapacity)}`, {
          fontSize: '12px',
          fill: '#ffffff',
          fontFamily: 'Arial',
          stroke: '#000000',
          strokeThickness: 2
        });
        this.capacityText.setOrigin(0.5);
        this.capacityText.setVisible(false);
        this.add(this.capacityText);
        this.setupHoverInteraction();
        return; // Exit early for stone
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

    // Create sprite (individual image or spritesheet frame)
    if (frame !== null) {
      this.resourceSprite = this.scene.add.sprite(0, 0, spriteKey, frame);

      // Verify the frame exists
      const texture = this.scene.textures.get(spriteKey);
      const frameData = texture.get(frame);

      if (!frameData || frameData.name === '__BASE') {
        console.error(`ResourceNode: Frame ${frame} not found in texture '${spriteKey}'`);
        this.resourceSprite.setFrame(0);
      }
    } else {
      // Individual image (no frame)
      this.resourceSprite = this.scene.add.sprite(0, 0, spriteKey);
    }

    // Set display size for consistent appearance
    if (this.resourceType === 'food') {
      // For wheat, use fixed display size
      this.resourceSprite.setDisplaySize(48, 60); // Width x Height
      this.resourceSprite.setOrigin(0.5, 0.7); // Slightly adjusted origin
    } else if (this.resourceType === 'sticks') {
      // For trees, use fixed display size (tree frames are 64x112, scale down)
      this.resourceSprite.setDisplaySize(48, 72); // Width x Height - more compact
      this.resourceSprite.setOrigin(0.5, 0.85); // Bottom-center origin
    } else {
      this.resourceSprite.setScale(scale);
      this.resourceSprite.setOrigin(0.5, 0.8); // Bottom-center origin
    }
    this.add(this.resourceSprite);

    // Capacity indicator (hidden by default, shown on hover)
    this.capacityText = this.scene.add.text(0, 30, `${Math.floor(this.currentCapacity)}/${Math.floor(this.maxCapacity)}`, {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.capacityText.setOrigin(0.5);
    this.capacityText.setVisible(false);
    this.add(this.capacityText);
    this.setupHoverInteraction();

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
    // Update capacity text (X/Y format)
    if (this.capacityText) {
      this.capacityText.setText(`${Math.floor(this.currentCapacity)}/${Math.floor(this.maxCapacity)}`);
    }

    // Change appearance based on capacity
    const percentRemaining = this.currentCapacity / this.maxCapacity;

    // Update sprite appearance based on resource type and capacity
    // Use consistent baseFrame - only change alpha to show depletion
    if (this.resourceSprite && this.resourceType === 'food') {
      // Wheat: Keep same frame, just fade when depleting
      // baseFrame was set at creation (0-3)
      this.resourceSprite.setFrame(this.baseFrame || 0);
      if (this.isDepleted) {
        this.resourceSprite.setAlpha(0.3);
      } else if (percentRemaining < 0.5) {
        this.resourceSprite.setAlpha(0.7);
      } else {
        this.resourceSprite.setAlpha(1.0);
      }
    } else if (this.resourceSprite && this.resourceType === 'sticks') {
      // Trees: Show full tree while gathering, swap to stump when depleted
      if (this.isDepleted) {
        // Fully depleted: swap texture to stump
        this.resourceSprite.setTexture('stump');
        this.resourceSprite.setDisplaySize(32, 24);
        this.resourceSprite.setOrigin(0.5, 0.5);
        this.resourceSprite.setAlpha(0.9);
      } else {
        // Tree still has resources - show original tree with fading alpha
        this.resourceSprite.setTexture(`tree${this.treeVariant}`);
        this.resourceSprite.setDisplaySize(48, 72);
        this.resourceSprite.setOrigin(0.5, 0.85);
        // Fade slightly as resources deplete
        this.resourceSprite.setAlpha(0.6 + (percentRemaining * 0.4));
      }
    }

    // Update text color based on capacity (no "Empty" text - just hide when depleted)
    if (this.capacityText) {
      if (this.isDepleted) {
        this.capacityText.setStyle({ fill: '#ff0000' });
      } else if (percentRemaining < 0.25) {
        this.capacityText.setStyle({ fill: '#ffaa00' });
      } else if (percentRemaining < 0.5) {
        this.capacityText.setStyle({ fill: '#ffff00' });
      } else {
        this.capacityText.setStyle({ fill: '#ffffff' });
      }
    }

    // For water resources - shrink puddle as it depletes
    if (this.resourceType === 'water' && this.baseWaterRadius) {
      // Calculate new size based on remaining capacity
      const sizeScale = this.minWaterRadius / this.baseWaterRadius +
        (1 - this.minWaterRadius / this.baseWaterRadius) * percentRemaining;

      // Update main puddle size
      if (this.resourceSprite) {
        this.resourceSprite.setDisplaySize(
          this.baseWaterRadius * 1.8 * sizeScale,
          this.baseWaterRadius * 1.0 * sizeScale
        );
        this.resourceSprite.setAlpha(this.isDepleted ? 0.2 : 0.8);
      }

      // Update outer puddle
      if (this.waterOuter) {
        this.waterOuter.setDisplaySize(
          this.baseWaterRadius * 2 * sizeScale,
          this.baseWaterRadius * 1.2 * sizeScale
        );
        this.waterOuter.setAlpha(this.isDepleted ? 0.1 : 0.6);
      }

      // Update highlight
      if (this.waterHighlight) {
        this.waterHighlight.setDisplaySize(
          this.baseWaterRadius * 0.6 * sizeScale,
          this.baseWaterRadius * 0.3 * sizeScale
        );
        this.waterHighlight.setPosition(-4 * sizeScale, -3 * sizeScale);
        this.waterHighlight.setAlpha(this.isDepleted ? 0 : 0.5);
      }

      // Move capacity text closer as puddle shrinks
      if (this.capacityText) {
        this.capacityText.setPosition(0, 20 + 10 * sizeScale);
      }
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

  /**
   * Setup hover interaction to show/hide capacity text
   */
  setupHoverInteraction() {
    // Make the container interactive
    this.setSize(this.size, this.size);
    this.setInteractive({ useHandCursor: false });

    // Show capacity text on hover
    this.on('pointerover', () => {
      if (this.capacityText) {
        this.capacityText.setVisible(true);
      }
    });

    // Hide capacity text when mouse leaves
    this.on('pointerout', () => {
      if (this.capacityText) {
        this.capacityText.setVisible(false);
      }
    });
  }
}
