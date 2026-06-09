import type { BattleSummary } from "@/features/battle/BattleScreen";

export type GameEventType =
  | "run_start"
  | "run_end"
  | "player_level_up"
  | "weapon_pick"
  | "weapon_upgrade"
  | "relic_pick"
  | "super_weapon_created"
  | "player_damage_taken"
  | "player_low_hp"
  | "boss_spawn"
  | "boss_defeated"
  | "player_death"
  | "victory"
  | "elite_killed"
  | "chest_opened"
  | "achievement_unlocked";

export type GameEvent = {
  id: string;
  type: GameEventType;
  timestamp: number;
  runId?: string;
  runTime?: number;
  payload?: Record<string, unknown>;
};

const TELEMETRY_STORAGE_KEY = "xingcunzhe-game-events-v1";
const MAX_STORED_EVENTS = 120;

function makeEvent(type: GameEventType, summary: BattleSummary, payload?: Record<string, unknown>): GameEvent {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    runId: summary.runId,
    runTime: summary.survivedTime,
    payload,
  };
}

export function buildGameEventsFromSummary(summary: BattleSummary): GameEvent[] {
  const events: GameEvent[] = [
    makeEvent("run_start", summary, {
      mapId: summary.mapId,
      difficultyId: summary.difficultyId,
    }),
  ];

  if (summary.level > 1) events.push(makeEvent("player_level_up", summary, { finalLevel: summary.level }));

  for (const [weapon, level] of Object.entries(summary.weapons)) {
    if (level <= 0) continue;
    events.push(makeEvent(level > 1 ? "weapon_upgrade" : "weapon_pick", summary, { weapon, level }));
  }

  for (const relic of summary.relics) events.push(makeEvent("relic_pick", summary, { relic }));
  for (const weapon of summary.evolvedWeapons) events.push(makeEvent("super_weapon_created", summary, { weapon }));

  if (summary.bossSpawned) events.push(makeEvent("boss_spawn", summary, { bossId: summary.bossId }));
  if (summary.bossDefeated) events.push(makeEvent("boss_defeated", summary, { bossId: summary.bossId }));
  if (summary.damageTaken > 0) events.push(makeEvent("player_damage_taken", summary, { hits: summary.damageTaken }));
  if (summary.lowHpTriggered) events.push(makeEvent("player_low_hp", summary));
  if (summary.eliteKills > 0) events.push(makeEvent("elite_killed", summary, { count: summary.eliteKills }));

  for (const achievement of summary.achievements) events.push(makeEvent("achievement_unlocked", summary, { achievement }));
  events.push(makeEvent(summary.outcome === "victory" ? "victory" : "player_death", summary));
  events.push(makeEvent("run_end", summary, { outcome: summary.outcome, kills: summary.kills, coins: summary.coins }));
  return events;
}

export function readStoredGameEvents(): GameEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) ?? "[]") as GameEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistRunTelemetryFromSummary(summary: BattleSummary): GameEvent[] {
  const events = buildGameEventsFromSummary(summary);
  const next = [...readStoredGameEvents(), ...events].slice(-MAX_STORED_EVENTS);
  localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(next));
  return events;
}
