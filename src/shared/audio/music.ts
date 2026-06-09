import { SETTINGS_CHANGE_EVENT } from "@/features/settings/useGameSettings";

const lobbyLoopUrl = new URL("../../../BGM/lobby/Starbyte Lobby.mp3", import.meta.url).href;
const battleLoopUrl = new URL("../../../BGM/battle/Neon Swarm Loop.mp3", import.meta.url).href;
const bossFightLoopUrl = new URL("../../../BGM/boss fight/Circuit Warden.mp3", import.meta.url).href;

type MusicMode = "none" | "lobby" | "battle";
type MusicIntensity = "normal" | "boss";
type TrackId = "lobby" | "battle" | "boss";

type MusicState = {
  ducked: boolean;
  intensity: MusicIntensity;
  mode: MusicMode;
  paused: boolean;
};

export type BattleMusicOptions = Partial<Pick<MusicState, "ducked" | "intensity" | "paused">>;

type MusicTrack = {
  audio: HTMLAudioElement;
  targetVolume: number;
};

const SETTINGS_KEY = "xingcunzhe-settings";
const DEFAULT_MUSIC_VOLUME = 48;
const LOBBY_VOLUME = 0.38;
const BATTLE_VOLUME = 0.52;
const BOSS_FIGHT_VOLUME = 0.5;
const DUCK_SCALE = 0.46;
const FADE_STEP_MS = 45;

let lobbyTrack: MusicTrack | null = null;
let battleTrack: MusicTrack | null = null;
let bossTrack: MusicTrack | null = null;
let fadeTimer: number | null = null;
let unlockRetryInstalled = false;

const musicState: MusicState = {
  ducked: false,
  intensity: "normal",
  mode: "none",
  paused: false,
};

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getMusicVolumeScale(): number {
  if (!hasWindow()) return DEFAULT_MUSIC_VOLUME / 100;

  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as {
      music?: unknown;
    };
    const value = Number(parsed.music ?? DEFAULT_MUSIC_VOLUME);
    if (!Number.isFinite(value)) return DEFAULT_MUSIC_VOLUME / 100;
    return Math.max(0, Math.min(100, value)) / 100;
  } catch {
    return DEFAULT_MUSIC_VOLUME / 100;
  }
}

function createTrack(url: string, preload: HTMLAudioElement["preload"] = "none"): MusicTrack {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = preload;
  audio.volume = 0;
  return {
    audio,
    targetVolume: 0,
  };
}

function ensureTracks(): Record<TrackId, MusicTrack> {
  lobbyTrack ??= createTrack(lobbyLoopUrl, "auto");
  battleTrack ??= createTrack(battleLoopUrl);
  bossTrack ??= createTrack(bossFightLoopUrl);
  return {
    battle: battleTrack,
    boss: bossTrack,
    lobby: lobbyTrack,
  };
}

function installUnlockRetry(): void {
  if (!hasWindow() || unlockRetryInstalled) return;
  unlockRetryInstalled = true;

  const retry = () => {
    unlockRetryInstalled = false;
    syncMusicPlayback();
  };

  window.addEventListener("pointerdown", retry, { once: true, capture: true });
  window.addEventListener("click", retry, { once: true, capture: true });
  window.addEventListener("mousedown", retry, { once: true, capture: true });
  window.addEventListener("touchend", retry, { once: true, capture: true });
  window.addEventListener("keydown", retry, { once: true, capture: true });
}

function playTrack(track: MusicTrack): void {
  if (!track.audio.paused) return;
  track.audio.play().catch(() => installUnlockRetry());
}

function stopTrack(track: MusicTrack): void {
  track.audio.pause();
  track.audio.volume = 0;
  track.audio.currentTime = 0;
}

function computeTargetVolumes(): Record<TrackId, number> {
  const settingsScale = getMusicVolumeScale();
  if (musicState.mode === "none" || musicState.paused) {
    return { battle: 0, boss: 0, lobby: 0 };
  }

  if (musicState.mode === "lobby") {
    return {
      battle: 0,
      boss: 0,
      lobby: LOBBY_VOLUME * settingsScale,
    };
  }

  const duckScale = musicState.ducked ? DUCK_SCALE : 1;
  return {
    battle: (musicState.intensity === "boss" ? 0 : BATTLE_VOLUME) * settingsScale * duckScale,
    boss: (musicState.intensity === "boss" ? BOSS_FIGHT_VOLUME : 0) * settingsScale * duckScale,
    lobby: 0,
  };
}

function applyTargetVolumes(): void {
  const tracks = ensureTracks();
  const target = computeTargetVolumes();

  tracks.lobby.targetVolume = target.lobby;
  tracks.battle.targetVolume = target.battle;
  tracks.boss.targetVolume = target.boss;

  if (fadeTimer !== null) window.clearInterval(fadeTimer);

  const entries: Array<[TrackId, MusicTrack]> = [
    ["lobby", tracks.lobby],
    ["battle", tracks.battle],
    ["boss", tracks.boss],
  ];
  const activeEntry = entries.find(([, track]) => track.targetVolume > 0);

  for (const [, track] of entries) {
    if (track === activeEntry?.[1]) continue;
    stopTrack(track);
  }

  if (!activeEntry) {
    fadeTimer = null;
    return;
  }

  const [, activeTrack] = activeEntry;
  playTrack(activeTrack);

  fadeTimer = window.setInterval(() => {
    const delta = activeTrack.targetVolume - activeTrack.audio.volume;
    const settled = Math.abs(delta) <= 0.01;
    if (settled) activeTrack.audio.volume = activeTrack.targetVolume;
    else activeTrack.audio.volume = Math.max(0, Math.min(1, activeTrack.audio.volume + delta * 0.18));

    if (!settled) return;
    if (fadeTimer !== null) {
      window.clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }, FADE_STEP_MS);
}

function syncMusicPlayback(): void {
  if (!hasWindow()) return;
  applyTargetVolumes();
}

export function startLobbyMusic(): void {
  Object.assign(musicState, {
    ducked: false,
    intensity: "normal",
    mode: "lobby",
    paused: false,
  });
  installUnlockRetry();
  syncMusicPlayback();
}

export function stopLobbyMusic(): void {
  if (musicState.mode !== "lobby") return;
  Object.assign(musicState, {
    ducked: false,
    intensity: "normal",
    mode: "none",
    paused: false,
  });
  syncMusicPlayback();
}

export function startBattleMusic(options: BattleMusicOptions = {}): void {
  Object.assign(musicState, {
    ducked: false,
    intensity: "normal",
    mode: "battle",
    paused: false,
    ...options,
  });
  installUnlockRetry();
  syncMusicPlayback();
}

export function updateBattleMusic(options: BattleMusicOptions): void {
  if (musicState.mode !== "battle") return;
  Object.assign(musicState, options);
  syncMusicPlayback();
}

export function stopBattleMusic(): void {
  if (musicState.mode !== "battle") return;
  Object.assign(musicState, {
    ducked: false,
    intensity: "normal",
    mode: "none",
    paused: false,
  });
  syncMusicPlayback();
}

function handleSettingsChange(): void {
  if (musicState.mode === "none") return;
  applyTargetVolumes();
}

function handleVisibilityChange(): void {
  if (musicState.mode === "none") return;
  if (document.hidden) {
    Object.values(ensureTracks()).forEach((track) => track.audio.pause());
    return;
  }
  syncMusicPlayback();
}

if (hasWindow()) {
  window.addEventListener(SETTINGS_CHANGE_EVENT, handleSettingsChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}
