// Isometric Coordinate Conversion Utilities

import { TILE } from './Constants.js';

/**
 * Convert grid coordinates to isometric world coordinates
 * @param {number} gridX - Grid X coordinate (0-49)
 * @param {number} gridY - Grid Y coordinate (0-49)
 * @returns {object} {x, y} World coordinates in pixels
 */
export function gridToWorld(gridX, gridY) {
  const worldX = (gridX - gridY) * TILE.WIDTH_HALF;
  const worldY = (gridX + gridY) * TILE.HEIGHT_HALF;
  return { x: worldX, y: worldY };
}

/**
 * Convert isometric world coordinates to grid coordinates
 * @param {number} worldX - World X coordinate in pixels
 * @param {number} worldY - World Y coordinate in pixels
 * @returns {object} {x, y} Grid coordinates (may be floating point)
 */
export function worldToGrid(worldX, worldY) {
  const gridX = (worldX / TILE.WIDTH_HALF + worldY / TILE.HEIGHT_HALF) / 2;
  const gridY = (worldY / TILE.HEIGHT_HALF - worldX / TILE.WIDTH_HALF) / 2;
  return { x: gridX, y: gridY };
}

/**
 * Convert isometric world coordinates to integer grid coordinates
 * @param {number} worldX - World X coordinate in pixels
 * @param {number} worldY - World Y coordinate in pixels
 * @returns {object} {x, y} Grid coordinates (floored to integers)
 */
export function worldToGridInt(worldX, worldY) {
  const grid = worldToGrid(worldX, worldY);
  return {
    x: Math.floor(grid.x),
    y: Math.floor(grid.y)
  };
}

/**
 * Convert screen coordinates to world coordinates (accounting for camera)
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {Phaser.Cameras.Scene2D.Camera} camera - Phaser camera
 * @returns {object} {x, y} World coordinates
 */
export function screenToWorld(screenX, screenY, camera) {
  // First divide by zoom to get world-scale coordinates, then add camera scroll
  const worldX = screenX / camera.zoom + camera.scrollX;
  const worldY = screenY / camera.zoom + camera.scrollY;
  return { x: worldX, y: worldY };
}

/**
 * Convert screen coordinates to grid coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {Phaser.Cameras.Scene2D.Camera} camera - Phaser camera
 * @returns {object} {x, y} Grid coordinates (floored to integers)
 */
export function screenToGrid(screenX, screenY, camera) {
  const world = screenToWorld(screenX, screenY, camera);
  return worldToGridInt(world.x, world.y);
}

/**
 * Get the center point of a grid cell in world coordinates
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {object} {x, y} Center point in world coordinates
 */
export function gridToWorldCenter(gridX, gridY) {
  const world = gridToWorld(gridX, gridY);
  return {
    x: world.x + TILE.WIDTH_HALF,
    y: world.y + TILE.HEIGHT_HALF
  };
}

/**
 * Check if grid coordinates are within map bounds
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @param {number} mapWidth - Map width in tiles
 * @param {number} mapHeight - Map height in tiles
 * @returns {boolean} True if within bounds
 */
export function isWithinBounds(gridX, gridY, mapWidth, mapHeight) {
  return gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight;
}

/**
 * Calculate depth value for sprite sorting (isometric)
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @param {number} height - Height offset (for tall sprites)
 * @returns {number} Depth value for setDepth()
 */
export function calculateDepth(worldX, worldY, height = 0) {
  // Depth based on Y position + partial X influence + height
  return worldY + (worldX * 0.001) + (height * 0.5);
}

/**
 * Snap world coordinates to nearest grid cell center
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @returns {object} {x, y} Snapped world coordinates
 */
export function snapToGrid(worldX, worldY) {
  const grid = worldToGridInt(worldX, worldY);
  return gridToWorldCenter(grid.x, grid.y);
}
