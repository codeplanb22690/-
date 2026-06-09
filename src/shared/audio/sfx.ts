import { SETTINGS_CHANGE_EVENT } from "@/features/settings/useGameSettings";

const audioModules = import.meta.glob<string>(
  "../../assets/audio/generated/SciFiSurvivor/**/*.wav",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

type AudioBus =
  | "SFX_UI"
  | "SFX_PLAYER"
  | "SFX_WEAPON"
  | "SFX_HIT"
  | "SFX_PICKUP"
  | "SFX_REWARD"
  | "SFX_BOSS";

export type AudioEventId =
  | "uiClick"
  | "uiConfirm"
  | "uiPopup"
  | "playerHurt"
  | "playerHeal"
  | "levelUp"
  | "pickupExp"
  | "pickupExpChain"
  | "pickupExpMagnet"
  | "pickupExpStream"
  | "pickupCoin"
  | "pickupItem"
  | "weaponCuteFire"
  | "weaponMagicFire"
  | "weaponTechFire"
  | "enemyHit"
  | "enemyHitCluster"
  | "enemyHitBurst"
  | "enemyDeath"
  | "enemyDeathCombo"
  | "chestOpen"
  | "evolveComplete"
  | "bossSpawn"
  | "bossDefeat";

export type PlayAudioOptions = {
  volume?: number;
  cooldownMs?: number;
  count?: number;
};

type AggregateRoute = {
  windowMs: number;
  thresholds: Array<{
    min: number;
    target: AudioEventId;
    volumeScale?: number;
  }>;
};

type AudioEventConfig = {
  bus: AudioBus;
  clips: string[];
  volume: number;
  cooldownMs: number;
  pitch: [number, number];
  polyphony: number;
  aggregate?: AggregateRoute;
};

type AggregateQueue = {
  count: number;
  timeoutId: number;
};

type Channel = {
  audio: HTMLAudioElement;
  baseVolume: number;
};

const SETTINGS_KEY = "xingcunzhe-settings";
const DEFAULT_SFX_VOLUME = 80;

const clipUrlsByPrefix = new Map<string, string[]>();
const channelPools = new Map<string, HTMLAudioElement[]>();
const activeChannels = new Set<Channel>();
const aggregateQueues = new Map<AudioEventId, AggregateQueue>();
const lastPlayedAt = new Map<AudioEventId, number>();
let battleSfxPrewarmStarted = false;
let cachedSfxVolumeScale = DEFAULT_SFX_VOLUME / 100;
let hasLoadedSfxVolumeScale = false;

function clipsByPrefix(prefix: string): string[] {
  const cached = clipUrlsByPrefix.get(prefix);
  if (cached) return cached;

  const clips = Object.entries(audioModules)
    .filter(([path]) => path.includes(`/${prefix}_`))
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([, url]) => url);

  clipUrlsByPrefix.set(prefix, clips);
  return clips;
}

const AUDIO_EVENTS: Record<AudioEventId, AudioEventConfig> = {
  uiClick: {
    bus: "SFX_UI",
    clips: clipsByPrefix("sfx_ui_select_card"),
    volume: 0.5,
    cooldownMs: 35,
    pitch: [0.98, 1.06],
    polyphony: 1,
  },
  uiConfirm: {
    bus: "SFX_UI",
    clips: clipsByPrefix("sfx_ui_select_card"),
    volume: 0.64,
    cooldownMs: 70,
    pitch: [1.04, 1.12],
    polyphony: 2,
  },
  uiPopup: {
    bus: "SFX_UI",
    clips: clipsByPrefix("sfx_ui_select_card"),
    volume: 0.54,
    cooldownMs: 120,
    pitch: [0.94, 1.02],
    polyphony: 2,
  },
  playerHurt: {
    bus: "SFX_PLAYER",
    clips: clipsByPrefix("sfx_hit_enemy_cluster"),
    volume: 0.72,
    cooldownMs: 170,
    pitch: [0.82, 0.94],
    polyphony: 2,
  },
  playerHeal: {
    bus: "SFX_PLAYER",
    clips: clipsByPrefix("sfx_pickup_exp_magnet"),
    volume: 0.52,
    cooldownMs: 110,
    pitch: [1.06, 1.16],
    polyphony: 2,
  },
  levelUp: {
    bus: "SFX_REWARD",
    clips: clipsByPrefix("sfx_player_level_up"),
    volume: 0.86,
    cooldownMs: 420,
    pitch: [0.98, 1.04],
    polyphony: 2,
  },
  pickupExp: {
    bus: "SFX_PICKUP",
    clips: [],
    volume: 1,
    cooldownMs: 0,
    pitch: [1, 1],
    polyphony: 1,
    aggregate: {
      windowMs: 130,
      thresholds: [
        { min: 2, target: "pickupExpChain", volumeScale: 0.86 },
        { min: 7, target: "pickupExpMagnet", volumeScale: 0.98 },
        { min: 18, target: "pickupExpStream", volumeScale: 1.08 },
      ],
    },
  },
  pickupExpChain: {
    bus: "SFX_PICKUP",
    clips: clipsByPrefix("sfx_pickup_exp_chain"),
    volume: 0.24,
    cooldownMs: 60,
    pitch: [1.02, 1.18],
    polyphony: 2,
  },
  pickupExpMagnet: {
    bus: "SFX_PICKUP",
    clips: clipsByPrefix("sfx_pickup_exp_magnet"),
    volume: 0.34,
    cooldownMs: 80,
    pitch: [0.98, 1.08],
    polyphony: 2,
  },
  pickupExpStream: {
    bus: "SFX_PICKUP",
    clips: clipsByPrefix("sfx_pickup_exp_chain"),
    volume: 0.38,
    cooldownMs: 130,
    pitch: [1.16, 1.32],
    polyphony: 2,
  },
  pickupCoin: {
    bus: "SFX_PICKUP",
    clips: clipsByPrefix("sfx_pickup_exp_chain"),
    volume: 0.34,
    cooldownMs: 70,
    pitch: [1.2, 1.4],
    polyphony: 2,
  },
  pickupItem: {
    bus: "SFX_PICKUP",
    clips: clipsByPrefix("sfx_pickup_exp_magnet"),
    volume: 0.48,
    cooldownMs: 80,
    pitch: [1.0, 1.12],
    polyphony: 3,
  },
  weaponCuteFire: {
    bus: "SFX_WEAPON",
    clips: clipsByPrefix("sfx_weapon_mango_pop"),
    volume: 0.2,
    cooldownMs: 58,
    pitch: [1.05, 1.2],
    polyphony: 3,
  },
  weaponMagicFire: {
    bus: "SFX_WEAPON",
    clips: clipsByPrefix("sfx_weapon_fire_light"),
    volume: 0.18,
    cooldownMs: 62,
    pitch: [0.98, 1.12],
    polyphony: 3,
  },
  weaponTechFire: {
    bus: "SFX_WEAPON",
    clips: clipsByPrefix("sfx_weapon_fire_light"),
    volume: 0.2,
    cooldownMs: 72,
    pitch: [0.82, 0.96],
    polyphony: 3,
  },
  enemyHit: {
    bus: "SFX_HIT",
    clips: [],
    volume: 1,
    cooldownMs: 0,
    pitch: [1, 1],
    polyphony: 1,
    aggregate: {
      windowMs: 70,
      thresholds: [
        { min: 2, target: "enemyHitCluster", volumeScale: 0.9 },
        { min: 14, target: "enemyHitBurst", volumeScale: 1.04 },
        { min: 34, target: "enemyHitBurst", volumeScale: 1.18 },
      ],
    },
  },
  enemyHitCluster: {
    bus: "SFX_HIT",
    clips: clipsByPrefix("sfx_hit_enemy_soft"),
    volume: 0.16,
    cooldownMs: 64,
    pitch: [0.94, 1.08],
    polyphony: 3,
  },
  enemyHitBurst: {
    bus: "SFX_HIT",
    clips: clipsByPrefix("sfx_hit_enemy_cluster"),
    volume: 0.28,
    cooldownMs: 86,
    pitch: [0.9, 1.06],
    polyphony: 3,
  },
  enemyDeath: {
    bus: "SFX_HIT",
    clips: [],
    volume: 1,
    cooldownMs: 0,
    pitch: [1, 1],
    polyphony: 1,
    aggregate: {
      windowMs: 140,
      thresholds: [
        { min: 3, target: "enemyDeathCombo", volumeScale: 0.86 },
        { min: 8, target: "enemyDeathCombo", volumeScale: 1.02 },
        { min: 18, target: "enemyDeathCombo", volumeScale: 1.16 },
      ],
    },
  },
  enemyDeathCombo: {
    bus: "SFX_HIT",
    clips: clipsByPrefix("sfx_enemy_death_pop"),
    volume: 0.24,
    cooldownMs: 180,
    pitch: [0.96, 1.2],
    polyphony: 2,
  },
  chestOpen: {
    bus: "SFX_REWARD",
    clips: clipsByPrefix("sfx_chest_open_future"),
    volume: 0.86,
    cooldownMs: 200,
    pitch: [0.96, 1.04],
    polyphony: 2,
  },
  evolveComplete: {
    bus: "SFX_REWARD",
    clips: clipsByPrefix("sfx_evolve_complete"),
    volume: 0.96,
    cooldownMs: 620,
    pitch: [0.94, 1.02],
    polyphony: 2,
  },
  bossSpawn: {
    bus: "SFX_BOSS",
    clips: clipsByPrefix("sfx_boss_spawn"),
    volume: 0.92,
    cooldownMs: 1200,
    pitch: [0.78, 0.9],
    polyphony: 1,
  },
  bossDefeat: {
    bus: "SFX_BOSS",
    clips: clipsByPrefix("sfx_evolve_complete"),
    volume: 0.96,
    cooldownMs: 1200,
    pitch: [0.96, 1.04],
    polyphony: 1,
  },
};

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readSfxVolumeScale(): number {
  if (!hasWindow()) return DEFAULT_SFX_VOLUME / 100;

  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as {
      sfx?: unknown;
    };
    const value = Number(parsed.sfx ?? DEFAULT_SFX_VOLUME);
    return Math.max(0, Math.min(100, value)) / 100;
  } catch {
    return DEFAULT_SFX_VOLUME / 100;
  }
}

function getSfxVolumeScale(): number {
  if (!hasLoadedSfxVolumeScale) {
    cachedSfxVolumeScale = readSfxVolumeScale();
    hasLoadedSfxVolumeScale = true;
  }
  return cachedSfxVolumeScale;
}

function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

function getPool(poolKey: string, clipUrl: string, size: number): HTMLAudioElement[] {
  const existing = channelPools.get(poolKey);
  if (existing) return existing;

  const pool = Array.from({ length: Math.max(1, size) }, () => {
    const audio = new Audio(clipUrl);
    audio.preload = "auto";
    return audio;
  });

  channelPools.set(poolKey, pool);
  return pool;
}

function getAvailableChannel(
  eventId: AudioEventId,
  clipUrl: string,
  polyphony: number,
): HTMLAudioElement | null {
  const pool = getPool(`${eventId}:${clipUrl}`, clipUrl, polyphony);
  return pool.find((audio) => audio.paused || audio.ended) ?? null;
}

function getPlayableChannel(eventId: AudioEventId, clips: string[], polyphony: number): HTMLAudioElement | null {
  if (clips.length === 0) return null;

  const startIndex = Math.floor(Math.random() * clips.length);
  for (let offset = 0; offset < clips.length; offset += 1) {
    const clipUrl = clips[(startIndex + offset) % clips.length];
    const audio = getAvailableChannel(eventId, clipUrl, polyphony);
    if (audio) return audio;
  }

  return null;
}

function flushAggregate(eventId: AudioEventId): void {
  const queue = aggregateQueues.get(eventId);
  const config = AUDIO_EVENTS[eventId];
  if (!queue || !config.aggregate) return;

  aggregateQueues.delete(eventId);
  const route = config.aggregate.thresholds
    .filter((threshold) => queue.count >= threshold.min)
    .at(-1);

  if (!route) return;

  playImmediate(route.target, {
    volume: Math.min(1.35, route.volumeScale ?? 1),
    cooldownMs: 0,
  });
}

function enqueueAggregate(eventId: AudioEventId, count: number): void {
  const config = AUDIO_EVENTS[eventId];
  if (!config.aggregate || !hasWindow()) return;

  const existing = aggregateQueues.get(eventId);
  if (existing) {
    existing.count += count;
    return;
  }

  const timeoutId = window.setTimeout(
    () => flushAggregate(eventId),
    config.aggregate.windowMs,
  );
  aggregateQueues.set(eventId, {
    count,
    timeoutId,
  });
}

function playImmediate(eventId: AudioEventId, options: PlayAudioOptions = {}): void {
  const config = AUDIO_EVENTS[eventId];
  if (!config || !hasWindow()) return;

  const now = performance.now();
  const cooldownMs = options.cooldownMs ?? config.cooldownMs;
  const lastAt = lastPlayedAt.get(eventId) ?? 0;
  if (cooldownMs > 0 && now - lastAt < cooldownMs) return;

  const audio = getPlayableChannel(eventId, config.clips, config.polyphony);
  if (!audio) return;

  const userVolume = getSfxVolumeScale();
  const volumeJitter = 0.92 + Math.random() * 0.16;
  const baseVolume = Math.max(
    0,
    Math.min(1, config.volume * (options.volume ?? 1) * volumeJitter),
  );

  audio.currentTime = 0;
  audio.playbackRate = randomBetween(config.pitch);
  audio.volume = Math.max(0, Math.min(1, baseVolume * userVolume));

  lastPlayedAt.set(eventId, now);
  const channel: Channel = { audio, baseVolume };
  activeChannels.add(channel);

  const clearChannel = () => activeChannels.delete(channel);
  audio.addEventListener("ended", clearChannel, { once: true });
  audio.play().catch(() => {
    activeChannels.delete(channel);
  });
}

export function playAudioEvent(
  eventId: AudioEventId,
  options: PlayAudioOptions = {},
): void {
  const config = AUDIO_EVENTS[eventId];
  if (!config) return;

  if (config.aggregate) {
    enqueueAggregate(eventId, Math.max(1, Math.floor(options.count ?? 1)));
    return;
  }

  playImmediate(eventId, options);
}

export function prewarmBattleSfx(): void {
  if (!hasWindow()) return;
  if (battleSfxPrewarmStarted) return;
  battleSfxPrewarmStarted = true;
  const events: AudioEventId[] = [
    "playerHurt",
    "enemyHitCluster",
    "enemyHitBurst",
    "enemyDeathCombo",
    "pickupExpChain",
    "pickupExpMagnet",
    "pickupExpStream",
    "pickupCoin",
    "pickupItem",
    "bossSpawn",
    "bossDefeat",
  ];

  const jobs: Array<{ eventId: AudioEventId; clipUrl: string; polyphony: number }> = [];
  for (const eventId of events) {
    const config = AUDIO_EVENTS[eventId];
    for (const clipUrl of config.clips) {
      jobs.push({ eventId, clipUrl, polyphony: config.polyphony });
    }
  }

  const runNext = () => {
    const job = jobs.shift();
    if (!job) return;
    getPool(`${job.eventId}:${job.clipUrl}`, job.clipUrl, job.polyphony);
    if (jobs.length > 0) window.setTimeout(runNext, 80);
  };

  window.setTimeout(runNext, 1200);
}

function updateActiveChannelVolumes(): void {
  cachedSfxVolumeScale = readSfxVolumeScale();
  hasLoadedSfxVolumeScale = true;
  const userVolume = cachedSfxVolumeScale;
  activeChannels.forEach((channel) => {
    if (channel.audio.paused || channel.audio.ended) {
      activeChannels.delete(channel);
      return;
    }
    channel.audio.volume = Math.max(0, Math.min(1, channel.baseVolume * userVolume));
  });
}

export function getActiveSfxCount(): number {
  activeChannels.forEach((channel) => {
    if (channel.audio.paused || channel.audio.ended) activeChannels.delete(channel);
  });
  return activeChannels.size;
}

if (hasWindow()) {
  window.addEventListener(SETTINGS_CHANGE_EVENT, updateActiveChannelVolumes);
}
