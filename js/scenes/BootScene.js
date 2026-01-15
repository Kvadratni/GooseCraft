// Boot Scene - Asset Loading

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this.loadErrors = [];
  }

  preload() {
    // Create loading bar
    this.createLoadingBar();

    // Add error handling for failed asset loads
    this.load.on('loaderror', (file) => {
      console.error(`BootScene: Failed to load ${file.type} - ${file.key} from ${file.url}`);
      this.loadErrors.push({ type: file.type, key: file.key, url: file.url });
    });

    // Load terrain tiles
    this.load.image('ground', 'assets/terrain/ground.png');
    this.load.image('dirt', 'assets/terrain/dirt.png');
    this.load.image('water', 'assets/terrain/water.png');
    this.load.image('sand', 'assets/terrain/sand.png');
    this.load.image('rock', 'assets/terrain/rock.png');
    this.load.image('snow', 'assets/terrain/snow.png');
    this.load.image('ice', 'assets/terrain/ice.png');

    // Load unit sprites
    this.load.image('civilian', 'assets/units/civilian.png');
    this.load.image('builder', 'assets/units/builder.png');
    this.load.image('warrior', 'assets/units/warrior.png');
    this.load.image('archer', 'assets/units/archer.png');
    this.load.image('spy', 'assets/units/spy.png');

    // Load building sprites
    this.load.image('command-center', 'assets/buildings/command-center.png');
    this.load.image('barracks', 'assets/buildings/barracks.png');
    this.load.image('factory', 'assets/buildings/factory.png');
    this.load.image('power-station', 'assets/buildings/power-station.png');
    this.load.image('research', 'assets/buildings/research.png');
    this.load.image('resource-extractor', 'assets/buildings/resource-extractor.png');
    this.load.image('tower', 'assets/buildings/tower.png');
    this.load.image('airstrip', 'assets/buildings/airstrip.png');

    // Load resource sprite sheets
    // Wheat crops: 800x600 sheet, 10 columns x 6 rows = 80x100 per frame
    this.load.spritesheet('wheat', 'assets/resources/wheat.png', {
      frameWidth: 80,
      frameHeight: 100
    });

    // Trees: 448x224 sheet, 7 columns x 2 rows = 64x112 per frame
    this.load.spritesheet('trees', 'assets/resources/trees.png', {
      frameWidth: 64,
      frameHeight: 112
    });

    // Load audio files
    this.load.audio('music-game', 'assets/audio/goosecraftMenu.mp3');
    this.load.audio('music-menu', 'assets/audio/Goosecraft_ Fields of Feathers.mp3');
    this.load.audio('sfx-building-complete', 'assets/audio/building_complete.mp3');
    this.load.audio('sfx-building-progress', 'assets/audio/building-in-progress.mp3');
    this.load.audio('sfx-gather-sticks', 'assets/audio/gather-sticks.mp3');
    this.load.audio('sfx-gather-water', 'assets/audio/gather-water.mp3');
    this.load.audio('sfx-worker-acknowledge', 'assets/audio/worker-on_it.mp3');

    console.log('BootScene: Preloading assets...');
  }

  create() {
    // Check if any assets failed to load
    if (this.loadErrors.length > 0) {
      console.error(`BootScene: ${this.loadErrors.length} asset(s) failed to load`);
      this.displayErrorScreen();
      return;
    }

    console.log('BootScene: Assets loaded successfully, transitioning to MenuScene');

    // Debug: Check if spritesheets loaded correctly
    try {
      const wheatTexture = this.textures.get('wheat');
      const treesTexture = this.textures.get('trees');
      console.log(`BootScene: Wheat texture exists: ${wheatTexture.key}, frame count: ${Object.keys(wheatTexture.frames).length}`);
      console.log(`BootScene: Trees texture exists: ${treesTexture.key}, frame count: ${Object.keys(treesTexture.frames).length}`);
    } catch (error) {
      console.error('BootScene: Error checking texture info:', error);
    }

    // Transition to menu after a brief delay
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  displayErrorScreen() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Error title
    this.add.text(width / 2, height / 2 - 100, 'Asset Loading Failed', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Error message
    const errorMsg = `Failed to load ${this.loadErrors.length} file(s).\nPlease check that all asset files exist.`;
    this.add.text(width / 2, height / 2, errorMsg, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);

    // List failed files
    const failedFiles = this.loadErrors.map(err => `${err.key} (${err.type})`).join('\n');
    this.add.text(width / 2, height / 2 + 100, failedFiles, {
      fontSize: '16px',
      fill: '#ffaaaa',
      fontFamily: 'monospace',
      align: 'center'
    }).setOrigin(0.5);
  }

  createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title text
    const titleText = this.add.text(width / 2, height / 2 - 100, 'GooseCraft', {
      fontSize: '64px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    titleText.setOrigin(0.5);

    // Loading text
    const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    });
    loadingText.setOrigin(0.5);

    // Progress bar background
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 0.8);
    progressBarBg.fillRect(width / 2 - 200, height / 2 + 50, 400, 30);

    // Progress bar fill
    const progressBar = this.add.graphics();

    // Update progress bar as files load
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x4CAF50, 1);
      progressBar.fillRect(width / 2 - 195, height / 2 + 55, 390 * value, 20);
    });

    // Clean up when loading is complete
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });
  }
}
