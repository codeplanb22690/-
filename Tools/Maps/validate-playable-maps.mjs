import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.resolve("src/assets/generated/maps/data");
const REQUIRED_LAYERS = [
  "Ground_Base",
  "Ground_Decal",
  "Main_Path",
  "Props_Soft",
  "Props_Collision",
  "Event_Points",
  "Spawn_Zones",
  "Boss_Arena",
  "Lighting",
  "Bounds",
];

function fail(mapId, message) {
  throw new Error(`${mapId}: ${message}`);
}

function inRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function blocked(data, x, y) {
  if (x < data.bounds.minX || x > data.bounds.maxX || y < data.bounds.minY || y > data.bounds.maxY) return true;
  return data.collisionRects.some((rect) => inRect(x, y, rect));
}

function assertClearCircle(data, center, radius, label) {
  for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y += 1) {
    for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x += 1) {
      if (Math.hypot(x - center.x, y - center.y) > radius) continue;
      if (blocked(data, x, y)) fail(data.id, `${label} contains collision at (${x}, ${y})`);
    }
  }
}

function buildGrid(data) {
  const width = data.size.width;
  const height = data.size.height;
  const minX = data.bounds.minX;
  const minY = data.bounds.minY;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  for (let y = minY; y < data.bounds.maxY; y += 1) {
    for (let x = minX; x < data.bounds.maxX; x += 1) {
      grid[y - minY][x - minX] = blocked(data, x, y);
    }
  }
  return { grid, minX, minY, width, height };
}

function reachable(data, start, target) {
  const { grid, minX, minY, width, height } = buildGrid(data);
  const sx = Math.round(start.x - minX);
  const sy = Math.round(start.y - minY);
  const tx = Math.round(target.x - minX);
  const ty = Math.round(target.y - minY);
  const seen = new Set([`${sx},${sy}`]);
  const queue = [[sx, sy]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen.has(key) || grid[ny][nx]) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return false;
}

function validateMap(data) {
  for (const layer of REQUIRED_LAYERS) {
    if (!data.layers.includes(layer)) fail(data.id, `missing layer ${layer}`);
    const layerPath = path.resolve("src/assets/generated/maps", data.layerFiles[layer]);
    if (!fs.existsSync(layerPath)) fail(data.id, `missing layer file ${data.layerFiles[layer]}`);
  }
  if (!fs.existsSync(path.resolve("src/assets/generated/maps", data.compositeFile))) fail(data.id, `missing composite ${data.compositeFile}`);
  if (data.spawnZones.length < 8) fail(data.id, "needs at least 8 spawn zones");
  if (data.eventPoints.length < 3) fail(data.id, "needs at least 3 event points");

  assertClearCircle(data, data.playerSpawn, 12, "player spawn");
  assertClearCircle(data, { x: data.bossArena.centerX, y: data.bossArena.centerY }, data.bossArena.radius, "boss arena");

  const hardArea = data.collisionRects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
  const mapArea = data.size.width * data.size.height;
  const hardRatio = hardArea / mapArea;
  if (hardRatio > data.maxHardObstacleRatio) fail(data.id, `hard collision ratio ${hardRatio.toFixed(3)} exceeds ${data.maxHardObstacleRatio}`);
  if (1 - hardRatio < data.walkableRatioTarget) fail(data.id, "walkable ratio is below target");

  for (const point of data.eventPoints) {
    if (blocked(data, point.x, point.y)) fail(data.id, `event ${point.id} is inside collision`);
    assertClearCircle(data, point, 4, `event ${point.id}`);
    if (!reachable(data, data.playerSpawn, point)) fail(data.id, `event ${point.id} is not reachable`);
  }
  for (const zone of data.spawnZones) {
    if (blocked(data, zone.x, zone.y)) fail(data.id, `spawn ${zone.id} is inside collision`);
    if (Math.hypot(zone.x - data.playerSpawn.x, zone.y - data.playerSpawn.y) < 18) fail(data.id, `spawn ${zone.id} is too close`);
    if (!reachable(data, zone, data.playerSpawn)) fail(data.id, `spawn ${zone.id} cannot reach player spawn`);
  }
}

const files = fs.readdirSync(DATA_ROOT).filter((file) => file.endsWith(".json")).sort();
for (const file of files) validateMap(JSON.parse(fs.readFileSync(path.join(DATA_ROOT, file), "utf-8")));
console.log(`Validated ${files.length} playable maps.`);
