// Game Configuration Constants

export const GAME_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND_COLOR: '#2d2d2d'
};

// Isometric Tile Configuration
export const TILE = {
  WIDTH: 64,
  HEIGHT: 32,
  WIDTH_HALF: 32,
  HEIGHT_HALF: 16,
  HEIGHT_Z: 16 // Pixels to offset per elevation level
};

// Map Configuration
export const MAP = {
  GRID_WIDTH: 250,  // 5x larger (50 * 5)
  GRID_HEIGHT: 250,  // 5x larger (50 * 5)
  WORLD_WIDTH: 16000,  // 5x larger (3200 * 5)
  WORLD_HEIGHT: 8000   // 5x larger (1600 * 5)
};

// Camera Configuration
export const CAMERA = {
  PAN_SPEED: 400,
  EDGE_SCROLL_MARGIN: 50,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 1.5,
  ZOOM_STEP: 0.25,
  ZOOM_DEFAULT: 1.0
};

// Unit Configuration
export const UNIT = {
  SPEED_WORKER: 100,    // pixels per second
  SPEED_GUARD: 90,
  SPEED_SCOUT: 150,
  SPEED_SPY: 120,       // Fast and stealthy
  SPEED_HONKER: 80,
  VISION_RANGE: 5,      // tiles
  HEALTH_MAX: 100,
  GATHER_DURATION: 3000,  // milliseconds
  INVENTORY_MAX: 20       // resources per trip
};

// Building Configuration
export const BUILDING = {
  COOP: {
    name: 'Coop',
    displayName: 'Coop',
    width: 192,
    height: 192,
    footprint: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], // 3x3
    health: 500,
    cost: { food: 0, water: 0, sticks: 0, tools: 0 }, // Starting building
    constructionTime: 0,
    tier: 0,
    buildable: false,  // Can't build more Coops
    description: 'Your main base and command center. Workers deposit gathered resources here. Can train new worker geese to expand your colony.'
  },
  RESOURCE_STORAGE: {
    name: 'ResourceStorage',
    displayName: 'Resource Storage',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 200,
    cost: { food: 50, water: 0, sticks: 100, tools: 0 },
    constructionTime: 10000,
    tier: 1,
    buildable: true,
    description: 'Increases your storage capacity for all resources. Build this first to stockpile resources and unlock advanced buildings. Essential for economic expansion.'
  },
  FACTORY: {
    name: 'Factory',
    displayName: 'Factory',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 300,
    cost: { food: 100, water: 50, sticks: 150, tools: 0 },
    constructionTime: 20000,
    tier: 2,
    buildable: true,
    unlockCondition: { building: 'ResourceStorage', count: 1 },
    description: 'Industrial production facility. Converts sticks into tools, which are required for advanced buildings. Unlocks Tier 3 buildings (Barracks, Watchtower, Research Center).'
  },
  RESEARCH_CENTER: {
    name: 'ResearchCenter',
    displayName: 'Research Center',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 250,
    cost: { food: 75, water: 100, sticks: 150, stone: 100, tools: 20 },
    constructionTime: 18000,
    tier: 3,
    buildable: true,
    unlockCondition: { building: 'Factory', count: 1 },
    description: 'Advanced research facility. Unlocks Spy units at the Barracks for reconnaissance and sabotage. Essential for intelligence gathering against enemies.'
  },
  BARRACKS: {
    name: 'Barracks',
    displayName: 'Barracks',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 400,
    cost: { food: 150, water: 0, sticks: 250, stone: 100, tools: 25 },
    constructionTime: 25000,
    tier: 3,
    buildable: true,
    unlockCondition: { building: 'Factory', count: 1 },
    description: 'Military training facility. Trains combat units like Guard Geese and Scout Geese for defending your base and exploring dangerous territories. Requires Factory to unlock.'
  },
  WATCHTOWER: {
    name: 'Watchtower',
    displayName: 'Watchtower',
    width: 64,
    height: 128,
    footprint: [[0, 0]], // 1x1
    health: 300,
    cost: { food: 75, water: 25, sticks: 200, stone: 100, tools: 15 },
    constructionTime: 12000,
    tier: 3,
    buildable: true,
    unlockCondition: { building: 'Factory', count: 1 },
    description: 'Static defense tower with extended vision range. Automatically attacks nearby threats. Place strategically around your base perimeter for early warning and protection.'
  },
  POWER_STATION: {
    name: 'PowerStation',
    displayName: 'Power Station',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 250,
    cost: { food: 0, water: 100, sticks: 250, stone: 150, tools: 40 },
    constructionTime: 30000,
    tier: 3,
    buildable: true,
    unlockCondition: { building: 'Factory', count: 1 },
    description: 'Advanced energy facility. Powers future high-tech buildings and provides passive resource bonuses. Most expensive building - only build when you have a strong economy.'
  },
  MINE: {
    name: 'Mine',
    displayName: 'Mine',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 300,
    cost: { food: 0, water: 50, sticks: 200, tools: 10 },
    constructionTime: 15000,
    tier: 2,
    buildable: true,
    unlockCondition: { building: 'Coop', count: 1 },
    spriteKey: 'mine',
    size: 128,
    description: 'Stone mining facility. Place near stone deposits to extract stone resources. Workers will automatically mine stone from nearby deposits.'
  },
  AIRSTRIP: {
    name: 'Airstrip',
    displayName: 'Airstrip',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 200,
    cost: { food: 0, water: 100, sticks: 300, stone: 200, tools: 25 },
    constructionTime: 20000,
    tier: 3,
    buildable: true,
    unlockCondition: { building: 'Barracks', count: 1 },
    spriteKey: 'airstrip',
    size: 128,
    description: 'Advanced military facility for air units. Trains fast, mobile aerial units with ranged attacks. Requires significant resources but provides powerful reconnaissance and strike capabilities.'
  },
  FARM: {
    name: 'Farm',
    displayName: 'Farm',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 150,
    cost: { food: 25, water: 50, sticks: 100, tools: 5 },
    constructionTime: 12000,
    tier: 2,
    buildable: true,
    unlockCondition: { building: 'ResourceStorage', count: 1 },
    spriteKey: 'farm',
    size: 128,
    description: 'Agricultural facility that automatically grows and harvests food. Place on grass terrain for best yields. Essential for sustainable food production without manual gathering.'
  },
  WELL: {
    name: 'Well',
    displayName: 'Well',
    width: 64,
    height: 64,
    footprint: [[0, 0]], // 1x1
    health: 100,
    cost: { food: 25, water: 0, sticks: 75, tools: 3 },
    constructionTime: 8000,
    tier: 2,
    buildable: true,
    unlockCondition: { building: 'ResourceStorage', count: 1 },
    spriteKey: 'well',
    size: 64,
    description: 'Extracts groundwater automatically. A small but steady source of water that frees up workers for other tasks. Best built near your base for convenience.'
  },
  LUMBER_MILL: {
    name: 'LumberMill',
    displayName: 'Lumber Mill',
    width: 128,
    height: 128,
    footprint: [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
    health: 200,
    cost: { food: 50, water: 25, sticks: 150, tools: 8 },
    constructionTime: 15000,
    tier: 2,
    buildable: true,
    unlockCondition: { building: 'ResourceStorage', count: 1 },
    spriteKey: 'lumber-mill',
    size: 128,
    description: 'Wood processing facility that automatically produces sticks. Best placed near forests. Provides a steady supply of building materials without manual tree chopping.'
  }
};

// Resource Configuration
export const RESOURCE = {
  FOOD: {
    name: 'Food',
    capacity: 100,  // Reduced from 500 - each crop field has ~100 food
    gatherRate: 12,  // per gather action
    regenerateRate: 0  // per second, 0 = no regeneration
  },
  WATER: {
    name: 'Water',
    capacity: 50,  // Reduced from 300 - water sources are smaller
    gatherRate: 8,
    regenerateRate: 0
  },
  STICKS: {
    name: 'Sticks',
    capacity: 30,  // Reduced from 500 - each tree gives 20-40 wood (random)
    gatherRate: 8,
    regenerateRate: 0
  },
  STONE: {
    name: 'Stone',
    capacity: 50,  // Stone deposits
    gatherRate: 8,
    regenerateRate: 0
  },
  TOOLS: {
    name: 'Tools',
    capacity: 0,  // Not gathered from map - produced by Factory
    gatherRate: 0,
    regenerateRate: 0
  }
};

// Storage Limits (base limits without any storage buildings)
export const STORAGE = {
  FOOD: 300,       // Boosted base - need Resource Storage to expand
  WATER: 150,
  STICKS: 400,     // Boosted base - need Resource Storage to expand
  STONE: 100,
  TOOLS: 20,
  // Increased by building ResourceStorage
  FOOD_PER_STORAGE: 300,
  WATER_PER_STORAGE: 200,
  STICKS_PER_STORAGE: 500,
  STONE_PER_STORAGE: 200,
  TOOLS_PER_STORAGE: 50
};

// Starting Resources
export const STARTING_RESOURCES = {
  food: 200,
  water: 100,
  sticks: 150,
  stone: 0,   // Stone must be mined
  tools: 10   // Starting tools for early game flexibility
};

// Fog of War Configuration
export const FOG = {
  UPDATE_FREQUENCY: 3,  // Update every N frames
  UNEXPLORED_ALPHA: 0.9,
  EXPLORED_ALPHA: 0.5,
  VISIBLE_ALPHA: 0
};

// UI Configuration
export const UI = {
  MINIMAP_SIZE: 150,
  MINIMAP_PADDING: 20,
  RESOURCE_DISPLAY_HEIGHT: 40,
  PORTRAIT_SIZE: 80,
  BUILD_MENU_WIDTH: 200
};

// Input Configuration
export const INPUT = {
  DOUBLE_CLICK_THRESHOLD: 300,  // milliseconds
  DRAG_THRESHOLD: 5  // pixels
};

// Animation Configuration
export const ANIM = {
  IDLE_FRAME_DURATION: 500,
  WALK_FRAME_DURATION: 150,
  GATHER_FRAME_DURATION: 1000,
  ATTACK_FRAME_DURATION: 150
};

// Directions for 8-way movement
export const DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

// Unit States
export const UNIT_STATES = {
  IDLE: 'IDLE',
  MOVING: 'MOVING',
  GATHERING: 'GATHERING',
  RETURNING: 'RETURNING',
  CONSTRUCTING: 'CONSTRUCTING',
  ATTACKING: 'ATTACKING'
};

// Building States
export const BUILDING_STATES = {
  CONSTRUCTION: 'CONSTRUCTION',
  OPERATIONAL: 'OPERATIONAL',
  DAMAGED: 'DAMAGED'
};

// Factions
export const FACTIONS = {
  PLAYER: 'PLAYER',
  ENEMY_1: 'ENEMY_1',
  ENEMY_2: 'ENEMY_2',
  ENEMY_3: 'ENEMY_3',
  NEUTRAL: 'NEUTRAL'
};

// Faction Colors
export const FACTION_COLORS = {
  PLAYER: 0x2196F3,    // Blue
  ENEMY_1: 0xF44336,   // Red
  ENEMY_2: 0x9C27B0,   // Purple
  ENEMY_3: 0xFF9800,   // Orange
  NEUTRAL: 0x9E9E9E    // Gray
};

// Unit Costs (resources required to train)
export const UNIT_COSTS = {
  WORKER: { food: 50, water: 0, sticks: 0, tools: 0 },
  GUARD: { food: 75, water: 25, sticks: 50, tools: 2 },
  SCOUT: { food: 40, water: 30, sticks: 20, tools: 1 },
  SPY: { food: 60, water: 40, sticks: 30, tools: 3 },
  MAVERICK: { food: 100, water: 50, sticks: 80, tools: 8 }
};

// Tool Production (Factory converts sticks to tools)
export const TOOL_PRODUCTION = {
  STICKS_PER_TOOL: 3,        // 3 sticks = 1 tool (was 5)
  PRODUCTION_TIME: 2000,      // 2 seconds per tool
  AUTO_PRODUCTION: false      // Requires Research Center upgrade
};

// Unit Train Time (milliseconds)
export const UNIT_TRAIN_TIME = {
  WORKER: 5000,   // 5 seconds
  GUARD: 8000,    // 8 seconds
  SCOUT: 6000,    // 6 seconds
  SPY: 10000,     // 10 seconds
  MAVERICK: 10000 // 10 seconds
};

// Unit Combat Stats
export const UNIT_STATS = {
  WORKER: {
    health: 50,
    speed: 100,
    damage: 0,
    attackRange: 0,
    attackSpeed: 0,
    engagementRange: 0,
    description: 'Gatherer - collects resources'
  },
  GUARD: {
    health: 150,
    speed: 90,
    damage: 15,
    attackRange: 80,        // Melee
    attackSpeed: 1500,
    engagementRange: 200,
    description: 'Tank - high HP, melee fighter'
  },
  SCOUT: {
    health: 70,
    speed: 150,
    damage: 8,
    attackRange: 120,       // Ranged
    attackSpeed: 800,
    engagementRange: 250,
    description: 'Harasser - fast, ranged attacks'
  },
  SPY: {
    health: 50,
    speed: 130,
    damage: 5,
    attackRange: 60,
    attackSpeed: 1200,
    engagementRange: 100,
    stealthDetectionRange: 80,  // Enemies detect spy within this range
    sabotageDuration: 30000,    // 30 seconds building disabled
    sabotageCooldown: 60000,    // 60 seconds between sabotages
    stealAmount: 25,            // Resources stolen per use
    stealCooldown: 45000,       // 45 seconds between steals
    description: 'Saboteur - disables buildings, steals resources'
  },
  MAVERICK: {
    health: 100,
    speed: 180,
    damage: 12,
    attackRange: 130,
    attackSpeed: 1000,
    engagementRange: 200,
    description: 'Maverick - fast aerial striker'
  }
};

// Building Combat Stats (for defensive buildings)
export const BUILDING_COMBAT = {
  WATCHTOWER: {
    damage: 10,
    attackRange: 200,
    attackSpeed: 1500,
    visionRange: 12,        // tiles
    spyDetectionRange: 150  // Extended range to detect spies
  }
};

// Colors
export const COLORS = {
  PLAYER: 0x4CAF50,        // Green
  SELECTION: 0x00BCD4,     // Cyan
  PLACEMENT_VALID: 0x4CAF50,   // Green
  PLACEMENT_INVALID: 0xF44336, // Red
  FOG_UNEXPLORED: 0x000000,
  FOG_EXPLORED: 0x888888,
  MINIMAP_VISIBLE: 0xFFFFFF,
  MINIMAP_EXPLORED: 0x666666,
  MINIMAP_UNEXPLORED: 0x000000
};

// Z-Depth layers
export const DEPTH = {
  TERRAIN: 0,
  SHADOWS: 100,
  RESOURCES: 200,
  BUILDINGS: 300,
  UNITS: 400,
  EFFECTS: 500,
  SELECTION: 600,
  FOG: 1000,
  UI: 2000
};
