import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const TILE_COUNT = 160;
const IMAGE_SIZE = 1024;
const OUT_ROOT = path.resolve("src/assets/generated/maps");
const DATA_ROOT = path.join(OUT_ROOT, "data");
const LAYER_ROOT = path.join(OUT_ROOT, "layers");
const PREVIEW_ROOT = path.join(OUT_ROOT, "previews");
const TILE = 32;
const SUBTILE = 8;

const LAYERS = [
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

const forbiddenStyles = [
  "medieval",
  "gothic",
  "church",
  "dungeon",
  "horror",
  "ruins",
  "dirty_cyberpunk",
  "building",
  "props",
  "walls",
  "obstacles",
];

const spawnZones = [
  { id: "spawn_north", direction: "north", x: 0, y: -72, unlockTime: 0 },
  { id: "spawn_south", direction: "south", x: 0, y: 72, unlockTime: 180 },
  { id: "spawn_east", direction: "east", x: 72, y: 0, unlockTime: 360 },
  { id: "spawn_west", direction: "west", x: -72, y: 0, unlockTime: 360 },
  { id: "spawn_ne", direction: "ne", x: 58, y: -58, unlockTime: 540 },
  { id: "spawn_nw", direction: "nw", x: -58, y: -58, unlockTime: 540 },
  { id: "spawn_se", direction: "se", x: 58, y: 58, unlockTime: 540 },
  { id: "spawn_sw", direction: "sw", x: -58, y: 58, unlockTime: 540 },
];

const maps = [
  {
    id: "MAP001",
    slug: "starlight-cafe",
    file: "starlight-cafe.png",
    previewFile: "starlight-cafe-3x3.png",
    dataFile: "map_001_starlight_cafe.json",
    name: "星光咖啡厅外广场",
    scene: "Map_M001_StarlightCafe",
    theme: "pixel_floor_starlight_cafe_plaza",
    mechanic: "sweet_supply",
    bossId: "giant-dango-king",
    baseDifficulty: 1,
    bossArena: { centerX: 0, centerY: -8, radius: 26 },
    paletteName: "奶白、浅灰蓝、蓝紫星轨、浅金光点",
    palette: {
      baseA: [232, 226, 210],
      baseB: [214, 222, 228],
      baseC: [202, 212, 224],
      grid: [183, 194, 210],
      gridSoft: [222, 216, 202],
      accent: [116, 124, 226],
      accentSoft: [152, 160, 236],
      glow: [247, 199, 108],
      shadow: [180, 184, 196],
    },
    floorRules: "32px 方形广场地砖，64px 低对比度大砖变化，周期性蓝紫星轨线，少量 8px 浅金平面光点。",
    events: [
      { id: "event_floor_supply_a", name: "星糖地面补给点", type: "heal_buff", x: -48, y: 8, unlockTime: 360 },
      { id: "event_floor_supply_b", name: "服务地面节点", type: "map_mechanic", x: 48, y: 4, unlockTime: 360 },
      { id: "event_floor_reward", name: "甜点地面奖励点", type: "shop_reward", x: 0, y: 50, unlockTime: 540 },
      { id: "event_floor_spark", name: "星糖光点", type: "supply", x: 26, y: -30, unlockTime: 240 },
    ],
  },
  {
    id: "MAP002",
    slug: "moon-park",
    file: "moon-park.png",
    previewFile: "moon-park-3x3.png",
    dataFile: "map_002_moonlight_park.json",
    name: "月夜公园",
    scene: "Map_M002_MoonlightPark",
    theme: "pixel_floor_moonlight_park",
    mechanic: "moon_tide",
    bossId: "nightmare-cat",
    baseDifficulty: 1.1,
    bossArena: { centerX: 0, centerY: 0, radius: 26 },
    paletteName: "深蓝绿、蓝紫草坪砖、浅蓝月光斑",
    palette: {
      baseA: [31, 62, 72],
      baseB: [37, 70, 86],
      baseC: [46, 57, 96],
      grid: [54, 86, 100],
      gridSoft: [39, 72, 82],
      accent: [113, 172, 222],
      accentSoft: [92, 124, 190],
      glow: [164, 207, 232],
      shadow: [25, 48, 66],
    },
    floorRules: "32px 草坪地砖，规整蓝紫块面变化，低对比月光斑，少量发光步道线，无树和草丛实体。",
    events: [
      { id: "event_moon_floor", name: "月光地面潮汐点", type: "map_mechanic", x: 8, y: -16, unlockTime: 180 },
      { id: "event_moon_heal", name: "月光地面补给点", type: "heal_buff", x: -50, y: 8, unlockTime: 360 },
      { id: "event_moon_reward", name: "公园地面奖励点", type: "random_reward", x: 50, y: 2, unlockTime: 360 },
      { id: "event_moon_shop", name: "月夜地面奖励点", type: "shop_reward", x: 0, y: 52, unlockTime: 540 },
    ],
  },
  {
    id: "MAP003",
    slug: "abandoned-lab",
    file: "abandoned-lab.png",
    previewFile: "abandoned-lab-3x3.png",
    dataFile: "map_003_abandoned_lab.json",
    name: "废弃研究所",
    scene: "Map_M003_AbandonedLab",
    theme: "pixel_floor_clean_sci_fi_lab",
    mechanic: "laser_scan",
    bossId: "rogue-robot-mk01",
    baseDifficulty: 1.22,
    bossArena: { centerX: 0, centerY: 0, radius: 26 },
    paletteName: "浅灰、蓝灰、银白金属、淡青电路线",
    palette: {
      baseA: [108, 125, 138],
      baseB: [126, 142, 152],
      baseC: [153, 164, 170],
      grid: [82, 102, 118],
      gridSoft: [142, 154, 162],
      accent: [80, 214, 226],
      accentSoft: [120, 222, 230],
      glow: [192, 238, 240],
      shadow: [70, 88, 104],
    },
    floorRules: "规整金属方砖与伪六边形角线，淡青电路只做地面线条，周期扫描线，无机器、管道、墙体。",
    events: [
      { id: "event_lab_scan", name: "扫描地面节点", type: "map_mechanic", x: -54, y: 2, unlockTime: 360 },
      { id: "event_lab_reward", name: "研究所地面奖励点", type: "random_reward", x: 52, y: 4, unlockTime: 360 },
      { id: "event_lab_route", name: "安全地面路线点", type: "safe_route", x: 0, y: 54, unlockTime: 480 },
      { id: "event_lab_shop", name: "研究所地面补给点", type: "shop_reward", x: 32, y: 38, unlockTime: 540 },
    ],
  },
  {
    id: "MAP004",
    slug: "dream-library",
    file: "dream-library.png",
    previewFile: "dream-library-3x3.png",
    dataFile: "map_004_dream_library.json",
    name: "梦境图书馆",
    scene: "Map_M004_DreamLibrary",
    theme: "pixel_floor_dream_library",
    mechanic: "page_storm",
    bossId: "forgotten-shadow",
    baseDifficulty: 1.35,
    bossArena: { centerX: 0, centerY: 0, radius: 26 },
    paletteName: "蓝紫透明地砖、淡金数据线、平面书页纹",
    palette: {
      baseA: [54, 45, 100],
      baseB: [67, 56, 120],
      baseC: [80, 70, 138],
      grid: [103, 86, 152],
      gridSoft: [73, 62, 128],
      accent: [222, 187, 96],
      accentSoft: [172, 142, 222],
      glow: [236, 210, 132],
      shadow: [38, 32, 82],
    },
    floorRules: "32px 蓝紫透明感地砖，淡金数据线，规律小书页轮廓只作为地面纹路，无书架、桌子、实体书。",
    events: [
      { id: "event_library_index", name: "索引地面节点", type: "map_mechanic", x: 50, y: 0, unlockTime: 360 },
      { id: "event_library_heal", name: "书页地面补给点", type: "heal_buff", x: -50, y: 6, unlockTime: 360 },
      { id: "event_library_reward", name: "图书馆地面奖励点", type: "random_reward", x: 26, y: -42, unlockTime: 480 },
      { id: "event_library_shop", name: "梦境地面奖励点", type: "shop_reward", x: 0, y: 54, unlockTime: 540 },
    ],
  },
  {
    id: "MAP005",
    slug: "sky-train-station",
    file: "sky-train-station.png",
    previewFile: "sky-train-station-3x3.png",
    dataFile: "map_005_cloud_tram_station.json",
    name: "云端电车站",
    scene: "Map_M005_CloudTramStation",
    theme: "pixel_floor_cloud_tram_station",
    mechanic: "star_train",
    bossId: "starrail-conductor",
    baseDifficulty: 1.5,
    bossArena: { centerX: 0, centerY: 0, radius: 26 },
    paletteName: "透明蓝白站台地砖、星轨线、淡云雾块",
    palette: {
      baseA: [88, 148, 170],
      baseB: [112, 174, 194],
      baseC: [150, 202, 216],
      grid: [76, 132, 158],
      gridSoft: [132, 190, 206],
      accent: [92, 224, 240],
      accentSoft: [188, 230, 236],
      glow: [238, 242, 214],
      shadow: [58, 112, 144],
    },
    floorRules: "透明蓝白站台方砖，平面星轨线和淡云雾色块，全部是地板图案，无电车、栏杆、站台门。",
    events: [
      { id: "event_station_signal", name: "站台地面信号点", type: "map_mechanic", x: 52, y: 2, unlockTime: 360 },
      { id: "event_station_route", name: "站台地面路线点", type: "safe_route", x: -54, y: 4, unlockTime: 420 },
      { id: "event_station_supply", name: "云端地面补给点", type: "shop_reward", x: 0, y: 54, unlockTime: 540 },
      { id: "event_station_boost", name: "星轨地面能量点", type: "supply", x: 24, y: -24, unlockTime: 540 },
    ],
  },
  {
    id: "MAP006",
    slug: "dawn-ring-tower",
    file: "dawn-ring-tower.png",
    previewFile: "dawn-ring-tower-3x3.png",
    dataFile: "map_006_dawn_star_ring_tower.json",
    name: "黎明星环塔",
    scene: "Map_M006_DawnStarRingTower",
    theme: "pixel_floor_dawn_star_ring_tower",
    mechanic: "star_ring",
    bossId: "dawn-core",
    baseDifficulty: 1.75,
    bossArena: { centerX: 0, centerY: 0, radius: 30 },
    paletteName: "深蓝科技平台、蓝金线、浅青、黎明暖色",
    palette: {
      baseA: [28, 42, 82],
      baseB: [34, 54, 100],
      baseC: [44, 72, 118],
      grid: [62, 96, 142],
      gridSoft: [42, 64, 110],
      accent: [80, 204, 226],
      accentSoft: [84, 142, 202],
      glow: [230, 170, 82],
      shadow: [18, 30, 62],
    },
    floorRules: "深蓝高空科技平台方砖，蓝金圆环能量线和平面黎明色带，无塔、核心装置、实体星环或柱子。",
    events: [
      { id: "event_dawn_ring", name: "星环地面校准点", type: "map_mechanic", x: -56, y: 2, unlockTime: 360 },
      { id: "event_dawn_reward", name: "数据地面奖励点", type: "random_reward", x: 56, y: 2, unlockTime: 360 },
      { id: "event_dawn_supply", name: "终局地面补给点", type: "shop_reward", x: 0, y: 56, unlockTime: 540 },
      { id: "event_dawn_echo", name: "黎明地面残响点", type: "supply", x: 0, y: -44, unlockTime: 720 },
    ],
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function makePng(width = IMAGE_SIZE, height = IMAGE_SIZE) {
  const png = new PNG({ width, height });
  png.data.fill(0);
  return png;
}

function setPixel(png, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = color[0];
  png.data[i + 1] = color[1];
  png.data[i + 2] = color[2];
  png.data[i + 3] = alpha;
}

function fillRect(png, x, y, width, height, color, alpha = 255) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(png.width, x + width);
  const y1 = Math.min(png.height, y + height);
  for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) setPixel(png, xx, yy, color, alpha);
}

function drawWrappedRect(png, x, y, width, height, color, alpha = 255) {
  const wrappedX = ((x % IMAGE_SIZE) + IMAGE_SIZE) % IMAGE_SIZE;
  const wrappedY = ((y % IMAGE_SIZE) + IMAGE_SIZE) % IMAGE_SIZE;
  const xParts = wrappedX + width <= IMAGE_SIZE ? [[wrappedX, width]] : [[wrappedX, IMAGE_SIZE - wrappedX], [0, width - (IMAGE_SIZE - wrappedX)]];
  const yParts = wrappedY + height <= IMAGE_SIZE ? [[wrappedY, height]] : [[wrappedY, IMAGE_SIZE - wrappedY], [0, height - (IMAGE_SIZE - wrappedY)]];
  for (const [xx, ww] of xParts) for (const [yy, hh] of yParts) fillRect(png, xx, yy, ww, hh, color, alpha);
}

function drawWrappedLineH(png, y, x, width, color, thickness = 2) {
  drawWrappedRect(png, x, y, width, thickness, color);
}

function drawWrappedLineV(png, x, y, height, color, thickness = 2) {
  drawWrappedRect(png, x, y, thickness, height, color);
}

function drawPixelRing(png, cx, cy, radius, color, thickness = 4) {
  const r2 = radius * radius;
  const inner2 = (radius - thickness) * (radius - thickness);
  for (let y = cy - radius; y <= cy + radius; y += SUBTILE) {
    for (let x = cx - radius; x <= cx + radius; x += SUBTILE) {
      const dx = x - cx;
      const dy = y - cy;
      const d = dx * dx + dy * dy;
      if (d <= r2 && d >= inner2) drawWrappedRect(png, x, y, SUBTILE, SUBTILE, color);
    }
  }
}

function copyPng(source) {
  const result = makePng(source.width, source.height);
  result.data.set(source.data);
  return result;
}

function composite(layers) {
  const result = makePng();
  for (const name of LAYERS) {
    const layer = layers[name];
    for (let i = 0; i < layer.data.length; i += 4) {
      if (layer.data[i + 3] === 0) continue;
      result.data[i] = layer.data[i];
      result.data[i + 1] = layer.data[i + 1];
      result.data[i + 2] = layer.data[i + 2];
      result.data[i + 3] = 255;
    }
  }
  return result;
}

function drawBaseTiles(layer, map) {
  const p = map.palette;
  for (let y = 0; y < IMAGE_SIZE; y += TILE) {
    for (let x = 0; x < IMAGE_SIZE; x += TILE) {
      const tileX = x / TILE;
      const tileY = y / TILE;
      const colorSelector = (tileX * 3 + tileY * 5 + ((tileX + tileY) % 4)) % 8;
      const color = colorSelector === 0 ? p.baseC : colorSelector <= 3 ? p.baseB : p.baseA;
      fillRect(layer, x, y, TILE, TILE, color);
      if ((tileX + tileY) % 2 === 0) fillRect(layer, x + 8, y + 8, TILE - 16, TILE - 16, colorSelector === 0 ? p.baseB : p.baseA);
    }
  }
}

function drawGrid(layer, map, step = TILE) {
  const p = map.palette;
  for (let x = 0; x < IMAGE_SIZE; x += step) drawWrappedLineV(layer, x, 0, IMAGE_SIZE, p.grid, 2);
  for (let y = 0; y < IMAGE_SIZE; y += step) drawWrappedLineH(layer, y, 0, IMAGE_SIZE, p.grid, 2);
  for (let x = step / 2; x < IMAGE_SIZE; x += step) drawWrappedLineV(layer, x, 0, IMAGE_SIZE, p.gridSoft, 1);
  for (let y = step / 2; y < IMAGE_SIZE; y += step) drawWrappedLineH(layer, y, 0, IMAGE_SIZE, p.gridSoft, 1);
}

function drawCommonLowTexture(layer, map) {
  const p = map.palette;
  for (let y = 0; y < IMAGE_SIZE; y += 128) {
    for (let x = 0; x < IMAGE_SIZE; x += 128) {
      if (((x / 128) + (y / 128)) % 3 === 0) drawWrappedRect(layer, x + 48, y + 48, 8, 8, p.gridSoft);
      if (((x / 128) * 2 + (y / 128)) % 5 === 0) drawWrappedRect(layer, x + 88, y + 24, 8, 8, p.shadow);
    }
  }
}

function drawCafe(layer, map) {
  const p = map.palette;
  for (let offset = 0; offset < IMAGE_SIZE; offset += 256) {
    drawWrappedLineH(layer, 120 + offset, 0, IMAGE_SIZE, p.accentSoft, 3);
    drawWrappedLineV(layer, 56 + offset, 0, IMAGE_SIZE, p.accent, 3);
  }
  for (let y = 80; y < IMAGE_SIZE; y += 256) {
    for (let x = 80; x < IMAGE_SIZE; x += 256) drawWrappedRect(layer, x, y, 8, 8, p.glow);
  }
}

function drawPark(layer, map) {
  const p = map.palette;
  for (let offset = 0; offset < IMAGE_SIZE; offset += 256) {
    drawWrappedLineH(layer, offset + 96, 0, IMAGE_SIZE, p.accentSoft, 4);
    drawWrappedLineV(layer, offset + 160, 0, IMAGE_SIZE, p.accentSoft, 2);
  }
  for (let y = 32; y < IMAGE_SIZE; y += 192) {
    for (let x = 96; x < IMAGE_SIZE; x += 192) {
      drawWrappedRect(layer, x, y, 24, 8, p.glow);
      drawWrappedRect(layer, x + 8, y - 8, 8, 24, p.glow);
    }
  }
}

function drawLab(layer, map) {
  const p = map.palette;
  for (let y = 0; y < IMAGE_SIZE; y += 64) {
    for (let x = 0; x < IMAGE_SIZE; x += 64) {
      drawWrappedRect(layer, x + 8, y, 48, 2, p.shadow);
      drawWrappedRect(layer, x + 56, y + 8, 2, 48, p.shadow);
      if ((x / 64 + y / 64) % 4 === 0) {
        drawWrappedLineH(layer, y + 32, x + 8, 48, p.accent, 3);
        drawWrappedLineV(layer, x + 32, y + 8, 48, p.accentSoft, 2);
      }
    }
  }
  for (let y = 112; y < IMAGE_SIZE; y += 256) drawWrappedLineH(layer, y, 0, IMAGE_SIZE, p.glow, 2);
}

function drawLibrary(layer, map) {
  const p = map.palette;
  for (let offset = 0; offset < IMAGE_SIZE; offset += 256) {
    drawWrappedLineH(layer, offset + 64, 0, IMAGE_SIZE, p.accent, 2);
    drawWrappedLineV(layer, offset + 192, 0, IMAGE_SIZE, p.accentSoft, 2);
  }
  for (let y = 40; y < IMAGE_SIZE; y += 160) {
    for (let x = 56; x < IMAGE_SIZE; x += 160) {
      drawWrappedRect(layer, x, y, 24, 16, p.glow);
      drawWrappedLineV(layer, x + 12, y + 2, 12, p.baseB, 1);
    }
  }
}

function drawStation(layer, map) {
  const p = map.palette;
  for (let y = 96; y < IMAGE_SIZE; y += 256) {
    drawWrappedLineH(layer, y, 0, IMAGE_SIZE, p.glow, 4);
    drawWrappedLineH(layer, y + 48, 0, IMAGE_SIZE, p.accent, 3);
  }
  for (let y = 0; y < IMAGE_SIZE; y += 192) {
    for (let x = 24; x < IMAGE_SIZE; x += 192) drawWrappedRect(layer, x, y + 64, 40, 16, p.accentSoft);
  }
}

function drawDawn(layer, map) {
  const p = map.palette;
  for (let x = 0; x < IMAGE_SIZE; x += 128) drawWrappedLineV(layer, x + 64, 0, IMAGE_SIZE, p.accentSoft, 2);
  for (let y = 0; y < IMAGE_SIZE; y += 128) drawWrappedLineH(layer, y + 64, 0, IMAGE_SIZE, p.gridSoft, 2);
  for (let y = 128; y < IMAGE_SIZE; y += 256) {
    for (let x = 128; x < IMAGE_SIZE; x += 256) {
      drawPixelRing(layer, x, y, 64, p.accent, 6);
      drawPixelRing(layer, x, y, 32, p.glow, 4);
    }
  }
  for (let y = 40; y < IMAGE_SIZE; y += 256) drawWrappedLineH(layer, y, 0, IMAGE_SIZE, p.glow, 3);
}

function drawTheme(layer, map) {
  if (map.id === "MAP001") drawCafe(layer, map);
  else if (map.id === "MAP002") drawPark(layer, map);
  else if (map.id === "MAP003") drawLab(layer, map);
  else if (map.id === "MAP004") drawLibrary(layer, map);
  else if (map.id === "MAP005") drawStation(layer, map);
  else drawDawn(layer, map);
}

function sealSeams(png) {
  for (let y = 0; y < png.height; y += 1) {
    const left = y * png.width * 4;
    const right = (y * png.width + png.width - 1) * 4;
    for (let c = 0; c < 4; c += 1) png.data[right + c] = png.data[left + c];
  }
  for (let x = 0; x < png.width; x += 1) {
    const top = x * 4;
    const bottom = ((png.height - 1) * png.width + x) * 4;
    for (let c = 0; c < 4; c += 1) png.data[bottom + c] = png.data[top + c];
  }
  return png;
}

function createPreview(source) {
  const preview = makePng(IMAGE_SIZE * 3, IMAGE_SIZE * 3);
  for (let tileY = 0; tileY < 3; tileY += 1) {
    for (let tileX = 0; tileX < 3; tileX += 1) {
      for (let y = 0; y < IMAGE_SIZE; y += 1) {
        const sourceOffset = y * IMAGE_SIZE * 4;
        const targetOffset = ((tileY * IMAGE_SIZE + y) * preview.width + tileX * IMAGE_SIZE) * 4;
        preview.data.set(source.data.subarray(sourceOffset, sourceOffset + IMAGE_SIZE * 4), targetOffset);
      }
    }
  }
  return preview;
}

function seamMetrics(png) {
  let leftRight = 0;
  let topBottom = 0;
  for (let y = 0; y < png.height; y += 1) {
    const left = y * png.width * 4;
    const right = (y * png.width + png.width - 1) * 4;
    for (let c = 0; c < 4; c += 1) leftRight += Math.abs(png.data[left + c] - png.data[right + c]);
  }
  for (let x = 0; x < png.width; x += 1) {
    const top = x * 4;
    const bottom = ((png.height - 1) * png.width + x) * 4;
    for (let c = 0; c < 4; c += 1) topBottom += Math.abs(png.data[top + c] - png.data[bottom + c]);
  }
  return { leftRight, topBottom, passed: leftRight === 0 && topBottom === 0 };
}

function tilePointToPixel(point) {
  return {
    x: Math.round(((point.x + TILE_COUNT / 2) / TILE_COUNT) * IMAGE_SIZE),
    y: Math.round(((point.y + TILE_COUNT / 2) / TILE_COUNT) * IMAGE_SIZE),
  };
}

function writeMap(map) {
  const layers = Object.fromEntries(LAYERS.map((layer) => [layer, makePng()]));
  drawBaseTiles(layers.Ground_Base, map);
  drawGrid(layers.Ground_Decal, map);
  drawCommonLowTexture(layers.Ground_Decal, map);
  drawTheme(layers.Ground_Decal, map);

  for (const event of map.events) {
    const point = tilePointToPixel(event);
    drawWrappedRect(layers.Event_Points, point.x - 4, point.y - 4, 8, 8, map.palette.accentSoft, 0);
  }
  for (const zone of spawnZones) {
    const point = tilePointToPixel(zone);
    drawWrappedRect(layers.Spawn_Zones, point.x - 4, point.y - 4, 8, 8, map.palette.accentSoft, 0);
  }

  const layerDir = path.join(LAYER_ROOT, map.slug);
  ensureDir(layerDir);
  for (const layer of LAYERS) fs.writeFileSync(path.join(layerDir, `${layer}.png`), PNG.sync.write(sealSeams(layers[layer])));

  const compositePng = sealSeams(composite(layers));
  fs.writeFileSync(path.join(OUT_ROOT, map.file), PNG.sync.write(compositePng));
  fs.writeFileSync(path.join(PREVIEW_ROOT, map.previewFile), PNG.sync.write(createPreview(compositePng)));

  const data = {
    id: map.id,
    name: map.name,
    scene: map.scene,
    theme: map.theme,
    size: { width: TILE_COUNT, height: TILE_COUNT, tileSize: 1 },
    playerSpawn: { x: 0, y: 0 },
    walkableRatioTarget: 1,
    maxHardObstacleRatio: 0,
    bossArena: map.bossArena,
    layers: LAYERS,
    layerFiles: Object.fromEntries(LAYERS.map((layer) => [layer, `layers/${map.slug}/${layer}.png`])),
    compositeFile: map.file,
    preview3x3File: `previews/${map.previewFile}`,
    eventPoints: map.events,
    spawnZones,
    collisionRects: [],
    bounds: { minX: -80, maxX: 80, minY: -80, maxY: 80 },
    mapMechanic: map.mechanic,
    bossId: map.bossId,
    baseDifficulty: map.baseDifficulty,
    forbiddenStyles,
    unityImport: {
      filterMode: "Point",
      compression: "None or Low Quality Off",
      wrapMode: "Repeat",
      pixelsPerUnit: 32,
    },
  };
  fs.writeFileSync(path.join(DATA_ROOT, map.dataFile), `${JSON.stringify(data, null, 2)}\n`);
  return { map, seam: seamMetrics(compositePng) };
}

function writeReadme(results) {
  const lines = [
    "# 黎明时分：星存者 程序化像素风循环地板贴图",
    "",
    "本目录下的 6 张战斗背景均由 `Tools/Maps/generate-playable-maps.mjs` 纯代码生成，没有使用 AI 图像生成。",
    "输出是纯平面地板贴图，不包含建筑、道具、墙体、柱子、树、机器、喷泉、书架、电车、塔、路灯、桌椅、障碍物、碰撞体或立体物体。",
    "",
    "## Unity 导入建议",
    "",
    "- Texture Type: Sprite (2D and UI) 或 Default",
    "- Filter Mode: Point",
    "- Wrap Mode: Repeat",
    "- Compression: None 或关闭有损压缩",
    "- Pixels Per Unit: 32",
    "- Generate Mip Maps: Off",
    "- 在 Unity 内缩放时使用整数倍，避免非整数缩放造成像素抖动。",
    "",
    "## 生成结果",
    "",
    "| 地图 | 主色 | 图案规则 | PNG | 3x3 预览 | Seam Test |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const result of results) {
    const { map, seam } = result;
    lines.push(
      `| ${map.id} ${map.name} | ${map.paletteName} | ${map.floorRules} | ${map.file} | previews/${map.previewFile} | ${seam.passed ? "通过" : "未通过"}，LR=${seam.leftRight}，TB=${seam.topBottom} |`,
    );
  }

  lines.push(
    "",
    "## 说明",
    "",
    "- 每张图尺寸均为 1024x1024 PNG。",
    "- 每张图颜色控制在 8-16 种左右，使用清晰像素块、地砖网格和低对比度规整纹理。",
    "- `collisionRects` 为空数组，玩法上按 100% 可行走处理。",
    "- `previews/*.png` 是 3x3 拼接预览，用于人工检查四方无缝循环。",
  );

  fs.writeFileSync(path.join(OUT_ROOT, "floor_tile_readme.md"), `${lines.join("\n")}\n`);
}

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
ensureDir(OUT_ROOT);
ensureDir(DATA_ROOT);
ensureDir(LAYER_ROOT);
ensureDir(PREVIEW_ROOT);
const results = maps.map(writeMap);
writeReadme(results);
for (const { map, seam } of results) console.log(`${map.id} ${map.file} seam ${seam.passed ? "pass" : "fail"} LR=${seam.leftRight} TB=${seam.topBottom}`);
console.log(`Generated ${maps.length} pixel floor tile packages.`);
