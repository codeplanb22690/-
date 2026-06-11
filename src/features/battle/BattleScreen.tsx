import {
  Album,
  Badge,
  Bookmark,
  CakeSlice,
  Coins,
  Clover,
  CupSoda,
  Expand,
  Gauge,
  Gift,
  House,
  Magnet,
  Orbit,
  Pause,
  Plane,
  Play,
  Skull,
  Sparkles,
  Star,
  TimerReset,
  type LucideIcon,
  Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MONSTER_CATALOG_BY_ID, RELIC_CATALOG, RELIC_CATALOG_BY_ID } from "@/features/catalog/gameCatalog";
import { characters } from "@/features/character-select/characters";
import { loadBattleImages } from "@/features/battle/battleAssetLoader";
import { createPixiBattleRenderer } from "@/features/battle/pixiBattleRenderer";
import difficultyCurveData from "@/features/battle/config/difficulty_curve.json";
import enemyTiersData from "@/features/battle/config/enemy_tiers.json";
import { getDifficultyPreset, getMapConfig } from "@/features/maps/mapConfigs";
import { getPlayableMapData, mapTileToWorld, PLAYABLE_MAP_TILE_WORLD_SIZE } from "@/features/maps/playableMapData";
import { useGameSettings } from "@/features/settings/useGameSettings";
import { BATTLE_PIXEL_WEAPON_DISPLAY_IMAGES } from "@/shared/assets/battlePixelAssets";
import { startBattleMusic, stopBattleMusic, updateBattleMusic } from "@/shared/audio/music";
import { playAudioEvent, prewarmBattleSfx } from "@/shared/audio/sfx";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CatalogMonsterId, CatalogRelicId } from "@/features/catalog/gameCatalog";
import type { BattleImageKey } from "@/features/battle/battleAssetLoader";
import type { PixiBattleRenderer } from "@/features/battle/pixiBattleRenderer";
import type { DifficultyId, DifficultyPreset, GameMapConfig, MapId } from "@/features/maps/mapConfigs";
import type { PlayableMapData, PlayableMapRect, PlayableMapSpawnZone, SpawnZoneDirection } from "@/features/maps/playableMapData";

type BattleScreenProps = {
  durationSeconds?: number;
  testFullBuild?: boolean;
  mapId?: MapId;
  difficultyId?: DifficultyId;
  archivedAchievements?: string[];
  isFirstMapDifficultyClear?: boolean;
  expectedClearUnlocks?: string[];
  onReturnMain: (summary?: BattleSummary) => void;
};

export type BattleSummary = {
  runId: string;
  outcome: Outcome;
  mapId: MapId;
  difficultyId: DifficultyId;
  bossId: MonsterId;
  duration: number;
  survivedTime: number;
  level: number;
  coins: number;
  weapons: Record<WeaponId, number>;
  evolvedWeapons: WeaponId[];
  relics: RelicId[];
  encounteredMonsters: MonsterId[];
  kills: number;
  eliteKills: number;
  damageTaken: number;
  lowHpTriggered: boolean;
  bossSpawned: boolean;
  bossDefeated: boolean;
  achievements: string[];
  timeLeft: number;
};

type Facing = "left" | "right";
type Overlay = "none" | "paused" | "level-up" | "chest" | "result";
type Outcome = "victory" | "defeat" | null;
type MonsterId = CatalogMonsterId;
type PickupType = "exp" | "coin" | "heal" | "chest" | "luckyStar" | "energyDrink" | "mysteryBox";
type ChestTier = "normal" | "rare" | "legendary";
type UpgradeKind =
  | "attack"
  | "attackSpeed"
  | "cooldown"
  | "moveSpeed"
  | "range"
  | "pickupRange"
  | "milkshakeDuration"
  | "mangoCake"
  | "strawberryMilkshake"
  | "starlightPaperPlane"
  | "luckyClover"
  | "moonBookmark"
  | "starPulse"
  | "starPulseEffect"
  | "relic"
  | "evolution";
type WeaponId = "mangoCake" | "strawberryMilkshake" | "starlightPaperPlane" | "luckyClover" | "moonBookmark" | "starPulse";
type RelicId = CatalogRelicId;
type ChestRewardKind = "coins" | "upgrade" | "relic" | "weapon";
type SpawnSide = "left" | "right" | "top" | "bottom";
type SpawnDirectionMode = "front" | "dual" | "tri" | "all";
type SpawnSideWeights = Record<SpawnSide, number>;
type ImageKey = BattleImageKey;
type BattleIconKey = UpgradeKind | WeaponId | RelicId | "coins" | "kills" | "chest";

type MonsterConfig = {
  id: MonsterId;
  name: string;
  availableAt: number;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  exp: number;
  drawSize: number;
  imageKey: ImageKey;
  isBoss?: boolean;
};

type EnemyRole = "fodder" | "runner" | "tank" | "ranged" | "shield" | "splitter" | "charger" | "surround";

type EnemyVariantConfig = {
  id: string;
  label: string;
  baseId: MonsterId;
  role: EnemyRole;
  minTime: number;
  weight: number;
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  radiusMultiplier: number;
  expMultiplier: number;
  earlyExpMultiplier?: number;
  expShard?: {
    chance: number;
    multiplier: number;
  };
  knockbackResistance: number;
  eliteChanceBonus?: number;
  shieldRatio?: number;
  damageReduction?: number;
  dash?: {
    cooldown: number;
    duration: number;
    speedMultiplier: number;
    triggerDistance: number;
    brakeDistance?: number;
    brakeSpeedMultiplier?: number;
  };
  ranged?: {
    range: number;
    keepDistance: number;
    cooldown: number;
    projectileSpeed: number;
    projectileRadius: number;
    damageMultiplier: number;
  };
  split?: {
    count: number;
    variantId: string;
    hpMultiplier: number;
  };
};

type SurroundWaveConfig = {
  enabled: boolean;
  interval: number;
  count: number;
  directionMode: SpawnDirectionMode;
  tierIds?: string[];
};

type BattlePhaseConfig = {
  id: string;
  name: string;
  start: number;
  end: number;
  directionMode: SpawnDirectionMode;
  spawnSideWeights?: SpawnSideWeights;
  spawnInterval: number;
  monsterLimit: number;
  spawnCount: number;
  eliteChance: number;
  expDropChance: number;
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  enemyTiers: string[];
  surroundWave: SurroundWaveConfig;
};

type PendingMonsterSpawn = {
  variantId: string;
  isElite: boolean;
  directionMode: SpawnDirectionMode;
  phaseIndex: number;
};

type DynamicDifficultyConfig = {
  sampleWindow: number;
  checkInterval: number;
  pressureMin: number;
  pressureMax: number;
  pressureRise: number;
  pressureFall: number;
  highKillRate: number;
  lowKillRate: number;
  safeDamageHits: number;
  dangerDamageHits: number;
  playerPowerPerLevel: number;
  playerPowerPerWeapon: number;
  playerPowerPerWeaponLevel: number;
  playerPowerPerEvolution: number;
  densityPerPressure: number;
  speedPerPressure: number;
  hpPerPressure: number;
  damagePerPressure: number;
  elitePerPressure: number;
  surroundPerPressure: number;
};

type DifficultyCurveConfig = {
  dynamic: DynamicDifficultyConfig;
  phases: BattlePhaseConfig[];
};

type PlayerStats = {
  maxHp: number;
  hp: number;
  luck: number;
  moveSpeed: number;
  attack: number;
  attackSpeed: number;
  critical: number;
  cooldown: number;
  range: number;
  milkshakeDuration: number;
  pickupRange: number;
  projectileCount: number;
};

type PlayerState = {
  x: number;
  y: number;
  frame: number;
  facing: Facing;
  isMoving: boolean;
};

type TouchStickState = {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

type Monster = {
  id: number;
  kind: MonsterId;
  variantId?: string;
  role?: EnemyRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  maxShieldHp?: number;
  damageReduction?: number;
  knockbackResistance?: number;
  radius: number;
  drawSize: number;
  dashUntil?: number;
  lastDashAt?: number;
  lastRangedAt?: number;
  splitVariantId?: string;
  splitCount?: number;
  splitHpMultiplier?: number;
  lastDamageAt: number;
  lastHitProjectileId: number;
  queryStamp: number;
  facing: Facing;
  isElite: boolean;
  isDying: boolean;
  dyingAt: number;
};

type Projectile = {
  id: number;
  weapon: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  damage: number;
  pierce: number;
  explosive: boolean;
  bornAt: number;
  customLifetimeMs?: number;
  hitCount: number;
  bounceSpeed?: number;
  orbitAngularSpeed?: number;
  orbitAngle?: number;
  orbitRadius?: number;
};

type Pickup = {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  value: number;
  chestTier?: ChestTier;
};

type DeathEvent = {
  kind: MonsterId;
  x: number;
  y: number;
  expValue: number;
  coinValue: number;
  shouldDropExp: boolean;
  isElite: boolean;
  isBoss: boolean;
  splitVariantId?: string;
  splitCount?: number;
  splitHpMultiplier?: number;
};

type EnemyProjectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  bornAt: number;
  lifetimeMs: number;
};

type MonsterSpatialGrid = {
  cellSize: number;
  cells: Map<number, Monster[]>;
  activeCellKeys: number[];
};

type PendingProjectileSpawn = {
  weapon: WeaponId;
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  pierce: number;
  explosive: boolean;
  options: ProjectileOptions;
};

type EngineState = {
  runId: string;
  mapConfig: GameMapConfig;
  playableMap: PlayableMapData;
  difficultyPreset: DifficultyPreset;
  duration: number;
  elapsed: number;
  timeLeft: number;
  bossSpawnAt: number;
  bossSpawned: boolean;
  outcome: Outcome;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  weapons: Record<WeaponId, number>;
  evolvedWeapons: Record<WeaponId, boolean>;
  relics: RelicId[];
  relicLevels: Partial<Record<RelicId, number>>;
  stats: PlayerStats;
  player: PlayerState;
  monsters: Monster[];
  projectiles: Projectile[];
  projectilePool: Projectile[];
  pendingProjectiles: PendingProjectileSpawn[];
  pendingProjectilePool: PendingProjectileSpawn[];
  pendingProjectileHead: number;
  projectileCollisionCursor: number;
  enemyProjectiles: EnemyProjectile[];
  pickups: Pickup[];
  pickupPool: Pickup[];
  deathQueue: DeathEvent[];
  pendingMonsterSpawns: PendingMonsterSpawn[];
  pendingMonsterSpawnHead: number;
  monsterSpatialGrid: MonsterSpatialGrid;
  targetCache: {
    target: Monster | null;
    updatedAt: number;
  };
  encounteredMonsters: Set<MonsterId>;
  kills: number;
  eliteKills: number;
  damageTaken: number;
  killEvents: number[];
  damageEvents: number[];
  lastAchievementCheckAt: number;
  director: {
    pressure: number;
    lastCheckAt: number;
    surroundClock: number;
  };
  archivedAchievements: Set<string>;
  unlockedAchievements: Set<string>;
  mapEvent: {
    nextAt: number;
    notice: string;
    noticeUntil: number;
  };
  nextMonsterId: number;
  nextProjectileId: number;
  nextEnemyProjectileId: number;
  nextPickupId: number;
  nextMonsterQueryStamp: number;
  lastWeaponFireAudioAt: number;
  spawnClock: number;
  eliteSpawnClock: number;
  fireClock: number;
  moonFireClock: number;
  weaponFireClocks: Record<WeaponId, number>;
  animationClock: number;
};

type UiState = {
  mapName: string;
  difficultyName: string;
  mapMechanicName: string;
  mapEventNotice: string;
  timeLeft: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  weapons: Record<WeaponId, number>;
  evolvedWeapons: Record<WeaponId, boolean>;
  relics: RelicId[];
  relicLevels: Partial<Record<RelicId, number>>;
  phaseName: string;
  bossSpawned: boolean;
  outcome: Outcome;
};

type UpgradeChoice = {
  id: string;
  kind: UpgradeKind;
  title: string;
  description: string;
  icon: BattleIconKey;
  weapon?: WeaponId;
  relic?: RelicId;
  highlighted?: boolean;
};

type ChestReward = {
  kind: ChestRewardKind;
  title: string;
  description: string;
  icon: BattleIconKey;
  coins?: number;
  upgrade?: UpgradeChoice;
  relic?: RelicId;
  weapon?: WeaponId;
  weaponLevels?: number;
};

type BattleAchievement = {
  id: string;
  title: string;
};

function createBattlePerfConfig() {
  const nav = typeof navigator === "undefined" ? null : navigator;
  const ua = nav?.userAgent ?? "";
  const isCoarsePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || Boolean(isCoarsePointer);
  const deviceMemory = Number((nav as Navigator & { deviceMemory?: number } | null)?.deviceMemory ?? 0);
  const hardwareConcurrency = nav?.hardwareConcurrency ?? 0;
  const isLowEndMobile = isMobile && ((deviceMemory > 0 && deviceMemory <= 4) || (hardwareConcurrency > 0 && hardwareConcurrency <= 4));

  return {
    isMobile,
    targetFps: isMobile ? 60 : 120,
    maxDpr: isLowEndMobile ? 1.25 : isMobile ? 1.5 : 2,
    renderScale: 1,
    hudUpdateIntervalMs: isMobile ? 180 : 120,
    monsterCollisionPasses: isMobile ? 2 : 3,
    maxPairCollisionMonsters: isMobile ? 70 : 90,
    maxPickups: isLowEndMobile ? 96 : isMobile ? 120 : 180,
    maxPlayerProjectiles: isLowEndMobile ? 48 : isMobile ? 64 : 120,
    maxEnemyProjectiles: isLowEndMobile ? 48 : isMobile ? 56 : 80,
    drawCullMargin: isMobile ? 96 : 140,
    deathQueueMaxEventsPerFrame: isMobile ? 8 : 12,
    deathQueueMaxPickupsPerFrame: isMobile ? 6 : 10,
    maxMonsterSpawnsPerFrame: isMobile ? 3 : 5,
    maxOffscreenRespawnsPerFrame: isMobile ? 2 : 4,
    spawnPositionAttempts: isMobile ? 4 : 7,
    maxPendingMonsterSpawns: isMobile ? 42 : 64,
    projectileSpawnsPerFrame: isMobile ? 6 : 12,
    maxPendingProjectileSpawns: isMobile ? 64 : 100,
    projectileCollisionChecksPerFrame: isMobile ? 32 : 72,
  };
}

const BATTLE_PERF_CONFIG = createBattlePerfConfig();
const BATTLE_DURATION_SECONDS = 15 * 60;
const PLAYER_RADIUS = 14;
const PLAYER_MAP_COLLISION_RADIUS = 10;
const CAKE_RADIUS = 20;
const BOOKMARK_RADIUS = 18;
const PLAYER_BASE_SPEED = 320;
const PICKUP_MAGNET_SPEED = 760;
const PICKUP_MAGNET_SPEED_OTHER = 540;
const PROJECTILE_OFFSCREEN_MARGIN = 240;
const MONSTER_DEATH_MS = 420;
const XINGLI_WALK_FRAMES = 5;
const MONSTER_COLLISION_PASSES = BATTLE_PERF_CONFIG.monsterCollisionPasses;
const MONSTER_COLLISION_GAP = 4;
const CONTACT_DAMAGE_COOLDOWN_MS = 520;
const BATTLE_TARGET_FPS = BATTLE_PERF_CONFIG.targetFps;
const BATTLE_FRAME_INTERVAL_MS = 1000 / BATTLE_TARGET_FPS;
const HUD_UPDATE_INTERVAL_MS = BATTLE_PERF_CONFIG.hudUpdateIntervalMs;
const TARGET_CACHE_INTERVAL_MS = BATTLE_PERF_CONFIG.isMobile ? 120 : 80;
const MAX_PAIR_COLLISION_MONSTERS = BATTLE_PERF_CONFIG.maxPairCollisionMonsters;
const MAX_PICKUPS = BATTLE_PERF_CONFIG.maxPickups;
const MAX_PLAYER_PROJECTILES = BATTLE_PERF_CONFIG.maxPlayerProjectiles;
const MAX_ENEMY_PROJECTILES = BATTLE_PERF_CONFIG.maxEnemyProjectiles;
const MAX_MONSTER_SPAWNS_PER_FRAME = BATTLE_PERF_CONFIG.maxMonsterSpawnsPerFrame;
const MAX_OFFSCREEN_RESPAWNS_PER_FRAME = BATTLE_PERF_CONFIG.maxOffscreenRespawnsPerFrame;
const SPAWN_POSITION_ATTEMPTS = BATTLE_PERF_CONFIG.spawnPositionAttempts;
const MAX_PENDING_MONSTER_SPAWNS = BATTLE_PERF_CONFIG.maxPendingMonsterSpawns;
const PROJECTILE_SPAWNS_PER_FRAME = BATTLE_PERF_CONFIG.projectileSpawnsPerFrame;
const MAX_PENDING_PROJECTILE_SPAWNS = BATTLE_PERF_CONFIG.maxPendingProjectileSpawns;
const PROJECTILE_COLLISION_CHECKS_PER_FRAME = BATTLE_PERF_CONFIG.projectileCollisionChecksPerFrame;
const MAX_WEAPON_FIRES_PER_FRAME = BATTLE_PERF_CONFIG.isMobile ? 1 : 2;
const WEAPON_FIRE_AUDIO_COOLDOWN_MS = BATTLE_PERF_CONFIG.isMobile ? 140 : 96;
const ENABLE_PLAYER_WEAPON_FIRE_SFX = false;
const ENABLE_PLAYER_HURT_SFX = false;
const ENABLE_MONSTER_PAIR_COLLISIONS = !BATTLE_PERF_CONFIG.isMobile;
const MAX_PLAYER_COLLISION_MONSTERS = BATTLE_PERF_CONFIG.isMobile ? 14 : 28;
const MONSTER_SPATIAL_CELL_SIZE = 220;
const MONSTER_SPATIAL_KEY_OFFSET = 32768;
const MONSTER_SPATIAL_KEY_STRIDE = 65536;
const MONSTER_MAX_QUERY_RADIUS = 130;
const EXP_PICKUP_MERGE_RADIUS = 48;
const DEATH_QUEUE_MAX_EVENTS_PER_FRAME = BATTLE_PERF_CONFIG.deathQueueMaxEventsPerFrame;
const DEATH_QUEUE_MAX_PICKUPS_PER_FRAME = BATTLE_PERF_CONFIG.deathQueueMaxPickupsPerFrame;
const WEAPON_COOLDOWNS: Record<WeaponId, { normal: number; evolved: number }> = {
  mangoCake: { normal: 1.16, evolved: 0.72 },
  strawberryMilkshake: { normal: 1.34, evolved: 0.78 },
  starlightPaperPlane: { normal: 1.46, evolved: 0.9 },
  luckyClover: { normal: 1.7, evolved: 0.95 },
  moonBookmark: { normal: 1.42, evolved: 0.76 },
  starPulse: { normal: 1.95, evolved: 1.05 },
};
const STAT_LIMITS = {
  maxHp: { min: 1, max: 220 },
  hp: { min: 0, max: 220 },
  luck: { min: 0, max: 0.8 },
  moveSpeed: { min: 0.65, max: 1.55 },
  attack: { min: 0.5, max: 2.6 },
  attackSpeed: { min: 0.7, max: 1.9 },
  cooldown: { min: 0.58, max: 1 },
  range: { min: 0.75, max: 1.75 },
  milkshakeDuration: { min: 1.6, max: 2.8 },
  pickupRange: { min: 90, max: 330 },
  projectileCount: { min: 0, max: 4 },
};
const MOVEMENT_KEYS = new Set(["w", "a", "s", "d"]);
const MAX_WEAPON_LEVEL: Record<WeaponId, number> = {
  mangoCake: 8,
  strawberryMilkshake: 8,
  starlightPaperPlane: 8,
  luckyClover: 8,
  moonBookmark: 8,
  starPulse: 8,
};
const MAX_RELIC_LEVEL = 7;
const WEAPON_IDS: WeaponId[] = ["mangoCake", "strawberryMilkshake", "starlightPaperPlane", "luckyClover", "moonBookmark", "starPulse"];
const MAX_WEAPON_SLOTS = 6;
const EMPTY_ARCHIVED_ACHIEVEMENTS: string[] = [];

const BATTLE_ACHIEVEMENTS: Record<string, BattleAchievement> = {
  firstSurvivor: { id: "firstSurvivor", title: "初次幸存" },
  level20: { id: "level20", title: "越战越勇" },
  weaponMaster: { id: "weaponMaster", title: "武器大师" },
  collector: { id: "collector", title: "收藏家" },
  clearExpert: { id: "clearExpert", title: "清场专家" },
  noDamage3: { id: "noDamage3", title: "无伤挑战" },
  eliteHunter: { id: "eliteHunter", title: "精英猎手" },
  finalSurvivor: { id: "finalSurvivor", title: "最终幸存者" },
};

const WEAPON_META: Record<
  WeaponId,
  { name: string; icon: BattleIconKey; relic: RelicId; evolvedName: string; normalDescription: string; evolvedDescription: string }
> = {
  mangoCake: {
    name: "芒果蛋糕",
    icon: "mangoCake",
    relic: "xingliHairpin",
    evolvedName: "彩虹千层蛋糕",
    normalDescription: "自动瞄准最近敌人发射甜点弹，升级后增加多发、穿透和爆炸",
    evolvedDescription: "自动瞄准最近敌人的高穿透爆裂甜点，命中后扩散甜点星尘",
  },
  strawberryMilkshake: {
    name: "草莓奶昔",
    icon: "strawberryMilkshake",
    relic: "strawberryShake",
    evolvedName: "甜梦奶昔风暴",
    normalDescription: "召唤奶昔杯环绕星黎，持续保护近身区域",
    evolvedDescription: "更大范围的奶昔风暴环绕星黎，持续压制靠近的敌人",
  },
  starlightPaperPlane: {
    name: "星光纸飞机",
    icon: "starlightPaperPlane",
    relic: "cafeCard",
    evolvedName: "银河信使",
    normalDescription: "自动瞄准最近敌人投出高速纸飞机，穿透成排敌群",
    evolvedDescription: "自动瞄准最近敌人的银河纸飞机，扩大扇形穿透清理成排敌群",
  },
  luckyClover: {
    name: "幸运四叶草",
    icon: "luckyClover",
    relic: "luckyCharm",
    evolvedName: "命运之轮",
    normalDescription: "向随机方向抛出四叶草，穿透路径上的敌人",
    evolvedDescription: "向随机方向爆发命运轮盘，穿透并爆炸，额外提高金币收益",
  },
  moonBookmark: {
    name: "月光书签",
    icon: "moonBookmark",
    relic: "moonBookmarkRelic",
    evolvedName: "满月书签阵",
    normalDescription: "朝最近敌人发射月光书签，命中后在敌群之间连续弹射",
    evolvedDescription: "满月书签高速锁敌弹射，增加弹射次数并连锁清理敌群",
  },
  starPulse: {
    name: "星轨脉冲",
    icon: "starPulse",
    relic: "dreamAlbum",
    evolvedName: "星穹审判",
    normalDescription: "锁定最近敌人脚下释放星轨脉冲，造成范围爆发",
    evolvedDescription: "锁定敌群脚下释放多道星穹光柱，造成大范围爆发",
  },
};

const MONSTER_CONFIGS: MonsterConfig[] = [
  { id: "lost-dango", name: "迷路团子", availableAt: 0, hp: 10, speed: 96, damage: 5, radius: 19, exp: 6, drawSize: 50, imageKey: "lost-dango" },
  { id: "patrol-robot", name: "巡逻机器人", availableAt: 0, hp: 8, speed: 124, damage: 5, radius: 22, exp: 6, drawSize: 56, imageKey: "patrol-robot" },
  { id: "sleepy-ghost", name: "失眠小幽灵", availableAt: 180, hp: 14, speed: 132, damage: 7, radius: 19, exp: 10, drawSize: 54, imageKey: "sleepy-ghost" },
  { id: "repair-robot", name: "维修机器人", availableAt: 180, hp: 28, speed: 82, damage: 9, radius: 20, exp: 13, drawSize: 56, imageKey: "repair-robot" },
  { id: "cloud-spirit", name: "乌云精灵", availableAt: 360, hp: 24, speed: 110, damage: 9, radius: 22, exp: 14, drawSize: 58, imageKey: "cloud-spirit" },
  { id: "alert-robot", name: "警戒机器人", availableAt: 540, hp: 22, speed: 148, damage: 8, radius: 21, exp: 15, drawSize: 58, imageKey: "alert-robot" },
  { id: "giant-dango-king", name: "巨型团子王", availableAt: 870, hp: 920, speed: 82, damage: 16, radius: 68, exp: 120, drawSize: 190, imageKey: "giant-dango-king", isBoss: true },
  { id: "nightmare-cat", name: "梦魇猫咪", availableAt: 870, hp: 840, speed: 98, damage: 16, radius: 62, exp: 120, drawSize: 176, imageKey: "nightmare-cat", isBoss: true },
  { id: "rogue-robot-mk01", name: "失控机器人MK-01", availableAt: 870, hp: 1040, speed: 76, damage: 18, radius: 70, exp: 130, drawSize: 190, imageKey: "rogue-robot-mk01", isBoss: true },
  { id: "forgotten-shadow", name: "遗忘之影", availableAt: 870, hp: 980, speed: 92, damage: 18, radius: 66, exp: 135, drawSize: 184, imageKey: "forgotten-shadow", isBoss: true },
  { id: "starrail-conductor", name: "星轨列车长", availableAt: 870, hp: 1120, speed: 104, damage: 19, radius: 70, exp: 140, drawSize: 188, imageKey: "starrail-conductor", isBoss: true },
  { id: "dawn-core", name: "黎明核心", availableAt: 870, hp: 1320, speed: 74, damage: 22, radius: 76, exp: 160, drawSize: 198, imageKey: "dawn-core", isBoss: true },
];

const DIFFICULTY_CURVE = difficultyCurveData as DifficultyCurveConfig;
const ENEMY_VARIANTS = (enemyTiersData as { variants: EnemyVariantConfig[] }).variants;
const ENEMY_VARIANT_BY_ID = Object.fromEntries(ENEMY_VARIANTS.map((variant) => [variant.id, variant])) as Record<string, EnemyVariantConfig>;
const MONSTER_CONFIG_BY_ID = Object.fromEntries(MONSTER_CONFIGS.map((config) => [config.id, config])) as Record<MonsterId, MonsterConfig>;
const BATTLE_PHASES = DIFFICULTY_CURVE.phases;

function compactArray<T>(items: T[], keep: (item: T) => boolean) {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
    const item = items[readIndex];
    if (!keep(item)) continue;
    items[writeIndex] = item;
    writeIndex += 1;
  }
  items.length = writeIndex;
}

const WEAPON_LEVELS = [
  { damage: 18, count: 1, speed: 900, pierce: 0, explosive: false },
  { damage: 25, count: 1, speed: 900, pierce: 0, explosive: false },
  { damage: 25, count: 2, speed: 900, pierce: 0, explosive: false },
  { damage: 25, count: 2, speed: 1080, pierce: 0, explosive: false },
  { damage: 25, count: 2, speed: 1080, pierce: 1, explosive: false },
  { damage: 25, count: 3, speed: 1080, pierce: 1, explosive: false },
  { damage: 30, count: 3, speed: 1080, pierce: 1, explosive: true },
  { damage: 34, count: 3, speed: 1080, pierce: 1, explosive: true },
];

const MOON_BOOKMARK_LEVELS = [
  { damage: 12, count: 2, speed: 620, pierce: 1 },
  { damage: 16, count: 2, speed: 680, pierce: 1 },
  { damage: 16, count: 3, speed: 700, pierce: 1 },
  { damage: 20, count: 3, speed: 760, pierce: 2 },
  { damage: 24, count: 4, speed: 800, pierce: 2 },
  { damage: 28, count: 4, speed: 860, pierce: 3 },
  { damage: 32, count: 5, speed: 900, pierce: 3 },
  { damage: 38, count: 5, speed: 940, pierce: 4 },
];

const UPGRADE_POOL: UpgradeChoice[] = [
  { id: "attack", kind: "attack", title: "星芒加压", description: "攻击力 +12", icon: "attack" },
  { id: "attackSpeed", kind: "attackSpeed", title: "甜点加速", description: "弹体速度 +12", icon: "attackSpeed" },
  { id: "cooldown", kind: "cooldown", title: "月光冷却", description: "发射冷却 -8", icon: "cooldown" },
  { id: "moveSpeed", kind: "moveSpeed", title: "轻羽步伐", description: "移动速度 +8", icon: "moveSpeed" },
  { id: "range", kind: "range", title: "甜点放大", description: "弹体尺寸 +12", icon: "range" },
  { id: "milkshakeDuration", kind: "milkshakeDuration", title: "奶昔留香", description: "奶昔持续 +0.25秒", icon: "milkshakeDuration" },
  { id: "pickupRange", kind: "pickupRange", title: "星尘磁场", description: "拾取范围 +30", icon: "pickupRange" },
];

const BATTLE_ICON_COMPONENTS: Record<BattleIconKey, LucideIcon> = {
  attack: Sparkles,
  attackSpeed: Gauge,
  cooldown: TimerReset,
  moveSpeed: Wind,
  range: Expand,
  pickupRange: Magnet,
  milkshakeDuration: CupSoda,
  mangoCake: CakeSlice,
  strawberryMilkshake: CupSoda,
  starlightPaperPlane: Plane,
  luckyClover: Clover,
  moonBookmark: Bookmark,
  starPulse: Orbit,
  starPulseEffect: Orbit,
  relic: Gift,
  evolution: Star,
  xingliHairpin: Star,
  cafeCard: Badge,
  dreamAlbum: Album,
  moonBookmarkRelic: Bookmark,
  luckyCharm: Clover,
  strawberryShake: CupSoda,
  coins: Coins,
  kills: Skull,
  chest: Gift,
};

const BATTLE_ICON_IMAGES: Partial<Record<BattleIconKey, string>> = {
  mangoCake: BATTLE_PIXEL_WEAPON_DISPLAY_IMAGES.mangoCake,
};

function BattleIcon({ icon, size = 30 }: { icon: BattleIconKey; size?: number }) {
  const image = BATTLE_ICON_IMAGES[icon];
  if (image) {
    return <img src={image} alt="" className="battle-icon-image" style={{ width: size + 16, height: size + 16 }} />;
  }

  const Icon = BATTLE_ICON_COMPONENTS[icon];
  return <Icon aria-hidden="true" size={size} strokeWidth={2.35} />;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampStats(stats: PlayerStats) {
  stats.maxHp = clampNumber(stats.maxHp, STAT_LIMITS.maxHp.min, STAT_LIMITS.maxHp.max);
  stats.hp = clampNumber(stats.hp, STAT_LIMITS.hp.min, Math.min(stats.maxHp, STAT_LIMITS.hp.max));
  stats.luck = clampNumber(stats.luck, STAT_LIMITS.luck.min, STAT_LIMITS.luck.max);
  stats.moveSpeed = clampNumber(stats.moveSpeed, STAT_LIMITS.moveSpeed.min, STAT_LIMITS.moveSpeed.max);
  stats.attack = clampNumber(stats.attack, STAT_LIMITS.attack.min, STAT_LIMITS.attack.max);
  stats.attackSpeed = clampNumber(stats.attackSpeed, STAT_LIMITS.attackSpeed.min, STAT_LIMITS.attackSpeed.max);
  stats.cooldown = clampNumber(stats.cooldown, STAT_LIMITS.cooldown.min, STAT_LIMITS.cooldown.max);
  stats.range = clampNumber(stats.range, STAT_LIMITS.range.min, STAT_LIMITS.range.max);
  stats.milkshakeDuration = clampNumber(stats.milkshakeDuration, STAT_LIMITS.milkshakeDuration.min, STAT_LIMITS.milkshakeDuration.max);
  stats.pickupRange = clampNumber(stats.pickupRange, STAT_LIMITS.pickupRange.min, STAT_LIMITS.pickupRange.max);
  stats.projectileCount = Math.round(clampNumber(stats.projectileCount, STAT_LIMITS.projectileCount.min, STAT_LIMITS.projectileCount.max));
}

function addStat(engine: EngineState, stat: keyof PlayerStats, amount: number) {
  engine.stats[stat] += amount;
  clampStats(engine.stats);
}

function canApplyStatUpgrade(engine: EngineState, choice: UpgradeChoice) {
  if (choice.kind === "attack") return engine.stats.attack < STAT_LIMITS.attack.max;
  if (choice.kind === "attackSpeed") return engine.stats.attackSpeed < STAT_LIMITS.attackSpeed.max;
  if (choice.kind === "cooldown") return engine.stats.cooldown > STAT_LIMITS.cooldown.min;
  if (choice.kind === "moveSpeed") return engine.stats.moveSpeed < STAT_LIMITS.moveSpeed.max;
  if (choice.kind === "range") return engine.stats.range < STAT_LIMITS.range.max;
  if (choice.kind === "milkshakeDuration") return engine.weapons.strawberryMilkshake > 0 && engine.stats.milkshakeDuration < STAT_LIMITS.milkshakeDuration.max;
  if (choice.kind === "pickupRange") return engine.stats.pickupRange < STAT_LIMITS.pickupRange.max;
  return true;
}

function getAvailableStatUpgrades(engine: EngineState) {
  return UPGRADE_POOL.filter((upgrade) => canApplyStatUpgrade(engine, upgrade));
}

function getUpgradeChoiceCount(engine: EngineState) {
  if (engine.stats.luck >= 0.75) return 4;
  if (engine.stats.luck >= 0.5) return 3;
  return 2;
}

function getProjectileSizeScale(engine: EngineState) {
  return engine.stats.range;
}

function getProjectileSpeed(engine: EngineState, speed: number) {
  return speed * engine.stats.attackSpeed;
}


function readMaxHealth() {
  const health = characters[0].stats.find((stat) => stat.kind === "health");
  const value = Number.parseFloat(health?.value ?? "100");
  return Number.isFinite(value) ? value : 100;
}

function formatTime(seconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getBattlePhase(elapsed: number) {
  return BATTLE_PHASES.find((phase) => elapsed >= phase.start && elapsed < phase.end) ?? BATTLE_PHASES[BATTLE_PHASES.length - 1];
}

function getBattlePhaseIndex(elapsed: number) {
  const index = BATTLE_PHASES.findIndex((phase) => elapsed >= phase.start && elapsed < phase.end);
  return index >= 0 ? index : BATTLE_PHASES.length - 1;
}

function getPhaseName(elapsed: number) {
  if (elapsed >= 840) return "15:00 最终BOSS预警";
  return getBattlePhase(elapsed).name;
}

function getTimelineElapsed(engine: EngineState) {
  return engine.duration <= 60 ? engine.elapsed * (BATTLE_DURATION_SECONDS / engine.duration) : engine.elapsed;
}

function getDynamicConfig() {
  return DIFFICULTY_CURVE.dynamic;
}

function getRecentEvents(events: number[], now: number, windowSeconds: number) {
  const cutoff = now - windowSeconds;
  while (events.length > 0 && events[0] < cutoff) events.shift();
  return events.length;
}

function getPlayerPowerScore(engine: EngineState) {
  const config = getDynamicConfig();
  const weaponLevels = WEAPON_IDS.reduce((sum, weapon) => sum + engine.weapons[weapon], 0);
  const weaponCount = getOwnedWeapons(engine).length;
  const evolutions = Object.values(engine.evolvedWeapons).filter(Boolean).length;
  return (
    engine.level * config.playerPowerPerLevel +
    weaponCount * config.playerPowerPerWeapon +
    weaponLevels * config.playerPowerPerWeaponLevel +
    evolutions * config.playerPowerPerEvolution
  );
}

function updateDynamicDifficulty(engine: EngineState) {
  const timelineElapsed = getTimelineElapsed(engine);
  const config = getDynamicConfig();
  getRecentEvents(engine.killEvents, timelineElapsed, config.sampleWindow);
  getRecentEvents(engine.damageEvents, timelineElapsed, config.sampleWindow);
  if (timelineElapsed - engine.director.lastCheckAt < config.checkInterval) return;

  engine.director.lastCheckAt = timelineElapsed;
  const killRate = (engine.killEvents.length / config.sampleWindow) * 20;
  const damageHits = engine.damageEvents.length;
  const powerScore = getPlayerPowerScore(engine);
  let pressureDelta = powerScore * 0.035;

  if (damageHits <= config.safeDamageHits && killRate >= config.highKillRate) pressureDelta += config.pressureRise;
  if (damageHits >= config.dangerDamageHits || killRate <= config.lowKillRate) pressureDelta -= config.pressureFall;
  if (timelineElapsed >= 540 && damageHits <= 1 && killRate >= config.highKillRate * 0.72) pressureDelta += config.pressureRise * 0.55;
  if (timelineElapsed >= 720 && damageHits <= 1) pressureDelta += config.pressureRise * 0.35;

  engine.director.pressure = clampNumber(engine.director.pressure + pressureDelta, config.pressureMin, config.pressureMax);
}

function getPressureScale(engine: EngineState, key: "densityPerPressure" | "speedPerPressure" | "hpPerPressure" | "damagePerPressure") {
  const config = getDynamicConfig();
  return Math.max(0.72, 1 + engine.director.pressure * config[key]);
}

function getPhaseSpawnInterval(engine: EngineState, phase: (typeof BATTLE_PHASES)[number]) {
  return Math.max(0.14, phase.spawnInterval / engine.difficultyPreset.spawnRateMultiplier / getPressureScale(engine, "densityPerPressure"));
}

function getPhaseMonsterLimit(engine: EngineState, phase: (typeof BATTLE_PHASES)[number]) {
  const scaledLimit = Math.round(phase.monsterLimit * engine.difficultyPreset.maxAliveMultiplier * getPressureScale(engine, "densityPerPressure"));
  return Math.min(engine.bossSpawned ? 112 : 140, Math.max(8, engine.bossSpawned ? Math.round(scaledLimit * 0.62) : scaledLimit));
}

function getPhaseEliteChance(engine: EngineState, phase: (typeof BATTLE_PHASES)[number], variant?: EnemyVariantConfig) {
  const pressureBonus = Math.max(0, engine.director.pressure) * getDynamicConfig().elitePerPressure;
  return Math.min(0.55, phase.eliteChance + engine.difficultyPreset.mapEventChanceBonus + pressureBonus + (variant?.eliteChanceBonus ?? 0));
}

function getEnemyVariant(monster: Monster) {
  return monster.variantId ? ENEMY_VARIANT_BY_ID[monster.variantId] : undefined;
}

function getAvailableEnemyVariants(engine: EngineState, phase: BattlePhaseConfig, overrideTierIds?: string[]) {
  const timelineElapsed = getTimelineElapsed(engine);
  const ids = overrideTierIds ?? phase.enemyTiers;
  const variants = ids
    .map((id) => ENEMY_VARIANT_BY_ID[id])
    .filter((variant): variant is EnemyVariantConfig => Boolean(variant) && variant.minTime <= timelineElapsed);
  if (variants.length > 0) return variants;
  return ENEMY_VARIANTS.filter((variant) => variant.minTime <= timelineElapsed);
}

function pickEnemyVariant(engine: EngineState, phase: BattlePhaseConfig, overrideTierIds?: string[]) {
  return pickWeighted(getAvailableEnemyVariants(engine, phase, overrideTierIds));
}

function getFallbackVariantForMonster(monsterId: MonsterId) {
  return ENEMY_VARIANTS.find((variant) => variant.baseId === monsterId);
}

function pickWeighted<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function tilePointToWorld(point: { x: number; y: number }) {
  return {
    x: mapTileToWorld(point.x),
    y: mapTileToWorld(point.y),
  };
}

function tileRectToWorld(rect: PlayableMapRect) {
  return {
    x: mapTileToWorld(rect.x),
    y: mapTileToWorld(rect.y),
    width: rect.width * PLAYABLE_MAP_TILE_WORLD_SIZE,
    height: rect.height * PLAYABLE_MAP_TILE_WORLD_SIZE,
  };
}

function clampToMapBounds(engine: EngineState, x: number, y: number, radius = 0) {
  void engine;
  void radius;
  return {
    x,
    y,
  };
}

function circleIntersectsRect(x: number, y: number, radius: number, rect: PlayableMapRect) {
  const worldRect = tileRectToWorld(rect);
  const closestX = Math.min(worldRect.x + worldRect.width, Math.max(worldRect.x, x));
  const closestY = Math.min(worldRect.y + worldRect.height, Math.max(worldRect.y, y));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function isMapPositionBlocked(engine: EngineState, x: number, y: number, radius: number) {
  return engine.playableMap.collisionRects.some((rect) => circleIntersectsRect(x, y, radius, rect));
}

function getMapEventWorldPoint(engine: EngineState) {
  const timelineElapsed = getTimelineElapsed(engine);
  const unlocked = engine.playableMap.eventPoints.filter((point) => point.unlockTime <= timelineElapsed);
  const point = pick(unlocked.length > 0 ? unlocked : engine.playableMap.eventPoints);
  return tilePointToWorld(point);
}

function zoneDirectionVector(direction: SpawnZoneDirection) {
  const vectors: Record<SpawnZoneDirection, { x: number; y: number }> = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    east: { x: 1, y: 0 },
    west: { x: -1, y: 0 },
    ne: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    nw: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    se: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    sw: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  };
  return vectors[direction];
}

function spawnSideToZoneDirections(side: SpawnSide): SpawnZoneDirection[] {
  if (side === "left") return ["west", "nw", "sw"];
  if (side === "right") return ["east", "ne", "se"];
  if (side === "top") return ["north", "ne", "nw"];
  return ["south", "se", "sw"];
}

function getMapSpawnZoneWeights(engine: EngineState, mode: SpawnDirectionMode, phase?: BattlePhaseConfig): Array<{ zone: PlayableMapSpawnZone; side: SpawnSide; weight: number }> {
  const timelineElapsed = getTimelineElapsed(engine);
  const unlockedZones = phase?.spawnSideWeights ? engine.playableMap.spawnZones : engine.playableMap.spawnZones.filter((zone) => zone.unlockTime <= timelineElapsed);
  const zones = unlockedZones.length > 0 ? unlockedZones : engine.playableMap.spawnZones;
  const sideWeights = phase?.spawnSideWeights
    ? (Object.entries(phase.spawnSideWeights) as Array<[SpawnSide, number]>).map(([side, weight]) => ({ side, weight }))
    : getSideSpawnWeights(engine, mode);
  const weightedZones = sideWeights.flatMap((sideEntry) => {
    const sideZones = zones.filter((zone) => spawnSideToZoneDirections(sideEntry.side).includes(zone.direction));
    const usableZones = sideZones.length > 0 ? sideZones : zones;
    return usableZones.map((zone) => {
      const zoneCenter = tilePointToWorld(zone);
      const distanceFromPlayer = Math.hypot(zoneCenter.x - engine.player.x, zoneCenter.y - engine.player.y);
      return {
        zone,
        side: sideEntry.side,
        weight: Math.max(1, sideEntry.weight / usableZones.length) * (distanceFromPlayer >= 480 ? 1 : 0.45),
      };
    });
  });
  return weightedZones.length > 0
    ? weightedZones
    : engine.playableMap.spawnZones.map((zone) => ({ zone, side: "top" as SpawnSide, weight: 1 }));
}

function getBossArenaWorldPoint(engine: EngineState) {
  return {
    x: mapTileToWorld(engine.playableMap.bossArena.centerX),
    y: mapTileToWorld(engine.playableMap.bossArena.centerY),
  };
}

function resetPlayerToMapSpawn(engine: EngineState) {
  const spawn = tilePointToWorld(engine.playableMap.playerSpawn);
  engine.player.x = spawn.x;
  engine.player.y = spawn.y;
}

function xpNeedFor(level: number) {
  return 8 + level * 6;
}

function createInitialEngine(
  durationSeconds: number,
  mapId: MapId = "MAP001",
  difficultyId: DifficultyId = "DIFF001",
  archivedAchievements: string[] = [],
  testFullBuild = false,
): EngineState {
  const mapConfig = getMapConfig(mapId);
  const playableMap = getPlayableMapData(mapId);
  const difficultyPreset = getDifficultyPreset(difficultyId);
  const maxHp = readMaxHealth();
  const engine: EngineState = {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mapConfig,
    playableMap,
    difficultyPreset,
    duration: durationSeconds,
    elapsed: 0,
    timeLeft: durationSeconds,
    bossSpawnAt: durationSeconds <= 60 ? Math.max(8, durationSeconds - 6) : 14.5 * 60,
    bossSpawned: false,
    outcome: null,
    level: 1,
    xp: 0,
    xpToNext: xpNeedFor(1),
    coins: 0,
    weapons: {
      mangoCake: 1,
      strawberryMilkshake: 0,
      starlightPaperPlane: 0,
      luckyClover: 0,
      moonBookmark: 0,
      starPulse: 0,
    },
    evolvedWeapons: {
      mangoCake: false,
      strawberryMilkshake: false,
      starlightPaperPlane: false,
      luckyClover: false,
      moonBookmark: false,
      starPulse: false,
    },
    relics: [],
    relicLevels: {},
    stats: {
      maxHp: maxHp + 15,
      hp: maxHp + 15,
      luck: 0.2,
      moveSpeed: 1,
      attack: 1,
      attackSpeed: 1,
      critical: 0.05,
      cooldown: 1,
      range: 1,
      milkshakeDuration: 1.6,
      pickupRange: 150,
      projectileCount: 0,
    },
    player: {
      x: mapTileToWorld(playableMap.playerSpawn.x),
      y: mapTileToWorld(playableMap.playerSpawn.y),
      frame: 0,
      facing: "right",
      isMoving: false,
    },
    monsters: [],
    projectiles: [],
    projectilePool: [],
    pendingProjectiles: [],
    pendingProjectilePool: [],
    pendingProjectileHead: 0,
    projectileCollisionCursor: 0,
    enemyProjectiles: [],
    pickups: [],
    pickupPool: [],
    deathQueue: [],
    pendingMonsterSpawns: [],
    pendingMonsterSpawnHead: 0,
    monsterSpatialGrid: {
      cellSize: MONSTER_SPATIAL_CELL_SIZE,
      cells: new Map(),
      activeCellKeys: [],
    },
    targetCache: {
      target: null,
      updatedAt: 0,
    },
    encounteredMonsters: new Set(),
    kills: 0,
    eliteKills: 0,
    damageTaken: 0,
    killEvents: [],
    damageEvents: [],
    lastAchievementCheckAt: 0,
    director: {
      pressure: 0,
      lastCheckAt: 0,
      surroundClock: 0,
    },
    archivedAchievements: new Set(archivedAchievements),
    unlockedAchievements: new Set(),
    mapEvent: {
      nextAt: Math.min(240, Math.max(45, mapConfig.mechanic === "sweet_supply" ? 240 : mapConfig.mechanic === "star_ring" ? 180 : 90)),
      notice: "",
      noticeUntil: 0,
    },
    nextMonsterId: 1,
    nextProjectileId: 1,
    nextEnemyProjectileId: 1,
    nextPickupId: 1,
    nextMonsterQueryStamp: 1,
    lastWeaponFireAudioAt: 0,
    spawnClock: 0,
    eliteSpawnClock: 0,
    fireClock: 0,
    moonFireClock: 0,
    weaponFireClocks: {
      mangoCake: 0,
      strawberryMilkshake: 0,
      starlightPaperPlane: 0,
      luckyClover: 0,
      moonBookmark: 0,
      starPulse: 0,
    },
    animationClock: 0,
  };

  if (testFullBuild) applyTestFullBuild(engine);
  return engine;
}

function applyTestFullBuild(engine: EngineState) {
  for (const weapon of WEAPON_IDS) {
    engine.weapons[weapon] = MAX_WEAPON_LEVEL[weapon];
    engine.evolvedWeapons[weapon] = true;
  }

  for (const relic of RELIC_CATALOG) {
    while (!isRelicMaxed(engine, relic.id)) applyRelic(engine, relic.id);
  }

  clampStats(engine.stats);
}

function uiFromEngine(engine: EngineState): UiState {
  return {
    mapName: engine.mapConfig.name,
    difficultyName: engine.difficultyPreset.name,
    mapMechanicName: engine.mapConfig.mechanicName,
    mapEventNotice: performance.now() < engine.mapEvent.noticeUntil ? engine.mapEvent.notice : "",
    timeLeft: engine.timeLeft,
    hp: engine.stats.hp,
    maxHp: engine.stats.maxHp,
    level: engine.level,
    xp: engine.xp,
    xpToNext: engine.xpToNext,
    coins: engine.coins,
    weapons: { ...engine.weapons },
    evolvedWeapons: { ...engine.evolvedWeapons },
    relics: [...engine.relics],
    relicLevels: { ...engine.relicLevels },
    phaseName: getPhaseName(getTimelineElapsed(engine)),
    bossSpawned: engine.bossSpawned,
    outcome: engine.outcome,
  };
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function isWeaponId(value: string): value is WeaponId {
  return WEAPON_IDS.includes(value as WeaponId);
}

function getOwnedWeapons(engine: EngineState) {
  return WEAPON_IDS.filter((weapon) => engine.weapons[weapon] > 0);
}

function hasRelic(engine: EngineState, relic: RelicId) {
  return engine.relics.includes(relic);
}

function getRelicConfig(relic: RelicId) {
  return RELIC_CATALOG_BY_ID[relic] ?? RELIC_CATALOG[0];
}

function getRelicLevel(engine: EngineState, relic: RelicId) {
  return engine.relicLevels[relic] ?? 0;
}

function isRelicMaxed(engine: EngineState, relic: RelicId) {
  return getRelicLevel(engine, relic) >= MAX_RELIC_LEVEL;
}

function getSuperWeaponRelic(weapon: WeaponId): RelicId {
  return WEAPON_META[weapon].relic;
}

function getSuperWeaponTitle(weapon: WeaponId) {
  return WEAPON_META[weapon].evolvedName;
}

function canEvolveWeapon(engine: EngineState, weapon: WeaponId) {
  const relic = getSuperWeaponRelic(weapon);
  return !engine.evolvedWeapons[weapon] && engine.weapons[weapon] >= MAX_WEAPON_LEVEL[weapon] && isRelicMaxed(engine, relic);
}

function createEvolutionChoice(weapon: WeaponId): UpgradeChoice {
  return {
    id: `evolution-${weapon}`,
    kind: "evolution",
    title: `终极合成：${getSuperWeaponTitle(weapon)}`,
    description: WEAPON_META[weapon].evolvedDescription,
    icon: "evolution",
    weapon,
    highlighted: true,
  };
}

function getEvolutionChoices(engine: EngineState) {
  return WEAPON_IDS.filter((weapon) => canEvolveWeapon(engine, weapon)).map((weapon) => createEvolutionChoice(weapon));
}

function createWeaponChoice(engine: EngineState, weapon: WeaponId): UpgradeChoice | null {
  if (engine.evolvedWeapons[weapon] || engine.weapons[weapon] >= MAX_WEAPON_LEVEL[weapon]) return null;
  if (engine.weapons[weapon] <= 0 && getOwnedWeapons(engine).length >= MAX_WEAPON_SLOTS) return null;
  const level = engine.weapons[weapon];
  return {
    id: `weapon-${weapon}`,
    kind: weapon,
    title: level > 0 ? `${WEAPON_META[weapon].name} Lv${level}->Lv${level + 1}` : `新武器：${WEAPON_META[weapon].name}`,
    description: level > 0 ? `强化：${WEAPON_META[weapon].normalDescription}` : WEAPON_META[weapon].normalDescription,
    icon: WEAPON_META[weapon].icon,
    weapon,
  };
}

function describeRelicLevel(relic: RelicId, level: number) {
  if (relic === "xingliHairpin") return `幸运 +${level * 5}% 档位，后台提升升级选项数`;
  if (relic === "cafeCard") return `经验获取 +${level * 5}% 档位`;
  if (relic === "dreamAlbum") return `掉落率 +${level * 7}% 档位`;
  if (relic === "moonBookmarkRelic") return `发射冷却 -${Math.round(level * 3.5)}% 档位`;
  if (relic === "luckyCharm") return `宝箱品质 +${Math.round(level * 5)}% 档位`;
  return `最大生命值 +${level * 8}`;
}

function createRelicChoice(engine: EngineState, forcedRelic?: RelicId): UpgradeChoice | null {
  const upgradeableRelics = engine.relics.filter((relic) => !isRelicMaxed(engine, relic));
  const availableRelics = RELIC_CATALOG.filter((relic) => !hasRelic(engine, relic.id));
  const relic =
    forcedRelic && (hasRelic(engine, forcedRelic) || engine.relics.length < 6)
      ? getRelicConfig(forcedRelic)
      : upgradeableRelics.length > 0
        ? getRelicConfig(pick(upgradeableRelics))
        : availableRelics.length > 0
          ? pick(availableRelics)
          : null;
  if (!relic) return null;
  const currentLevel = getRelicLevel(engine, relic.id);
  const nextLevel = Math.min(MAX_RELIC_LEVEL, currentLevel + 1);
  return {
    id: `relic-${relic.id}`,
    kind: "relic",
    title: currentLevel > 0 ? `${relic.name} Lv${currentLevel}->Lv${nextLevel}` : `新遗物：${relic.name}`,
    description: currentLevel > 0 ? describeRelicLevel(relic.id, nextLevel) : relic.effect,
    icon: relic.id,
    relic: relic.id,
  };
}

function isCoreProgressionComplete(engine: EngineState, evolutionChoices: UpgradeChoice[]) {
  const weaponsComplete = WEAPON_IDS.every((weapon) => engine.evolvedWeapons[weapon] || engine.weapons[weapon] >= MAX_WEAPON_LEVEL[weapon]);
  const relicsComplete = RELIC_CATALOG.every((relic) => isRelicMaxed(engine, relic.id));
  return weaponsComplete && relicsComplete && evolutionChoices.length === 0;
}

function pickUpgradeChoices(engine: EngineState) {
  const choices: UpgradeChoice[] = [];
  const evolutionChoices = getEvolutionChoices(engine);
  if (isCoreProgressionComplete(engine, evolutionChoices)) return choices;
  choices.push(...evolutionChoices);
  const targetChoiceCount = Math.max(getUpgradeChoiceCount(engine), choices.length);

  const guidedChoice =
    engine.level === 2
      ? UPGRADE_POOL.find((upgrade) => upgrade.kind === "range")
      : engine.level === 3
        ? UPGRADE_POOL.find((upgrade) => upgrade.kind === "attackSpeed")
        : engine.level === 4
          ? createWeaponChoice(engine, "strawberryMilkshake") ?? createWeaponChoice(engine, "moonBookmark")
          : engine.level === 5
            ? createRelicChoice(engine, "cafeCard") ?? UPGRADE_POOL.find((upgrade) => upgrade.kind === "pickupRange")
            : engine.level === 6
              ? createRelicChoice(engine, getSuperWeaponRelic("mangoCake"))
              : null;
  if (choices.length < targetChoiceCount && guidedChoice && canApplyStatUpgrade(engine, guidedChoice) && !choices.some((choice) => choice.id === guidedChoice.id)) choices.push(guidedChoice);

  const weaponPool = WEAPON_IDS.map((weapon) => createWeaponChoice(engine, weapon)).filter((choice): choice is UpgradeChoice => Boolean(choice));
  const ownedWeapons = getOwnedWeapons(engine);
  const weightedWeaponPool =
    ownedWeapons.length < 2
      ? [...weaponPool, ...weaponPool.filter((choice) => choice.weapon && engine.weapons[choice.weapon] <= 0)]
      : weaponPool;
  const relicChoice = engine.level >= 6 || engine.relics.length === 0 ? createRelicChoice(engine) : null;
  const pool = relicChoice ? [...getAvailableStatUpgrades(engine), ...weightedWeaponPool, relicChoice] : [...getAvailableStatUpgrades(engine), ...weightedWeaponPool];
  let attempts = 0;
  while (choices.length < targetChoiceCount && choices.length < pool.length && attempts < 48) {
    attempts += 1;
    const choice = pick(pool);
    if (!choices.some((item) => item.id === choice.id)) choices.push(choice);
  }
  return choices;
}

function applyUpgrade(engine: EngineState, choice: UpgradeChoice) {
  if (choice.kind === "attack") addStat(engine, "attack", 0.12);
  if (choice.kind === "attackSpeed") addStat(engine, "attackSpeed", 0.12);
  if (choice.kind === "cooldown") addStat(engine, "cooldown", -0.08);
  if (choice.kind === "moveSpeed") addStat(engine, "moveSpeed", 0.08);
  if (choice.kind === "range") addStat(engine, "range", 0.12);
  if (choice.kind === "milkshakeDuration") addStat(engine, "milkshakeDuration", 0.25);
  if (choice.kind === "pickupRange") addStat(engine, "pickupRange", 30);
  if (isWeaponId(choice.kind)) engine.weapons[choice.kind] = Math.min(MAX_WEAPON_LEVEL[choice.kind], engine.weapons[choice.kind] + 1);
  if (choice.kind === "relic" && choice.relic) applyRelic(engine, choice.relic);
  if (choice.kind === "evolution" && choice.weapon) engine.evolvedWeapons[choice.weapon] = true;
  clampStats(engine.stats);
}

function applyRelic(engine: EngineState, relic: RelicId) {
  if (!hasRelic(engine, relic)) {
    if (engine.relics.length >= 6) return;
    engine.relics.push(relic);
  }
  if (isRelicMaxed(engine, relic)) return;
  engine.relicLevels[relic] = getRelicLevel(engine, relic) + 1;
  if (relic === "xingliHairpin") addStat(engine, "luck", 0.05);
  if (relic === "moonBookmarkRelic") addStat(engine, "cooldown", -0.035);
  if (relic === "strawberryShake") {
    engine.stats.maxHp += 8;
    engine.stats.hp = Math.min(engine.stats.maxHp, engine.stats.hp + 8);
  }
  clampStats(engine.stats);
}

function applyChestReward(engine: EngineState, reward: ChestReward) {
  if (reward.kind === "coins") engine.coins += reward.coins ?? 0;
  if (reward.kind === "upgrade" && reward.upgrade) applyUpgrade(engine, reward.upgrade);
  if (reward.kind === "relic" && reward.relic) applyRelic(engine, reward.relic);
  if (reward.kind === "weapon" && reward.weapon) {
    engine.weapons[reward.weapon] = Math.min(
      MAX_WEAPON_LEVEL[reward.weapon],
      engine.weapons[reward.weapon] + (reward.weaponLevels ?? 1),
    );
  }
}

function getCompletionCoins(engine: EngineState, source: "level" | ChestTier) {
  const tierBonus = source === "legendary" ? 42 : source === "rare" ? 28 : source === "normal" ? 18 : 12;
  return Math.round((tierBonus + Math.min(42, Math.floor(engine.level * 1.5))) * engine.difficultyPreset.coinRewardMultiplier);
}

function createCompletionCoinReward(engine: EngineState, source: "level" | ChestTier): ChestReward {
  const coins = getCompletionCoins(engine, source);
  return {
    kind: "coins",
    title: `${coins} 金币`,
    description: "所有可成长项已耗尽，自动转化为金币",
    icon: "coins",
    coins,
  };
}

function grantCompletionCoins(engine: EngineState, source: "level" | ChestTier) {
  const coins = getCompletionCoins(engine, source);
  engine.coins += coins;
  return coins;
}

function getMonsterCollisionRadius(kind: MonsterId, isElite = false) {
  return MONSTER_CATALOG_BY_ID[kind].collisionRadius * (isElite ? 1.25 : 1);
}

function getXpValue(engine: EngineState, base: number) {
  return Math.round(base * engine.difficultyPreset.xpMultiplier * (1 + getRelicLevel(engine, "cafeCard") * 0.05));
}

function getMonsterExpDropValue(engine: EngineState, config: MonsterConfig, monster: Monster, variant?: EnemyVariantConfig) {
  let expValue = config.exp * (variant?.expMultiplier ?? 1) * (monster.isElite ? 3 : 1);
  const timelineElapsed = getTimelineElapsed(engine);
  if (!config.isBoss && timelineElapsed < 360) {
    expValue *= variant?.earlyExpMultiplier ?? 0.68;
    if (variant?.expShard && Math.random() < variant.expShard.chance) expValue *= variant.expShard.multiplier;
  }
  return Math.max(1, getXpValue(engine, expValue));
}

function shouldDropMonsterExp(engine: EngineState, config: MonsterConfig, monster: Monster) {
  if (config.isBoss) return true;
  const phase = getBattlePhase(getTimelineElapsed(engine));
  const eliteBonus = monster.isElite ? 0.18 : 0;
  return Math.random() < Math.min(1, phase.expDropChance + eliteBonus);
}

function createChestReward(engine: EngineState, tier: ChestTier): ChestReward {
  const availableRelics = RELIC_CATALOG.filter((relic) => !hasRelic(engine, relic.id));
  const candidates: ChestReward[] = [];
  const upgradePool = pickUpgradeChoices(engine);

  for (const upgrade of upgradePool) {
    candidates.push({
      kind: "upgrade",
      title: upgrade.title,
      description: upgrade.description,
      icon: upgrade.icon,
      upgrade,
    });
  }

  if (availableRelics.length > 0) {
    const relic = pick(availableRelics);
    candidates.push({
      kind: "relic",
      title: relic.name,
      description: relic.effect,
      icon: relic.id,
      relic: relic.id,
    });
  }

  const chestWeaponChoices = WEAPON_IDS.map((weapon) => createWeaponChoice(engine, weapon)).filter((choice): choice is UpgradeChoice => Boolean(choice));
  const weaponReward = chestWeaponChoices.length > 0 ? pick(chestWeaponChoices) : null;
  if (weaponReward?.weapon) {
    candidates.push({
      kind: "weapon",
      title: weaponReward.title,
      description: weaponReward.description,
      icon: weaponReward.icon,
      weapon: weaponReward.weapon,
      weaponLevels: tier === "normal" ? 1 : 2,
    });
  }

  const legendaryWeapon = WEAPON_IDS.find((weapon) => engine.weapons[weapon] > 0 && engine.weapons[weapon] < MAX_WEAPON_LEVEL[weapon] && !engine.evolvedWeapons[weapon]);
  if (tier === "legendary" && legendaryWeapon) {
    candidates.push({
      kind: "weapon",
      title: `${WEAPON_META[legendaryWeapon].name}满载`,
      description: `${WEAPON_META[legendaryWeapon].name}直升 Lv8`,
      icon: WEAPON_META[legendaryWeapon].icon,
      weapon: legendaryWeapon,
      weaponLevels: MAX_WEAPON_LEVEL[legendaryWeapon],
    });
  }

  if (candidates.length === 0) return createCompletionCoinReward(engine, tier);
  return pick(candidates);
}

function pickChestRewards(engine: EngineState, tier: ChestTier) {
  const rewards: ChestReward[] = [];
  const choiceCount = tier === "legendary" ? 4 : 3;
  let attempts = 0;
  while (rewards.length < choiceCount && attempts < 24) {
    attempts += 1;
    const reward = createChestReward(engine, tier);
    const key = reward.relic ?? reward.upgrade?.kind ?? reward.weapon ?? reward.kind;
    const duplicate = rewards.some((item) => (item.relic ?? item.upgrade?.kind ?? item.weapon ?? item.kind) === key);
    if (!duplicate) rewards.push(reward);
  }
  if (rewards.length === 0) return [createCompletionCoinReward(engine, tier)];
  return rewards.slice(0, choiceCount);
}

function getForwardSide(engine: EngineState): SpawnSide {
  if (engine.player.isMoving) {
    const recentX = engine.player.facing === "right" ? 1 : -1;
    return Math.abs(recentX) >= 1 ? (recentX > 0 ? "right" : "left") : "bottom";
  }
  return engine.player.facing === "right" ? "right" : "left";
}

function getOppositeSide(side: SpawnSide): SpawnSide {
  if (side === "left") return "right";
  if (side === "right") return "left";
  if (side === "top") return "bottom";
  return "top";
}

function getSideSpawnWeights(engine: EngineState, mode: SpawnDirectionMode): Array<{ side: SpawnSide; weight: number }> {
  const front = getForwardSide(engine);
  const back = getOppositeSide(front);
  const perpendicular: SpawnSide[] = front === "left" || front === "right" ? ["top", "bottom"] : ["left", "right"];
  if (mode === "front") {
    return [
      { side: front, weight: 62 },
      { side: perpendicular[0], weight: 15 },
      { side: perpendicular[1], weight: 15 },
      { side: back, weight: 8 },
    ];
  }
  if (mode === "dual") {
    return [
      { side: front, weight: 55 },
      { side: back, weight: 45 },
    ];
  }
  if (mode === "tri") {
    return [
      { side: front, weight: 42 },
      { side: perpendicular[0], weight: 29 },
      { side: perpendicular[1], weight: 29 },
    ];
  }
  return [
    { side: "left", weight: 25 },
    { side: "right", weight: 25 },
    { side: "top", weight: 25 },
    { side: "bottom", weight: 25 },
  ];
}

function spawnMonsterAt(
  engine: EngineState,
  config: MonsterConfig,
  point: { x: number; y: number },
  isElite = false,
  variant?: EnemyVariantConfig,
  hpMultiplierOverride = 1,
) {
  engine.encounteredMonsters.add(config.id);
  const radius = getMonsterCollisionRadius(config.id, isElite) * (variant?.radiusMultiplier ?? 1);
  const drawSize = config.drawSize * (variant?.radiusMultiplier ?? 1) * (isElite ? 1.22 : 1);
  const safePoint = clampToMapBounds(engine, point.x, point.y, radius);
  const maxHp = Math.max(1, Math.round(getSpawnMonsterHp(engine, config, isElite, variant) * hpMultiplierOverride));
  const shieldHp = variant?.shieldRatio ? Math.round(maxHp * variant.shieldRatio) : undefined;
  const monster: Monster = {
    id: engine.nextMonsterId,
    kind: config.id,
    variantId: variant?.id,
    role: variant?.role,
    x: safePoint.x,
    y: safePoint.y,
    hp: maxHp,
    maxHp,
    shieldHp,
    maxShieldHp: shieldHp,
    damageReduction: variant?.damageReduction,
    knockbackResistance: variant?.knockbackResistance,
    radius,
    drawSize,
    dashUntil: 0,
    lastDashAt: 0,
    lastRangedAt: 0,
    splitVariantId: variant?.split?.variantId,
    splitCount: variant?.split?.count,
    splitHpMultiplier: variant?.split?.hpMultiplier,
    lastDamageAt: -Infinity,
    lastHitProjectileId: 0,
    queryStamp: 0,
    facing: safePoint.x > engine.player.x ? "left" : "right",
    isElite,
    isDying: false,
    dyingAt: 0,
  };
  engine.nextMonsterId += 1;
  engine.monsters.push(monster);
}

function spawnAtEdge(
  engine: EngineState,
  width: number,
  height: number,
  zoom: number,
  config: MonsterConfig,
  isElite = false,
  directionMode: SpawnDirectionMode = "all",
  variant?: EnemyVariantConfig,
  phase?: BattlePhaseConfig,
) {
  const halfWidth = width / 2 / zoom;
  const halfHeight = height / 2 / zoom;
  const margin = 120;
  const radius = getMonsterCollisionRadius(config.id, isElite) * (variant?.radiusMultiplier ?? 1);
  const spawnWeights = getMapSpawnZoneWeights(engine, directionMode, phase);
  const createPoint = () => {
    const spawnEntry = pickWeighted(spawnWeights);
    const zone = spawnEntry.zone;
    const direction = zoneDirectionVector(zone.direction);
    const edgeDistance =
      Math.max(
        Math.abs(direction.x) > 0 ? halfWidth / Math.abs(direction.x) : 0,
        Math.abs(direction.y) > 0 ? halfHeight / Math.abs(direction.y) : 0,
      ) + margin;
    const perp = { x: -direction.y, y: direction.x };
    const jitter = (Math.random() - 0.5) * Math.min(halfWidth, halfHeight) * 1.2;
    const candidate = clampToMapBounds(
      engine,
      engine.player.x + direction.x * edgeDistance + perp.x * jitter,
      engine.player.y + direction.y * edgeDistance + perp.y * jitter,
      radius,
    );
    if (!isMapPositionBlocked(engine, candidate.x, candidate.y, radius)) return { point: candidate, side: spawnEntry.side };
    return { point: clampToMapBounds(engine, mapTileToWorld(zone.x), mapTileToWorld(zone.y), radius), side: spawnEntry.side };
  };

  let spawnPoint = createPoint();
  for (let attempt = 0; attempt < SPAWN_POSITION_ATTEMPTS; attempt += 1) {
    const candidate = createPoint();
    let overlaps = false;
    for (let index = 0, checked = 0; index < engine.monsters.length && checked < MAX_PAIR_COLLISION_MONSTERS; index += 1) {
      const monster = engine.monsters[index];
      if (monster.isDying) continue;
      checked += 1;
      const minDistance = radius + monster.radius + MONSTER_COLLISION_GAP;
      const dx = candidate.point.x - monster.x;
      const dy = candidate.point.y - monster.y;
      if (dx * dx + dy * dy >= minDistance * minDistance) continue;
      overlaps = true;
      break;
    }
    if (!overlaps) {
      spawnPoint = candidate;
      break;
    }
  }
  spawnMonsterAt(engine, config, spawnPoint.point, isElite, variant);
}

function spawnVariantAtEdge(
  engine: EngineState,
  width: number,
  height: number,
  zoom: number,
  variant: EnemyVariantConfig,
  isElite = false,
  directionMode: SpawnDirectionMode = "all",
  phase?: BattlePhaseConfig,
) {
  spawnAtEdge(engine, width, height, zoom, getMonsterConfig(variant.baseId), isElite, directionMode, variant, phase);
}

function enqueueMonsterSpawn(
  engine: EngineState,
  variant: EnemyVariantConfig,
  isElite: boolean,
  directionMode: SpawnDirectionMode,
  phaseIndex: number,
) {
  if (engine.pendingMonsterSpawns.length - engine.pendingMonsterSpawnHead >= MAX_PENDING_MONSTER_SPAWNS) return;
  engine.pendingMonsterSpawns.push({
    variantId: variant.id,
    isElite,
    directionMode,
    phaseIndex,
  });
}

function compactPendingMonsterSpawns(engine: EngineState) {
  if (engine.pendingMonsterSpawnHead === 0) return;
  if (engine.pendingMonsterSpawnHead >= engine.pendingMonsterSpawns.length) {
    engine.pendingMonsterSpawns.length = 0;
    engine.pendingMonsterSpawnHead = 0;
    return;
  }
  if (engine.pendingMonsterSpawnHead < 24 || engine.pendingMonsterSpawnHead * 2 < engine.pendingMonsterSpawns.length) return;
  engine.pendingMonsterSpawns.splice(0, engine.pendingMonsterSpawnHead);
  engine.pendingMonsterSpawnHead = 0;
}

function processPendingMonsterSpawns(
  engine: EngineState,
  width: number,
  height: number,
  zoom: number,
  monsterLimit: number,
) {
  if (engine.pendingMonsterSpawnHead >= engine.pendingMonsterSpawns.length) {
    compactPendingMonsterSpawns(engine);
    return;
  }

  let activeCount = countActiveMonsters(engine);
  let spawned = 0;
  while (engine.pendingMonsterSpawnHead < engine.pendingMonsterSpawns.length && spawned < MAX_MONSTER_SPAWNS_PER_FRAME && activeCount < monsterLimit) {
    const job = engine.pendingMonsterSpawns[engine.pendingMonsterSpawnHead];
    engine.pendingMonsterSpawnHead += 1;
    if (!job) break;
    const variant = ENEMY_VARIANT_BY_ID[job.variantId];
    if (!variant) continue;
    const phase = BATTLE_PHASES[job.phaseIndex] ?? BATTLE_PHASES[BATTLE_PHASES.length - 1];
    spawnVariantAtEdge(engine, width, height, zoom, variant, job.isElite, job.directionMode, phase);
    activeCount += 1;
    spawned += 1;
  }
  compactPendingMonsterSpawns(engine);
}

function getMonsterConfig(kind: MonsterId) {
  return MONSTER_CONFIG_BY_ID[kind] ?? MONSTER_CONFIGS[0];
}

function getSpawnMonsterHp(engine: EngineState, config: MonsterConfig, isElite: boolean, variant?: EnemyVariantConfig) {
  const phase = getBattlePhase(getTimelineElapsed(engine));
  const bossScale = config.isBoss ? engine.difficultyPreset.bossHpMultiplier : engine.difficultyPreset.enemyHpMultiplier;
  const eliteScale = isElite ? 3.2 * engine.difficultyPreset.eliteHpMultiplier : 1;
  const phaseScale = config.isBoss ? 1 : phase.hpMultiplier;
  const variantScale = config.isBoss ? 1 : (variant?.hpMultiplier ?? 1);
  const pressureScale = config.isBoss ? 1 : getPressureScale(engine, "hpPerPressure");
  return Math.max(1, Math.round(config.hp * engine.mapConfig.baseDifficulty * bossScale * eliteScale * phaseScale * variantScale * pressureScale));
}

function getMonsterDamage(engine: EngineState, monster: Monster, phase = getBattlePhase(getTimelineElapsed(engine)), pressureScale?: number) {
  const config = getMonsterConfig(monster.kind);
  const variant = getEnemyVariant(monster);
  const damageScale = config.isBoss ? engine.difficultyPreset.bossDamageMultiplier : engine.difficultyPreset.enemyDamageMultiplier;
  const phaseScale = config.isBoss ? 1 : phase.damageMultiplier;
  const variantScale = config.isBoss ? 1 : (variant?.damageMultiplier ?? 1);
  const pressure = config.isBoss ? 1 : (pressureScale ?? getPressureScale(engine, "damagePerPressure"));
  return config.damage * engine.mapConfig.baseDifficulty * damageScale * phaseScale * variantScale * pressure * (monster.isElite ? 1.45 : 1);
}

function getMonsterSpeed(
  engine: EngineState,
  monster: Monster,
  distanceToPlayer?: number,
  phase = getBattlePhase(getTimelineElapsed(engine)),
  pressureScale?: number,
  now = performance.now(),
) {
  const config = getMonsterConfig(monster.kind);
  const variant = getEnemyVariant(monster);
  let dashScale = variant?.dash && now < (monster.dashUntil ?? 0) ? variant.dash.speedMultiplier : 1;
  if (variant?.dash && dashScale > 1 && typeof distanceToPlayer === "number" && distanceToPlayer <= (variant.dash.brakeDistance ?? 0)) {
    const brakeDistance = Math.max(1, variant.dash.brakeDistance ?? 1);
    const nearRatio = clampNumber(distanceToPlayer / brakeDistance, 0, 1);
    const brakeSpeed = variant.dash.brakeSpeedMultiplier ?? 0.45;
    dashScale = brakeSpeed + (variant.dash.speedMultiplier - brakeSpeed) * nearRatio;
  }
  const phaseScale = config.isBoss ? 1 : phase.speedMultiplier;
  const variantScale = config.isBoss ? 1 : (variant?.speedMultiplier ?? 1);
  const pressure = config.isBoss ? 1 : (pressureScale ?? getPressureScale(engine, "speedPerPressure"));
  return config.speed * engine.difficultyPreset.enemySpeedMultiplier * phaseScale * variantScale * pressure * dashScale * (monster.isElite ? 0.92 : 1);
}

function damageMonster(monster: Monster, damage: number) {
  const reducedDamage = damage * (1 - (monster.damageReduction ?? 0));
  if ((monster.shieldHp ?? 0) > 0) {
    const shieldDamage = Math.min(monster.shieldHp ?? 0, reducedDamage);
    monster.shieldHp = Math.max(0, (monster.shieldHp ?? 0) - shieldDamage);
    monster.hp -= Math.max(0, reducedDamage - shieldDamage);
    return;
  }
  monster.hp -= reducedDamage;
}

function pushEnemyProjectile(engine: EngineState, monster: Monster, variant: EnemyVariantConfig, dx: number, dy: number) {
  if (!variant.ranged) return;
  if (engine.enemyProjectiles.length >= MAX_ENEMY_PROJECTILES) {
    engine.enemyProjectiles[0] = engine.enemyProjectiles[engine.enemyProjectiles.length - 1];
    engine.enemyProjectiles.pop();
  }
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const speed = variant.ranged.projectileSpeed * getPressureScale(engine, "speedPerPressure");
  engine.enemyProjectiles.push({
    id: engine.nextEnemyProjectileId,
    x: monster.x,
    y: monster.y,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    damage: getMonsterDamage(engine, monster) * variant.ranged.damageMultiplier,
    radius: variant.ranged.projectileRadius,
    bornAt: performance.now(),
    lifetimeMs: 4200,
  });
  engine.nextEnemyProjectileId += 1;
}

function applyPlayerDamage(engine: EngineState, damage: number, timelineElapsed: number, volume = 0.86, hitCount = 1) {
  if (damage <= 0 || engine.stats.hp <= 0) return;
  engine.stats.hp = Math.max(0, engine.stats.hp - damage);
  engine.damageTaken += Math.max(1, hitCount);
  engine.damageEvents.push(timelineElapsed);
  if (ENABLE_PLAYER_HURT_SFX) playAudioEvent("playerHurt", { volume });
}

function applyMonsterContactDamage(
  engine: EngineState,
  grid: MonsterSpatialGrid,
  timelineElapsed: number,
  phase: BattlePhaseConfig,
  damagePressureScale: number,
  now: number,
) {
  let totalDamage = 0;
  let hitCount = 0;
  const scanRadius = PLAYER_RADIUS + MONSTER_MAX_QUERY_RADIUS + MONSTER_COLLISION_GAP + 2;
  visitNearbyMonsters(engine, grid, engine.player.x, engine.player.y, scanRadius, (monster) => {
    if (monster.isDying) return;
    if (now - monster.lastDamageAt < CONTACT_DAMAGE_COOLDOWN_MS) return;
    const contactDistance = PLAYER_RADIUS + monster.radius + MONSTER_COLLISION_GAP + 2;
    const dx = monster.x - engine.player.x;
    const dy = monster.y - engine.player.y;
    if (dx * dx + dy * dy > contactDistance * contactDistance) return;
    monster.lastDamageAt = now;
    totalDamage += getMonsterDamage(engine, monster, phase, damagePressureScale);
    hitCount += 1;
  }, 0);
  if (hitCount > 0) applyPlayerDamage(engine, totalDamage, timelineElapsed, 0.86, hitCount);
}

function spawnSurroundWave(engine: EngineState, phase: BattlePhaseConfig, phaseIndex: number) {
  const wave = phase.surroundWave;
  if (!wave.enabled || wave.count <= 0) return;
  const pressureScale = Math.max(0.75, 1 + Math.max(0, engine.director.pressure) * getDynamicConfig().surroundPerPressure);
  const count = Math.min(36, Math.round(wave.count * pressureScale));
  for (let index = 0; index < count; index += 1) {
    const variant = pickEnemyVariant(engine, phase, wave.tierIds);
    const elite = Math.random() < getPhaseEliteChance(engine, phase, variant) * 0.55;
    enqueueMonsterSpawn(engine, variant, elite, wave.directionMode, phaseIndex);
  }
}

function countActiveMonsters(engine: EngineState) {
  let count = 0;
  for (const monster of engine.monsters) {
    if (!monster.isDying) count += 1;
  }
  return count;
}

function getMonsterSpatialCellKey(cellX: number, cellY: number) {
  return (cellX + MONSTER_SPATIAL_KEY_OFFSET) * MONSTER_SPATIAL_KEY_STRIDE + cellY + MONSTER_SPATIAL_KEY_OFFSET;
}

function buildMonsterSpatialGrid(grid: MonsterSpatialGrid, monsters: Monster[]): MonsterSpatialGrid {
  for (const key of grid.activeCellKeys) {
    const cell = grid.cells.get(key);
    if (cell) cell.length = 0;
  }
  grid.activeCellKeys.length = 0;

  for (const monster of monsters) {
    if (monster.isDying) continue;
    const cellX = Math.floor(monster.x / grid.cellSize);
    const cellY = Math.floor(monster.y / grid.cellSize);
    const key = getMonsterSpatialCellKey(cellX, cellY);
    let cell = grid.cells.get(key);
    if (!cell) {
      cell = [];
      grid.cells.set(key, cell);
    }
    if (cell.length === 0) {
      grid.activeCellKeys.push(key);
    }
    cell.push(monster);
  }
  return grid;
}

function visitNearbyMonsters(
  engine: EngineState,
  grid: MonsterSpatialGrid,
  x: number,
  y: number,
  radius: number,
  visit: (monster: Monster) => boolean | void,
  queryPadding = MONSTER_MAX_QUERY_RADIUS,
) {
  const centerCellX = Math.floor(x / grid.cellSize);
  const centerCellY = Math.floor(y / grid.cellSize);
  const cellRange = Math.max(1, Math.ceil((radius + queryPadding) / grid.cellSize));
  const queryStamp = engine.nextMonsterQueryStamp;
  engine.nextMonsterQueryStamp = queryStamp >= Number.MAX_SAFE_INTEGER ? 1 : queryStamp + 1;

  for (let cellY = centerCellY - cellRange; cellY <= centerCellY + cellRange; cellY += 1) {
    for (let cellX = centerCellX - cellRange; cellX <= centerCellX + cellRange; cellX += 1) {
      const monsters = grid.cells.get(getMonsterSpatialCellKey(cellX, cellY));
      if (!monsters) continue;
      for (const monster of monsters) {
        if (monster.queryStamp === queryStamp) continue;
        monster.queryStamp = queryStamp;
        if (visit(monster) === false) return;
      }
    }
  }
}

function getNearestMonster(engine: EngineState, grid: MonsterSpatialGrid, width: number, height: number, zoom: number) {
  const halfWidth = width / 2 / zoom;
  const halfHeight = height / 2 / zoom;
  const queryRadius = Math.max(halfWidth, halfHeight);
  let nearest: Monster | undefined;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;
  visitNearbyMonsters(engine, grid, engine.player.x, engine.player.y, queryRadius, (monster) => {
    if (monster.isDying) return;
    const dx = monster.x - engine.player.x;
    const dy = monster.y - engine.player.y;
    if (Math.abs(dx) > halfWidth || Math.abs(dy) > halfHeight) return;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= nearestDistanceSq) return;
    nearest = monster;
    nearestDistanceSq = distanceSq;
  });
  return nearest;
}

function getCachedNearestMonster(engine: EngineState, grid: MonsterSpatialGrid, width: number, height: number, zoom: number, now: number) {
  const cached = engine.targetCache.target;
  if (cached && !cached.isDying && cached.hp > 0 && now - engine.targetCache.updatedAt < TARGET_CACHE_INTERVAL_MS) {
    const halfWidth = width / 2 / zoom;
    const halfHeight = height / 2 / zoom;
    if (Math.abs(cached.x - engine.player.x) <= halfWidth && Math.abs(cached.y - engine.player.y) <= halfHeight) return cached;
  }

  const target = getNearestMonster(engine, grid, width, height, zoom) ?? null;
  engine.targetCache.target = target;
  engine.targetCache.updatedAt = now;
  return target;
}

function resolveMonsterCollisions(engine: EngineState, grid: MonsterSpatialGrid) {
  const nearbyMonsters: Monster[] = [];
  let movedAny = false;
  const scanRadius = PLAYER_RADIUS + MONSTER_MAX_QUERY_RADIUS + MONSTER_COLLISION_GAP;
  visitNearbyMonsters(engine, grid, engine.player.x, engine.player.y, scanRadius, (monster) => {
    if (monster.isDying) return;
    if (nearbyMonsters.length >= MAX_PLAYER_COLLISION_MONSTERS) return false;
    let playerDx = monster.x - engine.player.x;
    let playerDy = monster.y - engine.player.y;
    let playerDistanceSq = playerDx * playerDx + playerDy * playerDy;
    if (playerDistanceSq < 0.001) {
      const angle = (monster.id % 360) * (Math.PI / 180);
      playerDx = Math.cos(angle);
      playerDy = Math.sin(angle);
      playerDistanceSq = 1;
    }
    const minPlayerDistance = PLAYER_RADIUS + monster.radius + MONSTER_COLLISION_GAP;
    if (playerDistanceSq < minPlayerDistance * minPlayerDistance) {
      const playerDistance = Math.sqrt(playerDistanceSq);
      const push = minPlayerDistance - playerDistance;
      monster.x += (playerDx / playerDistance) * push;
      monster.y += (playerDy / playerDistance) * push;
      movedAny = true;
    }
    nearbyMonsters.push(monster);
  }, 0);

  if (!ENABLE_MONSTER_PAIR_COLLISIONS) return movedAny;

  const passes = MONSTER_COLLISION_PASSES;
  for (let pass = 0; pass < passes; pass += 1) {
    for (let index = 0; index < nearbyMonsters.length; index += 1) {
      const monster = nearbyMonsters[index];

      for (let otherIndex = index + 1; otherIndex < nearbyMonsters.length; otherIndex += 1) {
        const other = nearbyMonsters[otherIndex];
        let dx = other.x - monster.x;
        let dy = other.y - monster.y;
        let distanceSq = dx * dx + dy * dy;
        if (distanceSq < 0.001) {
          const angle = ((monster.id * 97 + other.id * 131) % 360) * (Math.PI / 180);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distanceSq = 1;
        }
        const minDistance = monster.radius + other.radius + MONSTER_COLLISION_GAP;
        if (distanceSq >= minDistance * minDistance) continue;

        const distance = Math.sqrt(distanceSq);
        const overlap = (minDistance - distance) * 1.04;
        const pushX = (dx / distance) * overlap * 0.5;
        const pushY = (dy / distance) * overlap * 0.5;
        monster.x -= pushX;
        monster.y -= pushY;
        other.x += pushX;
        other.y += pushY;
        movedAny = true;
      }
    }
  }

  return movedAny;
}

function loadImages(mapId: MapId, onReady: (images: Record<ImageKey, HTMLImageElement>) => void) {
  loadBattleImages(mapId).then(onReady);
}

function unlockBattleAchievement(engine: EngineState, achievementId: string, showAchievement: (achievement: BattleAchievement) => void) {
  if (engine.archivedAchievements.has(achievementId) || engine.unlockedAchievements.has(achievementId)) return;
  const achievement = BATTLE_ACHIEVEMENTS[achievementId];
  if (!achievement) return;
  engine.unlockedAchievements.add(achievementId);
  showAchievement(achievement);
}

function checkBattleAchievements(engine: EngineState, showAchievement: (achievement: BattleAchievement) => void) {
  const timelineElapsed = getTimelineElapsed(engine);
  if (timelineElapsed >= 300) unlockBattleAchievement(engine, "firstSurvivor", showAchievement);
  if (engine.level >= 20) unlockBattleAchievement(engine, "level20", showAchievement);
  if (Object.values(engine.evolvedWeapons).some(Boolean)) unlockBattleAchievement(engine, "weaponMaster", showAchievement);
  if (engine.relics.length >= 6) unlockBattleAchievement(engine, "collector", showAchievement);
  if (engine.kills >= 100) unlockBattleAchievement(engine, "clearExpert", showAchievement);
  if (timelineElapsed >= 180 && engine.damageTaken === 0) unlockBattleAchievement(engine, "noDamage3", showAchievement);
  if (engine.eliteKills >= 50) unlockBattleAchievement(engine, "eliteHunter", showAchievement);
  if (engine.outcome === "victory") unlockBattleAchievement(engine, "finalSurvivor", showAchievement);
}

function getProjectileHitRadius(projectile: Projectile, engine: EngineState) {
  const sizeScale = getProjectileSizeScale(engine);
  if (projectile.weapon === "mangoCake") return CAKE_RADIUS * (engine.evolvedWeapons.mangoCake ? 1.25 : 1) * sizeScale;
  if (projectile.weapon === "moonBookmark") return BOOKMARK_RADIUS * (engine.evolvedWeapons.moonBookmark ? 1.2 : 1) * sizeScale;
  if (projectile.weapon === "strawberryMilkshake") return 28 * (engine.evolvedWeapons.strawberryMilkshake ? 1.45 : 1) * sizeScale;
  if (projectile.weapon === "starlightPaperPlane") return 18 * sizeScale;
  if (projectile.weapon === "luckyClover") return 22 * sizeScale;
  return 64 * (engine.evolvedWeapons.starPulse ? 1.45 : 1) * sizeScale;
}

function getTimedProjectileLifetime(projectile: Projectile) {
  if (projectile.customLifetimeMs !== undefined) return projectile.customLifetimeMs;
  if (projectile.weapon === "starPulse") return 460;
  return null;
}

function isProjectilePastScreen(projectile: { x: number; y: number }, engine: EngineState, width: number, height: number, zoom: number) {
  const halfWidth = width / 2 / zoom;
  const halfHeight = height / 2 / zoom;
  return (
    Math.abs(projectile.x - engine.player.x) > halfWidth + PROJECTILE_OFFSCREEN_MARGIN ||
    Math.abs(projectile.y - engine.player.y) > halfHeight + PROJECTILE_OFFSCREEN_MARGIN
  );
}

function getMilkshakeLifetimeMs(engine: EngineState) {
  return Math.max(900, engine.stats.milkshakeDuration * 1000);
}

type ProjectileOptions = {
  customLifetimeMs?: number;
  bounceSpeed?: number;
  orbitAngularSpeed?: number;
  orbitAngle?: number;
  orbitRadius?: number;
};

const EMPTY_PROJECTILE_OPTIONS: ProjectileOptions = {};

function acquireProjectile(
  engine: EngineState,
  weapon: WeaponId,
  x: number,
  y: number,
  vx: number,
  vy: number,
  rotation: number,
  damage: number,
  pierce: number,
  explosive: boolean,
  bornAt: number,
  options: ProjectileOptions,
) {
  const projectile = engine.projectilePool.pop() ?? {
    id: 0,
    weapon,
    x,
    y,
    vx,
    vy,
    rotation,
    damage,
    pierce,
    explosive,
    bornAt,
    hitCount: 0,
  };
  projectile.id = engine.nextProjectileId;
  projectile.weapon = weapon;
  projectile.x = x;
  projectile.y = y;
  projectile.vx = vx;
  projectile.vy = vy;
  projectile.rotation = rotation;
  projectile.damage = damage;
  projectile.pierce = pierce;
  projectile.explosive = explosive;
  projectile.bornAt = bornAt;
  projectile.customLifetimeMs = options.customLifetimeMs;
  projectile.bounceSpeed = options.bounceSpeed;
  projectile.orbitAngularSpeed = options.orbitAngularSpeed;
  projectile.orbitAngle = options.orbitAngle;
  projectile.orbitRadius = options.orbitRadius;
  projectile.hitCount = 0;
  return projectile;
}

function releaseProjectile(engine: EngineState, projectile: Projectile) {
  projectile.hitCount = 0;
  if (engine.projectilePool.length < MAX_PLAYER_PROJECTILES) engine.projectilePool.push(projectile);
}

function compactProjectiles(engine: EngineState, keep: (projectile: Projectile) => boolean) {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < engine.projectiles.length; readIndex += 1) {
    const projectile = engine.projectiles[readIndex];
    if (keep(projectile)) {
      engine.projectiles[writeIndex] = projectile;
      writeIndex += 1;
    } else {
      releaseProjectile(engine, projectile);
    }
  }
  engine.projectiles.length = writeIndex;
}

function createProjectile(
  engine: EngineState,
  weapon: WeaponId,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  pierce: number,
  explosive: boolean,
  options: ProjectileOptions = EMPTY_PROJECTILE_OPTIONS,
  bornAt = performance.now(),
) {
  if (engine.projectiles.length >= MAX_PLAYER_PROJECTILES) {
    const removed = engine.projectiles[0];
    const last = engine.projectiles.pop();
    if (last && last !== removed) engine.projectiles[0] = last;
    releaseProjectile(engine, removed);
  }
  const projectile = acquireProjectile(
    engine,
    weapon,
    x,
    y,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed,
    angle,
    damage,
    pierce,
    explosive,
    bornAt,
    options,
  );
  engine.projectiles.push(projectile);
  engine.nextProjectileId += 1;
}

function enqueueProjectile(
  engine: EngineState,
  weapon: WeaponId,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  pierce: number,
  explosive: boolean,
  options: ProjectileOptions = EMPTY_PROJECTILE_OPTIONS,
) {
  if (engine.pendingProjectiles.length - engine.pendingProjectileHead >= MAX_PENDING_PROJECTILE_SPAWNS) return;
  const job = engine.pendingProjectilePool.pop() ?? {
    weapon,
    x,
    y,
    angle,
    speed,
    damage,
    pierce,
    explosive,
    options,
  };
  job.weapon = weapon;
  job.x = x;
  job.y = y;
  job.angle = angle;
  job.speed = speed;
  job.damage = damage;
  job.pierce = pierce;
  job.explosive = explosive;
  job.options = options;
  engine.pendingProjectiles.push(job);
}

function enqueueOrbitProjectile(
  engine: EngineState,
  weapon: WeaponId,
  angle: number,
  radius: number,
  angularSpeed: number,
  damage: number,
  pierce: number,
  explosive: boolean,
  options: ProjectileOptions = EMPTY_PROJECTILE_OPTIONS,
) {
  enqueueProjectile(
    engine,
    weapon,
    engine.player.x + Math.cos(angle) * radius,
    engine.player.y + Math.sin(angle) * radius,
    angle + Math.PI / 2,
    0,
    damage,
    pierce,
    explosive,
    {
      orbitAngularSpeed: angularSpeed,
      orbitAngle: angle,
      orbitRadius: radius,
      ...options,
    },
  );
}

function compactPendingProjectiles(engine: EngineState) {
  if (engine.pendingProjectileHead === 0) return;
  if (engine.pendingProjectileHead >= engine.pendingProjectiles.length) {
    engine.pendingProjectiles.length = 0;
    engine.pendingProjectileHead = 0;
    return;
  }
  if (engine.pendingProjectileHead < 32 || engine.pendingProjectileHead * 2 < engine.pendingProjectiles.length) return;
  engine.pendingProjectiles.splice(0, engine.pendingProjectileHead);
  engine.pendingProjectileHead = 0;
}

function releasePendingProjectile(engine: EngineState, job: PendingProjectileSpawn) {
  job.options = EMPTY_PROJECTILE_OPTIONS;
  if (engine.pendingProjectilePool.length < MAX_PENDING_PROJECTILE_SPAWNS) engine.pendingProjectilePool.push(job);
}

function processPendingProjectiles(engine: EngineState) {
  if (engine.pendingProjectileHead >= engine.pendingProjectiles.length) {
    compactPendingProjectiles(engine);
    return;
  }
  const bornAt = performance.now();
  let spawned = 0;
  while (engine.pendingProjectileHead < engine.pendingProjectiles.length && spawned < PROJECTILE_SPAWNS_PER_FRAME) {
    const job = engine.pendingProjectiles[engine.pendingProjectileHead];
    engine.pendingProjectileHead += 1;
    if (!job) break;
    createProjectile(
      engine,
      job.weapon,
      job.x,
      job.y,
      job.angle,
      job.speed,
      job.damage,
      job.pierce,
      job.explosive,
      job.options,
      bornAt,
    );
    releasePendingProjectile(engine, job);
    spawned += 1;
  }
  compactPendingProjectiles(engine);
}

function recordProjectileHit(projectile: Projectile, monster: Monster) {
  monster.lastHitProjectileId = projectile.id;
  projectile.hitCount += 1;
}

function retargetBouncingProjectile(engine: EngineState, grid: MonsterSpatialGrid, projectile: Projectile) {
  let nextTarget: Monster | undefined;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;
  visitNearbyMonsters(engine, grid, projectile.x, projectile.y, 260, (monster) => {
    if (monster.isDying || monster.lastHitProjectileId === projectile.id) return;
    const dx = monster.x - projectile.x;
    const dy = monster.y - projectile.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= nearestDistanceSq) return;
    nextTarget = monster;
    nearestDistanceSq = distanceSq;
  });
  if (!nextTarget) return false;

  const dx = nextTarget.x - projectile.x;
  const dy = nextTarget.y - projectile.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const speed = projectile.bounceSpeed ?? Math.max(620, Math.hypot(projectile.vx, projectile.vy));
  const angle = Math.atan2(dy, dx);
  projectile.vx = (dx / distance) * speed;
  projectile.vy = (dy / distance) * speed;
  projectile.rotation = angle;
  projectile.x += (dx / distance) * 18;
  projectile.y += (dy / distance) * 18;
  return true;
}

function fireWeapon(engine: EngineState, weapon: WeaponId, target: Monster, playFireAudio: boolean, now: number) {
  const level = Math.max(1, engine.weapons[weapon]);
  const power = 1 + (level - 1) * 0.16;
  const evolved = engine.evolvedWeapons[weapon];
  const dx = target.x - engine.player.x;
  const dy = target.y - engine.player.y;
  const baseAngle = Math.atan2(dy, dx);

  if (weapon === "mangoCake") {
    const table = WEAPON_LEVELS[Math.min(WEAPON_LEVELS.length - 1, level - 1)];
    const total = table.count + engine.stats.projectileCount + (evolved ? 2 : 0);
    for (let index = 0; index < total; index += 1) {
      enqueueProjectile(engine, weapon, engine.player.x, engine.player.y, baseAngle + (index - (total - 1) / 2) * 0.14, getProjectileSpeed(engine, table.speed), table.damage * engine.stats.attack * (evolved ? 1.85 : 1), table.pierce + (evolved ? 3 : 0), table.explosive || evolved);
    }
    if (playFireAudio) playAudioEvent("weaponCuteFire");
    return;
  }

  if (weapon === "strawberryMilkshake") {
    const total = 3 + Math.floor(level / 3) + engine.stats.projectileCount + (evolved ? 4 : 0);
    const radius = evolved ? 184 : 136;
    const angularSpeed = (evolved ? 4.8 : 3.7) * engine.stats.attackSpeed;
    const lifetimeMs = getMilkshakeLifetimeMs(engine);
    for (let index = 0; index < total; index += 1) {
      const angle = now * 0.003 + (Math.PI * 2 * index) / total;
      enqueueOrbitProjectile(
        engine,
        weapon,
        angle,
        radius,
        angularSpeed,
        8 * power * engine.stats.attack * (evolved ? 1.5 : 1),
        level >= 7 ? 3 : 2,
        false,
        { customLifetimeMs: lifetimeMs },
      );
    }
    if (playFireAudio) playAudioEvent("weaponCuteFire", { volume: 0.9 });
    return;
  }

  if (weapon === "starlightPaperPlane") {
    const total = 1 + (level >= 5 ? 1 : 0) + engine.stats.projectileCount + (evolved ? 2 : 0);
    for (let index = 0; index < total; index += 1) {
      enqueueProjectile(engine, weapon, engine.player.x, engine.player.y, baseAngle + (index - (total - 1) / 2) * 0.18, getProjectileSpeed(engine, evolved ? 1280 : 1060), 10 * power * engine.stats.attack * (evolved ? 1.45 : 1), 1 + Math.floor(level / 3) + (evolved ? 5 : 0), false);
    }
    if (playFireAudio) playAudioEvent("weaponMagicFire");
    return;
  }

  if (weapon === "luckyClover") {
    const total = 1 + (level >= 5 ? 1 : 0) + engine.stats.projectileCount + (evolved ? 2 : 0);
    for (let index = 0; index < total; index += 1) {
      const randomAngle = Math.random() * Math.PI * 2;
      enqueueProjectile(engine, weapon, engine.player.x, engine.player.y, randomAngle + index * 0.16, getProjectileSpeed(engine, evolved ? 860 : 720), 12 * power * engine.stats.attack * (evolved ? 1.55 : 1), 3 + Math.floor(level / 2) + (evolved ? 4 : 0), evolved);
    }
    if (playFireAudio) playAudioEvent("weaponMagicFire", { volume: 0.9 });
    return;
  }

  if (weapon === "moonBookmark") {
    const bookmark = MOON_BOOKMARK_LEVELS[Math.min(MOON_BOOKMARK_LEVELS.length - 1, level - 1)];
    const total = bookmark.count + engine.stats.projectileCount + (evolved ? 2 : 0);
    const bounceSpeed = getProjectileSpeed(engine, bookmark.speed * (evolved ? 1.18 : 1));
    for (let index = 0; index < total; index += 1) {
      enqueueProjectile(
        engine,
        weapon,
        engine.player.x,
        engine.player.y,
        baseAngle + (index - (total - 1) / 2) * 0.2,
        bounceSpeed,
        bookmark.damage * engine.stats.attack * (evolved ? 1.55 : 1),
        bookmark.pierce + (evolved ? 4 : 0),
        false,
        { bounceSpeed },
      );
    }
    if (playFireAudio) playAudioEvent("weaponMagicFire", { volume: 0.85 });
    return;
  }

  const pulses = 1 + (level >= 5 ? 1 : 0) + (evolved ? 3 : 0);
  for (let index = 0; index < pulses; index += 1) {
    const angle = baseAngle + (Math.PI * 2 * index) / pulses;
    const offset = index === 0 ? 0 : 92;
    enqueueProjectile(engine, weapon, target.x + Math.cos(angle) * offset, target.y + Math.sin(angle) * offset, 0, 0, 16 * power * engine.stats.attack * (evolved ? 1.65 : 1), 99, true);
  }
  if (playFireAudio) playAudioEvent("weaponTechFire", { volume: 1.08 });
}

function openChestRewards(
  engine: EngineState,
  tier: ChestTier,
  setOverlay: (overlay: Overlay) => void,
  setChestChoices: (choices: ChestReward[]) => void,
) {
  const rewards = pickChestRewards(engine, tier);
  if (rewards.length === 1 && rewards[0].kind === "coins") {
    applyChestReward(engine, rewards[0]);
    playAudioEvent("pickupCoin");
    return;
  }

  setChestChoices(rewards);
  setOverlay("chest");
  playAudioEvent("chestOpen");
}

function acquirePickup(engine: EngineState, type: PickupType, x: number, y: number, value: number, chestTier?: ChestTier) {
  const pickup = engine.pickupPool.pop() ?? {
    id: 0,
    type,
    x,
    y,
    value,
    chestTier,
  };
  pickup.id = engine.nextPickupId;
  pickup.type = type;
  pickup.x = x;
  pickup.y = y;
  pickup.value = value;
  pickup.chestTier = chestTier;
  engine.nextPickupId += 1;
  return pickup;
}

function releasePickup(engine: EngineState, pickup: Pickup) {
  pickup.chestTier = undefined;
  if (engine.pickupPool.length < MAX_PICKUPS) engine.pickupPool.push(pickup);
}

function mergeNearbyExpPickup(engine: EngineState, x: number, y: number, value: number) {
  const mergeRadiusSq = EXP_PICKUP_MERGE_RADIUS * EXP_PICKUP_MERGE_RADIUS;
  let nearest: Pickup | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;
  for (const pickup of engine.pickups) {
    if (pickup.type !== "exp") continue;
    const dx = pickup.x - x;
    const dy = pickup.y - y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > mergeRadiusSq || distanceSq >= nearestDistanceSq) continue;
    nearest = pickup;
    nearestDistanceSq = distanceSq;
  }
  if (!nearest) return false;
  nearest.value += value;
  nearest.x = (nearest.x + x) * 0.5;
  nearest.y = (nearest.y + y) * 0.5;
  return true;
}

function pushPickup(engine: EngineState, type: PickupType, x: number, y: number, value: number, chestTier?: ChestTier) {
  if (type === "exp" && mergeNearbyExpPickup(engine, x, y, value)) return;
  if (engine.pickups.length >= MAX_PICKUPS) {
    const removableIndex = engine.pickups.findIndex((pickup) => pickup.type !== "chest");
    const removeAt = removableIndex >= 0 ? removableIndex : 0;
    const removed = engine.pickups[removeAt];
    const last = engine.pickups.pop();
    if (last && removeAt < engine.pickups.length) engine.pickups[removeAt] = last;
    if (removed) releasePickup(engine, removed);
  }
  engine.pickups.push(acquirePickup(engine, type, x, y, value, chestTier));
}

function getDeathDropChances(engine: EngineState) {
  const dreamAlbumDropScale = 1 + getRelicLevel(engine, "dreamAlbum") * 0.07;
  return {
    coin: Math.min(0.06, (0.006 + engine.stats.luck * 0.008) * dreamAlbumDropScale),
    heal: Math.min(0.06, (0.002 + engine.stats.luck * 0.003) * dreamAlbumDropScale),
    luckyStar: Math.min(0.06, (0.0006 + engine.stats.luck * 0.001) * dreamAlbumDropScale),
    energyDrink: Math.min(0.06, (0.0006 + engine.stats.luck * 0.001) * dreamAlbumDropScale),
    mysteryBox: Math.min(0.06, (0.0002 + engine.stats.luck * 0.0004) * dreamAlbumDropScale),
    rareChest: Math.min(
      0.8,
      0.22 + engine.stats.luck * 0.22 + getRelicLevel(engine, "luckyCharm") * 0.05 + engine.difficultyPreset.chestQualityBonus,
    ),
  };
}

function spawnSplitChildrenFromDeathEvent(engine: EngineState, event: DeathEvent) {
  if (!event.splitVariantId || !event.splitCount || event.splitCount <= 0) return;
  const variant = ENEMY_VARIANT_BY_ID[event.splitVariantId];
  if (!variant) return;
  const config = getMonsterConfig(variant.baseId);
  for (let index = 0; index < event.splitCount; index += 1) {
    const angle = (Math.PI * 2 * index) / event.splitCount + Math.random() * 0.6;
    spawnMonsterAt(
      engine,
      config,
      {
        x: event.x + Math.cos(angle) * 48,
        y: event.y + Math.sin(angle) * 48,
      },
      false,
      variant,
      event.splitHpMultiplier ?? 0.5,
    );
  }
}

function processDeathQueue(engine: EngineState, showAchievement: (achievement: BattleAchievement) => void) {
  if (engine.deathQueue.length === 0) return;
  const dropChances = getDeathDropChances(engine);
  let processed = 0;
  let pickupSpawns = 0;
  let normalDeathAudioCount = 0;
  let bossAudioCount = 0;

  while (engine.deathQueue.length > 0 && processed < DEATH_QUEUE_MAX_EVENTS_PER_FRAME) {
    const event = engine.deathQueue.pop();
    if (!event) break;
    processed += 1;

    spawnSplitChildrenFromDeathEvent(engine, event);

    if (event.shouldDropExp && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "exp", event.x, event.y, event.expValue);
      pickupSpawns += 1;
    }
    if (Math.random() < dropChances.coin && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "coin", event.x + 18, event.y - 10, event.coinValue);
      pickupSpawns += 1;
    }
    if (Math.random() < dropChances.heal && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "heal", event.x - 16, event.y + 12, Math.round(engine.stats.maxHp * 0.2));
      pickupSpawns += 1;
    }
    if (Math.random() < dropChances.luckyStar && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "luckyStar", event.x + 8, event.y + 18, 0.3);
      pickupSpawns += 1;
    }
    if (Math.random() < dropChances.energyDrink && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "energyDrink", event.x - 8, event.y - 18, 0.25);
      pickupSpawns += 1;
    }
    if (Math.random() < dropChances.mysteryBox && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      pushPickup(engine, "mysteryBox", event.x, event.y + 24, 0);
      pickupSpawns += 1;
    }
    const shouldDropChest = event.isBoss || (event.isElite && Math.random() < 0.5);
    if (shouldDropChest && pickupSpawns < DEATH_QUEUE_MAX_PICKUPS_PER_FRAME) {
      const chestTier: ChestTier = event.isBoss ? "legendary" : event.isElite && Math.random() < dropChances.rareChest ? "rare" : "normal";
      pushPickup(engine, "chest", event.x, event.y - 26, 0, chestTier);
      pickupSpawns += 1;
    }

    if (event.isBoss) {
      bossAudioCount += 1;
      checkBattleAchievements(engine, showAchievement);
    } else {
      normalDeathAudioCount += 1;
    }
  }

  if (normalDeathAudioCount >= 3) playAudioEvent("enemyDeath", { count: normalDeathAudioCount });
  if (bossAudioCount > 0) playAudioEvent("bossDefeat");
}

function triggerMapMechanic(engine: EngineState) {
  const timelineElapsed = getTimelineElapsed(engine);
  if (timelineElapsed < engine.mapEvent.nextAt) return;

  const eventChance = Math.min(0.92, 0.82 + engine.difficultyPreset.mapEventChanceBonus);
  const interval =
    engine.mapConfig.mechanic === "sweet_supply"
      ? 240
      : engine.mapConfig.mechanic === "laser_scan"
        ? 75
        : engine.mapConfig.mechanic === "page_storm"
          ? 60
          : engine.mapConfig.mechanic === "star_train"
            ? 50
            : engine.mapConfig.mechanic === "star_ring"
              ? 180
              : 90;
  engine.mapEvent.nextAt += interval;
  if (Math.random() > eventChance) return;

  const eventPoint = getMapEventWorldPoint(engine);
  const x = eventPoint.x;
  const y = eventPoint.y;
  const noticePrefix = engine.mapConfig.mechanicName;

  if (engine.mapConfig.mechanic === "sweet_supply") {
    pushPickup(engine, "heal", x, y, Math.round(engine.stats.maxHp * 0.3));
    pushPickup(engine, "energyDrink", x + 42, y - 12, 0.25);
    pushPickup(engine, "luckyStar", x - 42, y + 12, 0.25);
    engine.mapEvent.notice = `${noticePrefix}出现：治疗、攻速和幸运补给已投放`;
  } else if (engine.mapConfig.mechanic === "moon_tide") {
    addStat(engine, "pickupRange", 12);
    for (let index = 0; index < 4; index += 1) pushPickup(engine, "exp", x + index * 20 - 30, y + Math.sin(index) * 24, 8);
    engine.mapEvent.notice = `${noticePrefix}扩散：拾取范围提升，星尘向你聚拢`;
  } else if (engine.mapConfig.mechanic === "laser_scan") {
    for (const monster of engine.monsters) {
      if (!monster.isDying) damageMonster(monster, Math.max(8, monster.maxHp * 0.08));
    }
    engine.mapEvent.notice = `${noticePrefix}扫过：敌群受损，安全门短暂开启`;
  } else if (engine.mapConfig.mechanic === "page_storm") {
    for (const monster of engine.monsters) {
      if (monster.isDying) continue;
      const dx = monster.x - engine.player.x;
      const dy = monster.y - engine.player.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const pushScale = 1 - (monster.knockbackResistance ?? 0);
      monster.x += (dx / distance) * 42 * pushScale;
      monster.y += (dy / distance) * 42 * pushScale;
    }
    pushPickup(engine, "exp", x, y, 18);
    pushPickup(engine, "coin", x + 30, y + 8, Math.round(2 * engine.difficultyPreset.coinRewardMultiplier));
    engine.mapEvent.notice = `${noticePrefix}吹起：敌群被推开，书页掉落经验与金币`;
  } else if (engine.mapConfig.mechanic === "star_train") {
    for (const monster of engine.monsters) {
      if (!monster.isDying) damageMonster(monster, Math.max(12, monster.maxHp * 0.12));
    }
    pushPickup(engine, "energyDrink", x, y, 0.25);
    engine.mapEvent.notice = `${noticePrefix}进站：轨道清扫敌群并留下能量饮料`;
  } else {
    const phase = Math.min(4, Math.floor(timelineElapsed / 180));
    if (phase === 0) pushPickup(engine, "exp", x, y, 24);
    if (phase === 1) addStat(engine, "luck", 0.015);
    if (phase === 2) for (const monster of engine.monsters) if (!monster.isDying) damageMonster(monster, Math.max(10, monster.maxHp * 0.06));
    if (phase === 3) pushPickup(engine, "chest", x, y, 0, "rare");
    if (phase >= 4) addStat(engine, "attack", 0.04);
    engine.mapEvent.notice = `${noticePrefix}切换：当前相位强化了战场节奏`;
  }

  engine.mapEvent.noticeUntil = performance.now() + 4200;
  playAudioEvent("uiPopup", { volume: 0.72 });
}

function processPendingLevelUp(
  engine: EngineState,
  setOverlay: (overlay: Overlay) => void,
  setLevelChoices: (choices: UpgradeChoice[]) => void,
  showAchievement: (achievement: BattleAchievement) => void,
) {
  if (engine.xp < engine.xpToNext) return null;
  engine.xp -= engine.xpToNext;
  engine.level += 1;
  engine.xpToNext = xpNeedFor(engine.level);
  if (engine.level % 10 === 0) addStat(engine, "luck", 0.015);
  const choices = pickUpgradeChoices(engine);
  checkBattleAchievements(engine, showAchievement);
  playAudioEvent("levelUp");
  if (choices.length > 0) {
    setLevelChoices(choices);
    setOverlay("level-up");
    return "choices";
  }
  grantCompletionCoins(engine, "level");
  playAudioEvent("pickupCoin");
  return "completion";
}

function updateEngine(
  engine: EngineState,
  delta: number,
  viewport: { clientWidth: number; clientHeight: number },
  move: { dx: number; dy: number },
  setOverlay: (overlay: Overlay) => void,
  setLevelChoices: (choices: UpgradeChoice[]) => void,
  setChestChoices: (choices: ChestReward[]) => void,
  showAchievement: (achievement: BattleAchievement) => void,
) {
  const width = viewport.clientWidth || 960;
  const height = viewport.clientHeight || 540;
  const zoom = width < height ? 0.52 : 0.42;
  engine.elapsed += delta;
  engine.timeLeft = Math.max(0, engine.duration - engine.elapsed);
  const timelineElapsed = getTimelineElapsed(engine);
  const phaseIndex = getBattlePhaseIndex(timelineElapsed);
  const phase = BATTLE_PHASES[phaseIndex];
  const now = performance.now();
  updateDynamicDifficulty(engine);
  const densityPressureScale = getPressureScale(engine, "densityPerPressure");
  const speedPressureScale = getPressureScale(engine, "speedPerPressure");
  const damagePressureScale = getPressureScale(engine, "damagePerPressure");

  const length = Math.max(1, Math.hypot(move.dx, move.dy));
  engine.player.isMoving = move.dx !== 0 || move.dy !== 0;
  if (move.dx < 0) engine.player.facing = "left";
  if (move.dx > 0) engine.player.facing = "right";
  const nextX = engine.player.x + (move.dx / length) * PLAYER_BASE_SPEED * engine.stats.moveSpeed * delta;
  const nextY = engine.player.y + (move.dy / length) * PLAYER_BASE_SPEED * engine.stats.moveSpeed * delta;
  if (isMapPositionBlocked(engine, engine.player.x, engine.player.y, PLAYER_MAP_COLLISION_RADIUS)) resetPlayerToMapSpawn(engine);
  const clampedNext = clampToMapBounds(engine, nextX, nextY, PLAYER_MAP_COLLISION_RADIUS);
  if (!isMapPositionBlocked(engine, clampedNext.x, engine.player.y, PLAYER_MAP_COLLISION_RADIUS)) engine.player.x = clampedNext.x;
  if (!isMapPositionBlocked(engine, engine.player.x, clampedNext.y, PLAYER_MAP_COLLISION_RADIUS)) engine.player.y = clampedNext.y;
  engine.animationClock += delta;
  if (engine.player.isMoving && engine.animationClock >= 0.16) {
    engine.player.frame = (engine.player.frame + 1) % XINGLI_WALK_FRAMES;
    engine.animationClock = 0;
  }
  if (!engine.player.isMoving) engine.player.frame = 0;

  triggerMapMechanic(engine);

  const monsterLimit = getPhaseMonsterLimit(engine, phase);
  engine.spawnClock += delta;
  const activeAndQueuedMonsters = countActiveMonsters(engine) + engine.pendingMonsterSpawns.length - engine.pendingMonsterSpawnHead;
  if (engine.spawnClock >= getPhaseSpawnInterval(engine, phase) && activeAndQueuedMonsters < monsterLimit) {
    engine.spawnClock = 0;
    const spawnRoom = Math.max(0, monsterLimit - activeAndQueuedMonsters);
    const spawnCount = Math.min(spawnRoom, Math.max(1, Math.round(phase.spawnCount * clampNumber(densityPressureScale, 0.82, 1.46))));
    for (let index = 0; index < spawnCount; index += 1) {
      const variant = pickEnemyVariant(engine, phase);
      enqueueMonsterSpawn(engine, variant, Math.random() < getPhaseEliteChance(engine, phase, variant), phase.directionMode, phaseIndex);
    }
  }

  engine.eliteSpawnClock += delta;
  const eliteInterval = (timelineElapsed >= 720 ? 12 : timelineElapsed >= 540 ? 16 : timelineElapsed >= 360 ? 20 : 30) / Math.sqrt(engine.difficultyPreset.spawnRateMultiplier) / Math.max(0.85, densityPressureScale);
  if (timelineElapsed >= 180 && engine.eliteSpawnClock >= eliteInterval) {
    engine.eliteSpawnClock = 0;
    const variant = pickEnemyVariant(engine, phase);
    enqueueMonsterSpawn(engine, variant, true, phase.directionMode, phaseIndex);
  }

  const wave = phase.surroundWave;
  if (wave.enabled) {
    engine.director.surroundClock += delta;
    const waveInterval = wave.interval / Math.max(0.75, 1 + Math.max(0, engine.director.pressure) * getDynamicConfig().surroundPerPressure);
    if (engine.director.surroundClock >= waveInterval) {
      engine.director.surroundClock = 0;
      spawnSurroundWave(engine, phase, phaseIndex);
    }
  }

  if (!engine.bossSpawned && engine.elapsed >= engine.bossSpawnAt) {
    engine.bossSpawned = true;
    spawnMonsterAt(engine, getMonsterConfig(engine.mapConfig.bossId), getBossArenaWorldPoint(engine), false);
    playAudioEvent("bossSpawn");
  }

  processPendingMonsterSpawns(engine, width, height, zoom, monsterLimit);

  let offscreenRespawnsQueued = 0;
  for (const monster of engine.monsters) {
    if (monster.isDying) continue;
    const config = getMonsterConfig(monster.kind);
    const variant = getEnemyVariant(monster);
    const dx = engine.player.x - monster.x;
    const dy = engine.player.y - monster.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const minDistance = PLAYER_RADIUS + monster.radius;
    monster.facing = dx < -1 ? "left" : dx > 1 ? "right" : monster.facing;
    if (variant?.dash && distance <= variant.dash.triggerDistance && now - (monster.lastDashAt ?? 0) >= variant.dash.cooldown * 1000) {
      monster.lastDashAt = now;
      monster.dashUntil = now + variant.dash.duration * 1000;
    }
    if (variant?.ranged && distance <= variant.ranged.range && now - (monster.lastRangedAt ?? 0) >= variant.ranged.cooldown * 1000) {
      monster.lastRangedAt = now;
      pushEnemyProjectile(engine, monster, variant, dx, dy);
      playAudioEvent("weaponTechFire", { volume: 0.42 });
    }

    let moveX = dx / distance;
    let moveY = dy / distance;
    let targetGap = minDistance;
    if (variant?.ranged) {
      if (distance < variant.ranged.keepDistance) {
        moveX = -moveX;
        moveY = -moveY;
        targetGap = 0;
      } else if (distance <= variant.ranged.range * 0.82) {
        const strafe = monster.id % 2 === 0 ? 1 : -1;
        moveX = (-dy / distance) * strafe;
        moveY = (dx / distance) * strafe;
        targetGap = 0;
      }
    }
    if (distance > targetGap || variant?.ranged) {
      const moveDistance = Math.min(getMonsterSpeed(engine, monster, distance, phase, speedPressureScale, now) * delta, Math.max(0, distance - targetGap) + (variant?.ranged ? 80 * delta : 0));
      const nextMonsterX = monster.x + moveX * moveDistance;
      const nextMonsterY = monster.y + moveY * moveDistance;
      const monsterRadius = monster.radius;
      const clampedMonster = clampToMapBounds(engine, nextMonsterX, nextMonsterY, monsterRadius);
      if (!isMapPositionBlocked(engine, clampedMonster.x, monster.y, monsterRadius)) monster.x = clampedMonster.x;
      if (!isMapPositionBlocked(engine, monster.x, clampedMonster.y, monsterRadius)) monster.y = clampedMonster.y;
    }
    const offX = Math.abs(monster.x - engine.player.x) - width / 2 / zoom;
    const offY = Math.abs(monster.y - engine.player.y) - height / 2 / zoom;
    if (!config.isBoss && Math.max(offX, offY) > 360) {
      if (offscreenRespawnsQueued < MAX_OFFSCREEN_RESPAWNS_PER_FRAME) {
        const respawnVariant = variant ?? getFallbackVariantForMonster(config.id);
        if (respawnVariant) {
          enqueueMonsterSpawn(engine, respawnVariant, false, phase.directionMode, phaseIndex);
          offscreenRespawnsQueued += 1;
        }
      }
      monster.isDying = true;
      monster.dyingAt = now - MONSTER_DEATH_MS;
    }
  }

  let monsterSpatialGrid = buildMonsterSpatialGrid(engine.monsterSpatialGrid, engine.monsters);
  if (resolveMonsterCollisions(engine, monsterSpatialGrid)) {
    monsterSpatialGrid = buildMonsterSpatialGrid(engine.monsterSpatialGrid, engine.monsters);
  }
  applyMonsterContactDamage(engine, monsterSpatialGrid, timelineElapsed, phase, damagePressureScale, now);

  for (const projectile of engine.enemyProjectiles) {
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    const hitDistance = PLAYER_RADIUS + projectile.radius;
    const hitDx = projectile.x - engine.player.x;
    const hitDy = projectile.y - engine.player.y;
    if (hitDx * hitDx + hitDy * hitDy <= hitDistance * hitDistance) {
      applyPlayerDamage(engine, projectile.damage, timelineElapsed, 0.84);
      projectile.bornAt = 0;
    }
  }
  compactArray(engine.enemyProjectiles, (projectile) => {
    if (projectile.bornAt <= 0) return false;
    if (now - projectile.bornAt >= projectile.lifetimeMs) return false;
    return !isProjectilePastScreen(projectile, engine, width, height, zoom);
  });

  const target = getCachedNearestMonster(engine, monsterSpatialGrid, width, height, zoom, now);
  let weaponAudioPlayed = false;
  let weaponFiresThisFrame = 0;
  if (target) {
    for (const weaponId of WEAPON_IDS) {
      if (engine.weapons[weaponId] <= 0) continue;
      engine.weaponFireClocks[weaponId] += delta;
      const weaponCooldown = WEAPON_COOLDOWNS[weaponId];
      const cooldown = (engine.evolvedWeapons[weaponId] ? weaponCooldown.evolved : weaponCooldown.normal) * engine.stats.cooldown;
      if (engine.weaponFireClocks[weaponId] >= cooldown) {
        if (weaponFiresThisFrame >= MAX_WEAPON_FIRES_PER_FRAME) continue;
        const canPlayFireAudio = ENABLE_PLAYER_WEAPON_FIRE_SFX && !weaponAudioPlayed && now - engine.lastWeaponFireAudioAt >= WEAPON_FIRE_AUDIO_COOLDOWN_MS;
        fireWeapon(engine, weaponId, target, canPlayFireAudio, now);
        if (canPlayFireAudio) {
          weaponAudioPlayed = true;
          engine.lastWeaponFireAudioAt = now;
        }
        weaponFiresThisFrame += 1;
        engine.weaponFireClocks[weaponId] = weaponId === "strawberryMilkshake" ? -getMilkshakeLifetimeMs(engine) / 1000 : 0;
      }
    }
  }

  processPendingProjectiles(engine);

  let frameHitAudioCount = 0;
  const projectileCount = engine.projectiles.length;
  const collisionStart = projectileCount > 0 ? engine.projectileCollisionCursor % projectileCount : 0;
  const collisionBudget = Math.min(PROJECTILE_COLLISION_CHECKS_PER_FRAME, projectileCount);
  for (let index = 0; index < projectileCount; index += 1) {
    const projectile = engine.projectiles[index];
    const hitRadius = getProjectileHitRadius(projectile, engine);
    if (projectile.orbitRadius !== undefined && projectile.orbitAngle !== undefined && projectile.orbitAngularSpeed !== undefined) {
      projectile.orbitAngle += projectile.orbitAngularSpeed * delta;
      projectile.x = engine.player.x + Math.cos(projectile.orbitAngle) * projectile.orbitRadius;
      projectile.y = engine.player.y + Math.sin(projectile.orbitAngle) * projectile.orbitRadius;
      projectile.rotation = projectile.orbitAngle + Math.PI / 2;
    } else {
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.rotation += delta * 6;
    }
    const collisionOrder = (index - collisionStart + projectileCount) % projectileCount;
    if (collisionOrder >= collisionBudget) continue;
    visitNearbyMonsters(engine, monsterSpatialGrid, projectile.x, projectile.y, hitRadius, (monster) => {
      if (monster.isDying || monster.lastHitProjectileId === projectile.id) return;
      const hitDistance = hitRadius + monster.radius;
      const hitDx = projectile.x - monster.x;
      const hitDy = projectile.y - monster.y;
      if (hitDx * hitDx + hitDy * hitDy > hitDistance * hitDistance) return;
      damageMonster(monster, projectile.damage);
      recordProjectileHit(projectile, monster);
      frameHitAudioCount += 1;
      if (projectile.explosive) {
        const splashRadius = hitRadius * 2.6;
        const splashRadiusSq = splashRadius * splashRadius;
        visitNearbyMonsters(engine, monsterSpatialGrid, projectile.x, projectile.y, splashRadius, (splash) => {
          if (splash.isDying) return;
          const splashDx = projectile.x - splash.x;
          const splashDy = projectile.y - splash.y;
          if (splashDx * splashDx + splashDy * splashDy <= splashRadiusSq) {
            damageMonster(splash, projectile.damage * (projectile.weapon === "starPulse" ? 0.68 : 0.45));
            frameHitAudioCount += 1;
          }
        });
      }
      const canContinue = projectile.hitCount <= projectile.pierce;
      if (projectile.weapon === "moonBookmark") {
        if (!canContinue || !retargetBouncingProjectile(engine, monsterSpatialGrid, projectile)) projectile.bornAt = 0;
      } else if (!canContinue) {
        projectile.bornAt = 0;
      }
      return false;
    });
  }
  engine.projectileCollisionCursor = projectileCount > 0 ? (collisionStart + collisionBudget) % projectileCount : 0;
  if (frameHitAudioCount > 0) playAudioEvent("enemyHit", { count: frameHitAudioCount });

  compactProjectiles(engine, (projectile) => {
    if (projectile.bornAt <= 0) return false;
    const timedLifetime = getTimedProjectileLifetime(projectile);
    if (timedLifetime !== null && now - projectile.bornAt >= timedLifetime) return false;
    return !isProjectilePastScreen(projectile, engine, width, height, zoom);
  });

  for (const monster of engine.monsters) {
    if (monster.isDying || monster.hp > 0) continue;
    const config = getMonsterConfig(monster.kind);
    const variant = getEnemyVariant(monster);
    const isBoss = Boolean(config.isBoss);
    monster.isDying = true;
    monster.dyingAt = monster.isElite || isBoss ? now : now - MONSTER_DEATH_MS;
    if (engine.targetCache.target?.id === monster.id) engine.targetCache.target = null;
    engine.kills += 1;
    engine.killEvents.push(timelineElapsed);
    if (monster.isElite) engine.eliteKills += 1;
    engine.deathQueue.push({
      kind: monster.kind,
      x: monster.x,
      y: monster.y,
      expValue: getMonsterExpDropValue(engine, config, monster, variant),
      coinValue: Math.max(1, Math.round((isBoss ? 40 : 1) * engine.difficultyPreset.coinRewardMultiplier)),
      shouldDropExp: shouldDropMonsterExp(engine, config, monster),
      isElite: monster.isElite,
      isBoss,
      splitVariantId: monster.splitVariantId,
      splitCount: monster.splitCount,
      splitHpMultiplier: monster.splitHpMultiplier,
    });
    if (isBoss) {
      engine.outcome = "victory";
      setOverlay("result");
    }
  }
  processDeathQueue(engine, showAchievement);

  compactArray(engine.monsters, (monster) => !monster.isDying || now - monster.dyingAt < MONSTER_DEATH_MS);

  const magnetRange = engine.stats.pickupRange;
  for (const pickup of engine.pickups) {
    const dx = engine.player.x - pickup.x;
    const dy = engine.player.y - pickup.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < magnetRange * magnetRange) {
      const distance = Math.max(0.001, Math.sqrt(distanceSq));
      const speed = pickup.type === "exp" || pickup.type === "coin" ? PICKUP_MAGNET_SPEED : PICKUP_MAGNET_SPEED_OTHER;
      pickup.x += (dx / distance) * speed * delta;
      pickup.y += (dy / distance) * speed * delta;
    }
  }
  let pickupExpAudioCount = 0;
  let pickupCoinAudioCount = 0;
  let pickupHealAudioCount = 0;
  let pickupItemAudioCount = 0;
  compactArray(engine.pickups, (pickup) => {
    const collectRadius = PLAYER_RADIUS + 14;
    const dx = pickup.x - engine.player.x;
    const dy = pickup.y - engine.player.y;
    if (dx * dx + dy * dy > collectRadius * collectRadius) return true;
    if (pickup.type === "exp") {
      engine.xp += pickup.value;
      pickupExpAudioCount += 1;
    }
    if (pickup.type === "coin") {
      engine.coins += pickup.value;
      pickupCoinAudioCount += 1;
    }
    if (pickup.type === "heal") {
      engine.stats.hp = Math.min(engine.stats.maxHp, engine.stats.hp + pickup.value);
      pickupHealAudioCount += 1;
    }
    if (pickup.type === "luckyStar") {
      addStat(engine, "luck", 0.04);
      addStat(engine, "attack", 0.04);
      pickupItemAudioCount += 1;
    }
    if (pickup.type === "energyDrink") {
      addStat(engine, "attackSpeed", 0.08);
      pickupItemAudioCount += 1;
    }
    if (pickup.type === "mysteryBox") {
      const roll = Math.random();
      if (roll < 0.28) {
        engine.coins += Math.round((28 + Math.round(engine.stats.luck * 50)) * engine.difficultyPreset.coinRewardMultiplier);
        pickupCoinAudioCount += 1;
      } else if (roll < 0.56) {
        engine.xp += Math.round(engine.xpToNext * 0.45);
        pickupExpAudioCount += 1;
      } else if (roll < 0.78) {
        engine.stats.hp = Math.min(engine.stats.maxHp, engine.stats.hp + Math.round(engine.stats.maxHp * 0.35));
        pickupHealAudioCount += 1;
      } else {
        openChestRewards(engine, roll > 0.95 ? "legendary" : "rare", setOverlay, setChestChoices);
      }
    }
    if (pickup.type === "chest") {
      openChestRewards(engine, pickup.chestTier ?? "normal", setOverlay, setChestChoices);
    }
    releasePickup(engine, pickup);
    return false;
  });
  if (pickupExpAudioCount > 0) playAudioEvent("pickupExp", { count: pickupExpAudioCount });
  if (pickupCoinAudioCount > 0) playAudioEvent("pickupCoin", { count: pickupCoinAudioCount });
  if (pickupHealAudioCount > 0) playAudioEvent("playerHeal", { count: pickupHealAudioCount });
  if (pickupItemAudioCount > 0) playAudioEvent("pickupItem", { count: pickupItemAudioCount });

  processPendingLevelUp(engine, setOverlay, setLevelChoices, showAchievement);

  if (timelineElapsed - engine.lastAchievementCheckAt >= 0.5) {
    engine.lastAchievementCheckAt = timelineElapsed;
    checkBattleAchievements(engine, showAchievement);
  }

  if (engine.stats.hp <= 0 && !engine.outcome) {
    engine.outcome = "defeat";
    setOverlay("result");
  }
  if (engine.timeLeft <= 0 && !engine.outcome) {
    engine.outcome = "victory";
    setOverlay("result");
  }
}

export function BattleScreen({
  durationSeconds = BATTLE_DURATION_SECONDS,
  testFullBuild = false,
  mapId = "MAP001",
  difficultyId = "DIFF001",
  archivedAchievements = EMPTY_ARCHIVED_ACHIEVEMENTS,
  isFirstMapDifficultyClear = false,
  expectedClearUnlocks = [],
  onReturnMain,
}: BattleScreenProps) {
  const battleViewportRef = useRef<HTMLDivElement | null>(null);
  const pixiRendererRef = useRef<PixiBattleRenderer | null>(null);
  const imagesRef = useRef<Record<ImageKey, HTMLImageElement> | null>(null);
  const engineRef = useRef<EngineState>(createInitialEngine(durationSeconds, mapId, difficultyId, archivedAchievements, testFullBuild));
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastFrameRunRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchLayerRef = useRef<HTMLDivElement | null>(null);
  const touchMoveRef = useRef({ dx: 0, dy: 0 });
  const touchPointerIdRef = useRef<number | null>(null);
  const touchBaseRef = useRef({ x: 0, y: 0 });
  const touchStickRef = useRef<TouchStickState>({ active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0 });
  const overlayRef = useRef<Overlay>("none");
  const achievementTimerRef = useRef<number | null>(null);
  const resumeBattleFrameRef = useRef<number | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [overlay, setOverlayState] = useState<Overlay>("none");
  const [levelChoices, setLevelChoices] = useState<UpgradeChoice[]>([]);
  const [chestChoices, setChestChoices] = useState<ChestReward[]>([]);
  const [achievementToast, setAchievementToast] = useState<BattleAchievement | null>(null);
  const [evolutionFlash, setEvolutionFlash] = useState(false);
  const [ui, setUi] = useState<UiState>(() => uiFromEngine(engineRef.current));
  const { settings, setSettings } = useGameSettings();

  function setOverlay(overlayValue: Overlay) {
    if (resumeBattleFrameRef.current !== null) {
      window.cancelAnimationFrame(resumeBattleFrameRef.current);
      resumeBattleFrameRef.current = null;
    }
    overlayRef.current = overlayValue;
    setOverlayState(overlayValue);
  }

  function closeOverlayAfterRender() {
    if (resumeBattleFrameRef.current !== null) window.cancelAnimationFrame(resumeBattleFrameRef.current);
    setOverlayState("none");
    resumeBattleFrameRef.current = window.requestAnimationFrame(() => {
      resumeBattleFrameRef.current = window.requestAnimationFrame(() => {
        resumeBattleFrameRef.current = null;
        lastTimeRef.current = null;
        lastUiUpdateRef.current = 0;
        overlayRef.current = "none";
      });
    });
  }

  function previewSfxVolume() {
    playAudioEvent("uiConfirm", { cooldownMs: 0 });
  }

  function showAchievement(achievement: BattleAchievement) {
    setAchievementToast(achievement);
    playAudioEvent("uiPopup");
    if (achievementTimerRef.current !== null) window.clearTimeout(achievementTimerRef.current);
    achievementTimerRef.current = window.setTimeout(() => setAchievementToast(null), 3000);
  }

  useEffect(() => {
    engineRef.current = createInitialEngine(durationSeconds, mapId, difficultyId, archivedAchievements, testFullBuild);
    lastTimeRef.current = null;
    lastFrameRunRef.current = null;
    lastUiUpdateRef.current = 0;
    setUi(uiFromEngine(engineRef.current));
    setOverlay("none");
  }, [durationSeconds, testFullBuild, mapId, difficultyId, archivedAchievements]);

  useEffect(() => {
    if (overlay === "none") return;
    resetTouchInput();
  }, [overlay]);

  useEffect(() => {
    startBattleMusic();
    prewarmBattleSfx();
    return () => stopBattleMusic();
  }, []);

  useEffect(() => {
    const host = battleViewportRef.current;
    if (!host) return undefined;

    let cancelled = false;
    createPixiBattleRenderer(host).then((renderer) => {
      if (cancelled) {
        renderer.destroy();
        return;
      }
      pixiRendererRef.current = renderer;
    });

    return () => {
      cancelled = true;
      pixiRendererRef.current?.destroy();
      pixiRendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (overlay === "result" || ui.outcome) {
      stopBattleMusic();
      return;
    }

    updateBattleMusic({
      ducked: overlay === "level-up" || overlay === "chest",
      intensity: ui.bossSpawned ? "boss" : "normal",
      paused: false,
    });
  }, [overlay, ui.bossSpawned, ui.outcome]);

  useEffect(() => {
    let cancelled = false;
    setAssetsReady(false);
    imagesRef.current = null;
    loadImages(mapId, (images) => {
      if (cancelled) return;
      imagesRef.current = images;
      setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      pressedKeysRef.current.add(key);
    }
    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      pressedKeysRef.current.delete(key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    function releasePointer(event: PointerEvent) {
      if (touchPointerIdRef.current !== event.pointerId) return;
      resetTouchInput();
    }
    window.addEventListener("pointerup", releasePointer, { capture: true });
    window.addEventListener("pointercancel", releasePointer, { capture: true });
    window.addEventListener("blur", resetTouchInput);
    return () => {
      window.removeEventListener("pointerup", releasePointer, { capture: true });
      window.removeEventListener("pointercancel", releasePointer, { capture: true });
      window.removeEventListener("blur", resetTouchInput);
    };
  }, []);


  useEffect(() => {
    function tick(time: number) {
      const lastFrameRun = lastFrameRunRef.current;
      if (lastFrameRun !== null && time - lastFrameRun < BATTLE_FRAME_INTERVAL_MS - 1) {
        frameIdRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const previousTime = lastTimeRef.current ?? time;
      lastFrameRunRef.current = time;
      lastTimeRef.current = time;
      const delta = Math.min((time - previousTime) / 1000, 0.04);
      const viewport = battleViewportRef.current;
      const renderer = pixiRendererRef.current;
      const images = imagesRef.current;

      if (viewport && renderer && images) {
        const keys = pressedKeysRef.current;
        const touchMove = touchMoveRef.current;
        const move = { dx: touchMove.dx, dy: touchMove.dy };
        if (keys.has("a")) move.dx -= 1;
        if (keys.has("d")) move.dx += 1;
        if (keys.has("w")) move.dy -= 1;
        if (keys.has("s")) move.dy += 1;
        if (overlayRef.current === "none") {
          updateEngine(engineRef.current, delta, viewport, move, setOverlay, setLevelChoices, setChestChoices, showAchievement);
          if (time - lastUiUpdateRef.current >= HUD_UPDATE_INTERVAL_MS || overlayRef.current !== "none" || engineRef.current.outcome) {
            lastUiUpdateRef.current = time;
            setUi(uiFromEngine(engineRef.current));
          }
        }
        renderer.render(engineRef.current, images, touchStickRef.current);
      }

      frameIdRef.current = window.requestAnimationFrame(tick);
    }

    frameIdRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current !== null) window.cancelAnimationFrame(frameIdRef.current);
      if (resumeBattleFrameRef.current !== null) window.cancelAnimationFrame(resumeBattleFrameRef.current);
      if (achievementTimerRef.current !== null) window.clearTimeout(achievementTimerRef.current);
    };
  }, []);

  function resetTouchInput() {
    const pointerId = touchPointerIdRef.current;
    const layer = touchLayerRef.current;
    if (pointerId !== null && layer?.hasPointerCapture(pointerId)) layer.releasePointerCapture(pointerId);
    touchPointerIdRef.current = null;
    touchMoveRef.current = { dx: 0, dy: 0 };
    touchStickRef.current = { active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
  }

  function updateTouchDirection(event: ReactPointerEvent<HTMLDivElement>) {
    if (touchPointerIdRef.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + touchBaseRef.current.x;
    const centerY = rect.top + touchBaseRef.current.y;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const radius = 46;
    const distance = Math.min(radius, Math.hypot(rawX, rawY));
    const angle = Math.atan2(rawY, rawX);
    const magnitude = distance / radius;
    touchMoveRef.current =
      magnitude < 0.14
        ? { dx: 0, dy: 0 }
        : {
            dx: Math.cos(angle) * magnitude,
            dy: Math.sin(angle) * magnitude,
          };
    touchStickRef.current = {
      active: true,
      baseX: touchBaseRef.current.x,
      baseY: touchBaseRef.current.y,
      knobX: Math.cos(angle) * distance,
      knobY: Math.sin(angle) * distance,
    };
  }

  function handleTouchStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (overlayRef.current !== "none") return;
    const rect = event.currentTarget.getBoundingClientRect();
    touchPointerIdRef.current = event.pointerId;
    touchBaseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateTouchDirection(event);
  }

  function handleTouchEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (touchPointerIdRef.current !== event.pointerId) return;
    resetTouchInput();
  }

  function chooseUpgrade(choice: UpgradeChoice) {
    applyUpgrade(engineRef.current, choice);
    if (choice.kind === "evolution") {
      setEvolutionFlash(true);
      window.setTimeout(() => setEvolutionFlash(false), 900);
      playAudioEvent("evolveComplete");
    }
    checkBattleAchievements(engineRef.current, showAchievement);
    closeOverlayAfterRender();
  }

  function continueAfterReward() {
    const engine = engineRef.current;
    const result = processPendingLevelUp(engine, setOverlay, setLevelChoices, showAchievement);
    if (result) {
      setUi(uiFromEngine(engine));
      if (result === "completion") setOverlay("none");
      return;
    }
    setUi(uiFromEngine(engine));
    closeOverlayAfterRender();
  }

  function chooseChestReward(reward: ChestReward) {
    applyChestReward(engineRef.current, reward);
    playAudioEvent("uiConfirm");
    checkBattleAchievements(engineRef.current, showAchievement);
    continueAfterReward();
  }

  function createBattleSummary(): BattleSummary {
    const engine = engineRef.current;
    const bossDefeated =
      engine.bossSpawned &&
      (engine.outcome === "victory" || !engine.monsters.some((monster) => monster.kind === engine.mapConfig.bossId && !monster.isDying));
    return {
      runId: engine.runId,
      outcome: engine.outcome,
      mapId: engine.mapConfig.id,
      difficultyId: engine.difficultyPreset.id,
      bossId: engine.mapConfig.bossId,
      duration: engine.duration,
      survivedTime: Math.round(engine.duration - engine.timeLeft),
      level: engine.level,
      coins: engine.coins,
      weapons: { ...engine.weapons },
      evolvedWeapons: (Object.keys(engine.evolvedWeapons) as WeaponId[]).filter((weapon) => engine.evolvedWeapons[weapon]),
      relics: [...engine.relics],
      encounteredMonsters: [...engine.encounteredMonsters],
      kills: engine.kills,
      eliteKills: engine.eliteKills,
      damageTaken: engine.damageTaken,
      lowHpTriggered: engine.stats.hp <= engine.stats.maxHp * 0.25 || engine.damageTaken >= 8,
      bossSpawned: engine.bossSpawned,
      bossDefeated,
      achievements: [...engine.unlockedAchievements],
      timeLeft: engine.timeLeft,
    };
  }

  const xpPercent = Math.max(0, Math.min(100, (ui.xp / ui.xpToNext) * 100));
  const weaponItems = WEAPON_IDS.filter((weapon) => ui.weapons[weapon] > 0).map((weapon) => ({
    id: weapon,
    name: ui.evolvedWeapons[weapon] ? getSuperWeaponTitle(weapon) : WEAPON_META[weapon].name,
    level: ui.weapons[weapon],
    evolved: ui.evolvedWeapons[weapon],
  }));
  const weaponSummary = weaponItems.map((weapon) => `${weapon.name} Lv.${weapon.level}${weapon.evolved ? "★" : ""}`).join(" · ");
  const relicItems = ui.relics.map((relic) => ({
    id: relic,
    config: getRelicConfig(relic),
    level: ui.relicLevels[relic] ?? 1,
  }));

  return (
    <section className="battle-screen" aria-label="战斗场景">
      <div ref={battleViewportRef} className="battle-canvas" aria-label="战斗画布" />
      <div
        ref={touchLayerRef}
        className="battle-touch-layer"
        aria-label="触屏移动"
        role="application"
        onPointerDown={handleTouchStart}
        onPointerMove={updateTouchDirection}
        onPointerUp={handleTouchEnd}
        onPointerCancel={handleTouchEnd}
        onLostPointerCapture={resetTouchInput}
      />

      <div className="battle-hud">
        <div className="battle-map-badge" aria-label={`地图 ${ui.mapName}，难度 ${ui.difficultyName}`}>
          <strong>{ui.mapName}</strong>
          <span>{ui.difficultyName} · {ui.mapMechanicName}</span>
        </div>
        <div className="battle-hud__center">
          <div className="battle-timer" aria-label={`剩余时间 ${formatTime(ui.timeLeft)}`}>
            {formatTime(ui.timeLeft)}
          </div>
        </div>
        <button type="button" className="battle-pause-button" aria-label="暂停" onClick={() => setOverlay("paused")}>
          <Pause aria-hidden="true" size={18} strokeWidth={2.6} />
        </button>
      </div>

      <div className="battle-level-exp battle-top-exp" aria-label="等级与经验">
        <strong>Lv.{ui.level}</strong>
        <span className="battle-level-exp__track">
          <span className="battle-meter__fill battle-meter__fill--xp" style={{ width: `${xpPercent}%` }} />
        </span>
        <span className="battle-level-exp__value" aria-hidden="true">{ui.xp}/{ui.xpToNext}</span>
      </div>

      <div className="battle-side-counters" aria-label="资源与击杀统计">
        <span className="battle-counter">
          <BattleIcon icon="coins" size={18} />
          <span>金币</span>
          <strong>{ui.coins}</strong>
        </span>
        <span className="battle-counter">
          <BattleIcon icon="kills" size={18} />
          <span>击杀</span>
          <strong>{engineRef.current.kills}</strong>
        </span>
      </div>

      {ui.mapEventNotice ? <div className="battle-map-event-toast" role="status">{ui.mapEventNotice}</div> : null}

      <div className="battle-loadout-panel" aria-label="武器与遗物等级">
        <div className="battle-loadout-group">
          <strong>武器</strong>
          {weaponItems.map((weapon) => (
            <span className={weapon.evolved ? "battle-loadout-line battle-loadout-line--evolved" : "battle-loadout-line"} key={weapon.id}>
              Lv{weapon.level} {weapon.name}
            </span>
          ))}
        </div>
        <div className="battle-loadout-group">
          <strong>遗物</strong>
          {relicItems.length > 0 ? (
            relicItems.map((relic) => (
              <span className="battle-loadout-line" key={relic.id}>
                Lv{relic.level} {relic.config.name}
              </span>
            ))
          ) : (
            <span className="battle-loadout-line battle-loadout-line--empty">未获得</span>
          )}
        </div>
      </div>

      {achievementToast ? (
        <div className="battle-achievement-toast" role="status" aria-live="polite">
          <span>成就解锁</span>
          <strong>{achievementToast.title}</strong>
        </div>
      ) : null}

      {evolutionFlash ? <div className="battle-evolution-flash" aria-hidden="true" /> : null}

      {!assetsReady ? <div className="battle-modal-layer">载入中</div> : null}

      {overlay === "paused" ? (
        <div className="battle-modal-layer" role="dialog" aria-modal="true" aria-labelledby="battle-pause-title">
          <div className="battle-pause-panel">
            <h2 id="battle-pause-title">暂停</h2>
            <div className="battle-pause-settings" aria-label="战斗设置">
              <label className="battle-setting-row">
                <span>音乐</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  aria-valuetext={`${settings.music}%`}
                  value={settings.music}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      music: Number(event.target.value),
                    }))
                  }
                />
                <strong>{settings.music}%</strong>
              </label>
              <label className="battle-setting-row">
                <span>音效</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  aria-valuetext={`${settings.sfx}%`}
                  value={settings.sfx}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      sfx: Number(event.target.value),
                    }))
                  }
                  onPointerUp={previewSfxVolume}
                  onKeyUp={previewSfxVolume}
                />
                <strong>{settings.sfx}%</strong>
              </label>
            </div>
            <button type="button" className="battle-pause-action battle-pause-action--primary" onClick={() => setOverlay("none")}>
              <Play aria-hidden="true" size={17} strokeWidth={2.6} />
              继续游戏
            </button>
            <button type="button" className="battle-pause-action" onClick={() => onReturnMain()}>
              <House aria-hidden="true" size={17} strokeWidth={2.6} />
              返回主界面
            </button>
          </div>
        </div>
      ) : null}

      {overlay === "level-up" ? (
        <div className="battle-modal-layer" role="dialog" aria-modal="true" aria-labelledby="battle-level-title">
          <div className="battle-level-panel">
            <h2 id="battle-level-title">等级提升</h2>
            <div className="battle-upgrade-grid">
              {levelChoices.map((choice) => (
                <button
                  type="button"
                  className={choice.highlighted ? "battle-upgrade-card battle-upgrade-card--evolution" : "battle-upgrade-card"}
                  key={choice.id}
                  onClick={() => chooseUpgrade(choice)}
                >
                  <BattleIcon icon={choice.icon} />
                  <strong>{choice.title}</strong>
                  <span>{choice.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {overlay === "chest" ? (
        <div className="battle-modal-layer" role="dialog" aria-modal="true" aria-labelledby="battle-chest-title">
          <div className="battle-level-panel battle-chest-panel">
            <h2 id="battle-chest-title">宝箱开启</h2>
            <div className="battle-upgrade-grid battle-chest-grid">
              {chestChoices.map((choice) => (
                <button
                  type="button"
                  className="battle-upgrade-card battle-chest-card"
                  key={`${choice.kind}-${choice.title}`}
                  onClick={() => chooseChestReward(choice)}
                >
                  <BattleIcon icon={choice.icon} />
                  <strong>{choice.title}</strong>
                  <span>{choice.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {overlay === "result" ? (
        <div className="battle-modal-layer" role="dialog" aria-modal="true" aria-labelledby="battle-result-title">
          <div className="battle-pause-panel battle-pause-panel--game-over">
            <h2 id="battle-result-title">{ui.outcome === "victory" ? "通关成功" : "游戏结束"}</h2>
            <p>{ui.mapName} · {ui.difficultyName} · 等级 {ui.level} · 金币 {ui.coins}</p>
            <p>{weaponSummary} · 遗物 {ui.relics.length}/6</p>
            {ui.outcome === "victory" && isFirstMapDifficultyClear ? (
              <p>首次通关奖励：{expectedClearUnlocks.length > 0 ? expectedClearUnlocks.join("、") : "通关记录已保存"}</p>
            ) : null}
            <p>击杀 {engineRef.current.kills} · 精英 {engineRef.current.eliteKills} · 成就 {engineRef.current.unlockedAchievements.size}</p>
            <button type="button" className="battle-pause-action battle-pause-action--primary" onClick={() => onReturnMain(createBattleSummary())}>
              <House aria-hidden="true" size={17} strokeWidth={2.6} />
              返回主界面
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
