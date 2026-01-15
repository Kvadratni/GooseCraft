// Jest test setup

// Mock Phaser global
global.Phaser = {
  Math: {
    Distance: {
      Between: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      }
    },
    RadToDeg: (rad) => rad * (180 / Math.PI)
  },
  GameObjects: {
    Container: class Container {
      constructor() {
        this.list = [];
      }
      add(obj) {
        this.list.push(obj);
      }
    }
  },
  Scene: class Scene {
    constructor() {}
  }
};

// Mock EasyStar global
global.EasyStar = {
  js: class {
    setGrid() {}
    setAcceptableTiles() {}
    enableDiagonals() {}
    disableCornerCutting() {}
    setIterationsPerCalculation() {}
    findPath() {}
    calculate() {}
  }
};

// Setup console mocking to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
