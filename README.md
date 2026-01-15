# GooseCraft

A browser-based 2D isometric RTS (Real-Time Strategy) game built with Phaser 3.

## Overview

GooseCraft is a real-time strategy game where you command a flock of geese to gather resources, construct buildings, and expand your goose civilization. The game features:

- **Isometric graphics** for a classic RTS feel
- **Resource gathering** - collect food, water, sticks, and tools
- **Building system** - construct various structures with unlock progression
- **Pathfinding** - units navigate intelligently around obstacles
- **Unit management** - select and command multiple units

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (v16+) and npm (optional, for development tools)

### Quick Start

1. **Clone or download** the repository
2. **Open `index.html`** directly in your browser

That's it! The game runs entirely in the browser with no build step required.

### Using a Local Server (Recommended)

For the best experience, run the game through a local HTTP server:

```bash
# Using Python 3
python -m http.server 8080

# Using Python 2
python -m SimpleHTTPServer 8080

# Using Node.js (if you have http-server installed)
npx http-server -p 8080 -c-1
```

Then open `http://localhost:8080` in your browser.

### Installing Development Dependencies (Optional)

If you want to run tests or use development tools:

```bash
npm install
```

## How to Play

### Controls

- **Left Click** - Select units or buildings
- **Right Click** - Command selected units to move or gather resources
- **Click & Drag** - Select multiple units with selection box
- **WASD / Arrow Keys** - Pan camera
- **Mouse Wheel** - Zoom in/out
- **ESC** - Deselect all units

### Game Mechanics

#### Starting Out

1. You begin with a **Coop** (your main building) and one **Goose** unit
2. Click on your goose to select it
3. Right-click on resource nodes (wheat, trees, water) to gather resources
4. Resources are automatically deposited at your Coop

#### Resources

- **Food** - Gathered from wheat fields
- **Water** - Gathered from water tiles
- **Sticks** - Gathered from trees
- **Tools** - Crafted or gathered (advanced)

#### Building

1. Select the **Build Menu** button at the bottom
2. Choose a building (if you have enough resources)
3. Click on the map to place it (green = valid, red = blocked)
4. Buildings take time to construct

#### Progression

- Complete buildings to unlock new structures
- Some buildings require specific prerequisites
- Check the building panel for unlock conditions

### Buildings

- **Coop** - Main base, resource dropoff point
- **Barracks** - Train military units
- **Factory** - Produce advanced units
- **Power Station** - Generate power
- **Research** - Unlock technologies
- **Resource Extractor** - Passive resource generation
- **Tower** - Defense structure
- **Airstrip** - Air unit production

## Project Structure

```
GooseCraft/
├── index.html              # Main entry point
├── css/
│   └── style.css          # Game styling
├── js/
│   ├── main.js            # Game initialization
│   ├── scenes/            # Phaser scenes
│   │   ├── BootScene.js   # Asset loading
│   │   ├── MenuScene.js   # Main menu
│   │   ├── GameScene.js   # Main gameplay
│   │   └── UIScene.js     # HUD and UI
│   ├── entities/          # Game entities
│   │   ├── Unit.js        # Base unit class
│   │   ├── Goose.js       # Worker unit
│   │   ├── Building.js    # Base building class
│   │   └── ResourceNode.js # Resource nodes
│   ├── systems/           # Game systems
│   │   ├── IsometricMap.js        # Tile map
│   │   ├── PathfindingManager.js  # A* pathfinding
│   │   ├── SelectionManager.js    # Unit selection
│   │   ├── ResourceManager.js     # Resource tracking
│   │   ├── BuildingManager.js     # Building placement
│   │   └── BuildingUnlockManager.js # Progression
│   ├── buildings/         # Specific building types
│   │   ├── Coop.js
│   │   ├── Barracks.js
│   │   └── ...
│   ├── ui/                # UI components
│   └── utils/             # Utilities
│       ├── Constants.js   # Game constants
│       ├── IsometricUtils.js # Coordinate conversion
│       ├── Logger.js      # Logging system
│       └── SpatialHash.js # Spatial partitioning
├── lib/                   # External libraries
│   ├── phaser.min.js     # Phaser 3 game engine
│   └── easystar-0.4.4.min.js # Pathfinding library
└── assets/                # Game assets
    ├── terrain/           # Terrain tiles
    ├── units/             # Unit sprites
    ├── buildings/         # Building sprites
    └── resources/         # Resource sprites
```

## Development

### Architecture

The game follows a component-based architecture:

- **Scenes** manage different game states (boot, menu, game)
- **Systems** handle specific game logic (pathfinding, selection, resources)
- **Entities** are game objects (units, buildings, resources)
- **Utils** provide helper functions and constants

### Key Systems

#### Isometric Coordinates

The game uses an isometric grid system. Conversion utilities in `IsometricUtils.js` handle transformation between:
- Screen coordinates (mouse position)
- World coordinates (Phaser world space)
- Grid coordinates (tile indices)

#### Pathfinding

Uses EasyStar.js for A* pathfinding with:
- Diagonal movement enabled
- Corner cutting disabled
- Dynamic grid updates when buildings are placed
- Grid caching for performance

#### Spatial Partitioning

Resource nodes use a spatial hash grid (`SpatialHash.js`) for efficient nearest-neighbor queries, improving performance when many units search for resources.

### Adding New Buildings

1. Create a new class in `js/buildings/` extending `Building`
2. Define the building configuration in `Constants.js`
3. Add unlock conditions in `BuildingUnlockManager.js`
4. Add the building sprite to `assets/buildings/`
5. Load the sprite in `BootScene.js`

### Testing

Run tests (requires dependencies installed):

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Performance Optimizations

The codebase includes several performance optimizations:

- **Minimap caching** - Static terrain rendered once, dynamic elements updated separately
- **Spatial hashing** - O(1) proximity queries for resource searches
- **Pathfinding grid caching** - Grid only updated when terrain changes
- **Input validation** - Prevents invalid operations early

## Known Issues

- No save/load system yet
- Mobile controls not optimized
- Limited sound effects
- No multiplayer support

## Future Enhancements

- [ ] Save/load game state
- [ ] Combat system
- [ ] More building and unit types
- [ ] Technology research tree
- [ ] Campaign mode
- [ ] Mobile touch controls
- [ ] Sound effects and music
- [ ] Multiplayer/networking

## Credits

- **Game Engine**: [Phaser 3](https://phaser.io/)
- **Pathfinding**: [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)

## License

MIT License - see LICENSE file for details
