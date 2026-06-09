import type { CatalogMonsterId } from "@/features/catalog/gameCatalog";

export type MapId = "MAP001" | "MAP002" | "MAP003" | "MAP004" | "MAP005" | "MAP006";
export type DifficultyId = "DIFF001" | "DIFF002" | "DIFF003" | "DIFF004";
export type MapMechanicId = "sweet_supply" | "moon_tide" | "laser_scan" | "page_storm" | "star_train" | "star_ring";

export type PhaseEnemyWeights = Array<{ id: CatalogMonsterId; weight: number }>;

export type GameMapConfig = {
  id: MapId;
  code: string;
  name: string;
  theme: string;
  description: string;
  recommendedPower: number;
  baseDifficulty: number;
  bossId: CatalogMonsterId;
  mechanic: MapMechanicId;
  mechanicName: string;
  mechanicTags: string[];
  unlockHint: string;
  defaultUnlocked: boolean;
  nextMapId?: MapId;
  normalFirstClearReward: string;
  firstClearCoins: Partial<Record<DifficultyId, number>>;
  phaseWeights: PhaseEnemyWeights[];
};

export type DifficultyPreset = {
  id: DifficultyId;
  name: string;
  description: string;
  unlockHint: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  spawnRateMultiplier: number;
  maxAliveMultiplier: number;
  eliteHpMultiplier: number;
  bossHpMultiplier: number;
  bossDamageMultiplier: number;
  xpMultiplier: number;
  coinRewardMultiplier: number;
  chestQualityBonus: number;
  mapEventChanceBonus: number;
};

const DEFAULT_PHASE_WEIGHTS: PhaseEnemyWeights[] = [
  [
    { id: "lost-dango", weight: 80 },
    { id: "patrol-robot", weight: 20 },
  ],
  [
    { id: "lost-dango", weight: 55 },
    { id: "patrol-robot", weight: 15 },
    { id: "sleepy-ghost", weight: 10 },
    { id: "repair-robot", weight: 20 },
  ],
  [
    { id: "lost-dango", weight: 40 },
    { id: "patrol-robot", weight: 18 },
    { id: "sleepy-ghost", weight: 12 },
    { id: "repair-robot", weight: 20 },
    { id: "cloud-spirit", weight: 10 },
  ],
  [
    { id: "lost-dango", weight: 30 },
    { id: "patrol-robot", weight: 16 },
    { id: "sleepy-ghost", weight: 14 },
    { id: "repair-robot", weight: 12 },
    { id: "alert-robot", weight: 8 },
    { id: "cloud-spirit", weight: 20 },
  ],
  [
    { id: "lost-dango", weight: 20 },
    { id: "patrol-robot", weight: 12 },
    { id: "sleepy-ghost", weight: 13 },
    { id: "repair-robot", weight: 10 },
    { id: "alert-robot", weight: 10 },
    { id: "cloud-spirit", weight: 35 },
  ],
];

export const MAP_CONFIGS: GameMapConfig[] = [
  {
    id: "MAP001",
    code: "MAP001",
    name: "星光咖啡厅",
    theme: "dream_cafe",
    description: "星光灯串下的梦境咖啡厅，新手星存者的第一场战斗。",
    recommendedPower: 1,
    baseDifficulty: 1,
    bossId: "giant-dango-king",
    mechanic: "sweet_supply",
    mechanicName: "甜点补给点",
    mechanicTags: ["甜点补给", "教学", "最终Build补强"],
    unlockHint: "默认解锁。",
    defaultUnlocked: true,
    nextMapId: "MAP002",
    normalFirstClearReward: "解锁月夜公园",
    firstClearCoins: { DIFF002: 800 },
    phaseWeights: DEFAULT_PHASE_WEIGHTS,
  },
  {
    id: "MAP002",
    code: "MAP002",
    name: "月夜公园",
    theme: "moon_park",
    description: "发光步道与月光潮汐交织，重点考验走位和包围处理。",
    recommendedPower: 2,
    baseDifficulty: 1.1,
    bossId: "nightmare-cat",
    mechanic: "moon_tide",
    mechanicName: "月光潮汐",
    mechanicTags: ["安全区", "包围压力", "拾取爽感"],
    unlockHint: "通关「星光咖啡厅 · 普通」后解锁。",
    defaultUnlocked: false,
    nextMapId: "MAP003",
    normalFirstClearReward: "解锁废弃研究所",
    firstClearCoins: { DIFF001: 500, DIFF002: 1000 },
    phaseWeights: [
      DEFAULT_PHASE_WEIGHTS[0],
      [
        { id: "lost-dango", weight: 35 },
        { id: "patrol-robot", weight: 25 },
        { id: "sleepy-ghost", weight: 40 },
      ],
      [
        { id: "patrol-robot", weight: 24 },
        { id: "sleepy-ghost", weight: 46 },
        { id: "cloud-spirit", weight: 30 },
      ],
      [
        { id: "patrol-robot", weight: 22 },
        { id: "sleepy-ghost", weight: 42 },
        { id: "cloud-spirit", weight: 36 },
      ],
      [
        { id: "sleepy-ghost", weight: 45 },
        { id: "cloud-spirit", weight: 40 },
        { id: "alert-robot", weight: 15 },
      ],
    ],
  },
  {
    id: "MAP003",
    code: "MAP003",
    name: "废弃研究所",
    theme: "tech_lab",
    description: "故障屏幕和激光扫描交错的轻科幻研究设施。",
    recommendedPower: 3,
    baseDifficulty: 1.22,
    bossId: "rogue-robot-mk01",
    mechanic: "laser_scan",
    mechanicName: "安全门与激光扫描",
    mechanicTags: ["激光扫描", "科技敌人", "路线压迫"],
    unlockHint: "通关「月夜公园 · 普通」后解锁。",
    defaultUnlocked: false,
    nextMapId: "MAP004",
    normalFirstClearReward: "解锁梦境图书馆",
    firstClearCoins: { DIFF001: 600, DIFF002: 1200 },
    phaseWeights: [
      [
        { id: "patrol-robot", weight: 70 },
        { id: "repair-robot", weight: 30 },
      ],
      [
        { id: "patrol-robot", weight: 48 },
        { id: "repair-robot", weight: 28 },
        { id: "alert-robot", weight: 24 },
      ],
      [
        { id: "patrol-robot", weight: 35 },
        { id: "repair-robot", weight: 26 },
        { id: "alert-robot", weight: 34 },
        { id: "cloud-spirit", weight: 5 },
      ],
      [
        { id: "patrol-robot", weight: 28 },
        { id: "repair-robot", weight: 24 },
        { id: "alert-robot", weight: 38 },
        { id: "cloud-spirit", weight: 10 },
      ],
      [
        { id: "repair-robot", weight: 25 },
        { id: "alert-robot", weight: 50 },
        { id: "cloud-spirit", weight: 25 },
      ],
    ],
  },
  {
    id: "MAP004",
    code: "MAP004",
    name: "梦境图书馆",
    theme: "dream_library",
    description: "漂浮书架、数据文字和书页风暴构成的高级地图。",
    recommendedPower: 4,
    baseDifficulty: 1.35,
    bossId: "forgotten-shadow",
    mechanic: "page_storm",
    mechanicName: "书页风暴",
    mechanicTags: ["推力干扰", "知识节点", "经验奖励"],
    unlockHint: "通关「废弃研究所 · 普通」后解锁。",
    defaultUnlocked: false,
    nextMapId: "MAP005",
    normalFirstClearReward: "解锁云端电车站与噩梦难度入口",
    firstClearCoins: { DIFF001: 800, DIFF002: 1500 },
    phaseWeights: [
      [
        { id: "sleepy-ghost", weight: 70 },
        { id: "cloud-spirit", weight: 30 },
      ],
      [
        { id: "sleepy-ghost", weight: 52 },
        { id: "cloud-spirit", weight: 28 },
        { id: "repair-robot", weight: 20 },
      ],
      [
        { id: "sleepy-ghost", weight: 45 },
        { id: "cloud-spirit", weight: 35 },
        { id: "repair-robot", weight: 20 },
      ],
      [
        { id: "sleepy-ghost", weight: 38 },
        { id: "cloud-spirit", weight: 36 },
        { id: "alert-robot", weight: 26 },
      ],
      [
        { id: "cloud-spirit", weight: 44 },
        { id: "sleepy-ghost", weight: 32 },
        { id: "alert-robot", weight: 24 },
      ],
    ],
  },
  {
    id: "MAP005",
    code: "MAP005",
    name: "云端电车站",
    theme: "sky_train",
    description: "云海中的未来电车站，高速敌人与动态轨道压缩路线。",
    recommendedPower: 5,
    baseDifficulty: 1.5,
    bossId: "starrail-conductor",
    mechanic: "star_train",
    mechanicName: "星轨电车",
    mechanicTags: ["高速路线", "轨道预警", "击退清怪"],
    unlockHint: "通关「梦境图书馆 · 普通」后解锁。",
    defaultUnlocked: false,
    nextMapId: "MAP006",
    normalFirstClearReward: "解锁黎明星环塔",
    firstClearCoins: { DIFF001: 1000, DIFF002: 1800 },
    phaseWeights: [
      [
        { id: "patrol-robot", weight: 60 },
        { id: "alert-robot", weight: 40 },
      ],
      [
        { id: "patrol-robot", weight: 42 },
        { id: "alert-robot", weight: 42 },
        { id: "cloud-spirit", weight: 16 },
      ],
      [
        { id: "patrol-robot", weight: 30 },
        { id: "alert-robot", weight: 48 },
        { id: "cloud-spirit", weight: 22 },
      ],
      [
        { id: "alert-robot", weight: 50 },
        { id: "patrol-robot", weight: 22 },
        { id: "cloud-spirit", weight: 28 },
      ],
      [
        { id: "alert-robot", weight: 54 },
        { id: "cloud-spirit", weight: 30 },
        { id: "repair-robot", weight: 16 },
      ],
    ],
  },
  {
    id: "MAP006",
    code: "MAP006",
    name: "黎明星环塔",
    theme: "dawn_ring_tower",
    description: "高空数据塔与星环结构交汇，混合前面地图机制的终局挑战。",
    recommendedPower: 6,
    baseDifficulty: 1.75,
    bossId: "dawn-core",
    mechanic: "star_ring",
    mechanicName: "星环相位",
    mechanicTags: ["多机制混合", "终局挑战", "高收益"],
    unlockHint: "通关「云端电车站 · 普通」后解锁。",
    defaultUnlocked: false,
    normalFirstClearReward: "解锁星蚀难度",
    firstClearCoins: { DIFF001: 1200, DIFF002: 2200, DIFF004: 3000 },
    phaseWeights: [
      [
        { id: "alert-robot", weight: 38 },
        { id: "sleepy-ghost", weight: 32 },
        { id: "cloud-spirit", weight: 30 },
      ],
      [
        { id: "alert-robot", weight: 36 },
        { id: "patrol-robot", weight: 24 },
        { id: "sleepy-ghost", weight: 20 },
        { id: "cloud-spirit", weight: 20 },
      ],
      [
        { id: "alert-robot", weight: 34 },
        { id: "repair-robot", weight: 20 },
        { id: "sleepy-ghost", weight: 22 },
        { id: "cloud-spirit", weight: 24 },
      ],
      [
        { id: "alert-robot", weight: 38 },
        { id: "repair-robot", weight: 18 },
        { id: "sleepy-ghost", weight: 20 },
        { id: "cloud-spirit", weight: 24 },
      ],
      [
        { id: "alert-robot", weight: 40 },
        { id: "repair-robot", weight: 22 },
        { id: "sleepy-ghost", weight: 18 },
        { id: "cloud-spirit", weight: 20 },
      ],
    ],
  },
];

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: "DIFF001",
    name: "普通",
    description: "标准体验，适合首次挑战和看内容。",
    unlockHint: "默认开放。",
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemySpeedMultiplier: 1,
    spawnRateMultiplier: 1,
    maxAliveMultiplier: 1,
    eliteHpMultiplier: 1,
    bossHpMultiplier: 1,
    bossDamageMultiplier: 1,
    xpMultiplier: 1,
    coinRewardMultiplier: 1,
    chestQualityBonus: 0,
    mapEventChanceBonus: 0,
  },
  {
    id: "DIFF002",
    name: "进阶",
    description: "敌人更密集，奖励更高，适合已理解武器和遗物的玩家。",
    unlockHint: "通关任意地图普通难度后解锁。",
    enemyHpMultiplier: 1.25,
    enemyDamageMultiplier: 1.15,
    enemySpeedMultiplier: 1.05,
    spawnRateMultiplier: 1.15,
    maxAliveMultiplier: 1.15,
    eliteHpMultiplier: 1.3,
    bossHpMultiplier: 1.35,
    bossDamageMultiplier: 1.15,
    xpMultiplier: 1.08,
    coinRewardMultiplier: 1.25,
    chestQualityBonus: 0.05,
    mapEventChanceBonus: 0.03,
  },
  {
    id: "DIFF003",
    name: "噩梦",
    description: "需要成熟Build和超武器，敌群组合更紧。",
    unlockHint: "通关任意3张地图进阶难度，或通关「梦境图书馆 · 普通」后解锁。",
    enemyHpMultiplier: 1.6,
    enemyDamageMultiplier: 1.35,
    enemySpeedMultiplier: 1.12,
    spawnRateMultiplier: 1.35,
    maxAliveMultiplier: 1.3,
    eliteHpMultiplier: 1.75,
    bossHpMultiplier: 1.9,
    bossDamageMultiplier: 1.4,
    xpMultiplier: 1.15,
    coinRewardMultiplier: 1.75,
    chestQualityBonus: 0.1,
    mapEventChanceBonus: 0.05,
  },
  {
    id: "DIFF004",
    name: "星蚀",
    description: "终局挑战，高风险高收益。",
    unlockHint: "通关「黎明星环塔 · 普通」后解锁。",
    enemyHpMultiplier: 2.1,
    enemyDamageMultiplier: 1.65,
    enemySpeedMultiplier: 1.2,
    spawnRateMultiplier: 1.6,
    maxAliveMultiplier: 1.45,
    eliteHpMultiplier: 2.4,
    bossHpMultiplier: 2.8,
    bossDamageMultiplier: 1.75,
    xpMultiplier: 1.25,
    coinRewardMultiplier: 2.5,
    chestQualityBonus: 0.18,
    mapEventChanceBonus: 0.08,
  },
];

export const MAP_CONFIG_BY_ID = Object.fromEntries(MAP_CONFIGS.map((map) => [map.id, map])) as Record<MapId, GameMapConfig>;
export const DIFFICULTY_PRESET_BY_ID = Object.fromEntries(DIFFICULTY_PRESETS.map((difficulty) => [difficulty.id, difficulty])) as Record<
  DifficultyId,
  DifficultyPreset
>;

export function getMapConfig(mapId: MapId) {
  return MAP_CONFIG_BY_ID[mapId] ?? MAP_CONFIGS[0];
}

export function getDifficultyPreset(difficultyId: DifficultyId) {
  return DIFFICULTY_PRESET_BY_ID[difficultyId] ?? DIFFICULTY_PRESETS[0];
}
