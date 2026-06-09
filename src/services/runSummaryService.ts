import { MONSTER_CATALOG_BY_ID, RELIC_CATALOG_BY_ID, WEAPON_CATALOG_BY_ID } from "@/features/catalog/gameCatalog";
import { getDifficultyPreset, getMapConfig } from "@/features/maps/mapConfigs";

import type { BattleSummary } from "@/features/battle/BattleScreen";
import type { LastRunSummary } from "@/features/xingli-chat/xingliChat.types";

const LAST_RUN_STORAGE_KEY = "xingcunzhe-last-run-summary-v1";
const RECENT_RUNS_STORAGE_KEY = "xingcunzhe-recent-run-summaries-v1";
const MAX_RECENT_RUNS = 8;

function getWeaponNames(summary: BattleSummary) {
  return Object.entries(summary.weapons)
    .filter(([, level]) => level > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([weapon, level]) => `${WEAPON_CATALOG_BY_ID[weapon as keyof typeof WEAPON_CATALOG_BY_ID].name} Lv.${level}`);
}

function getSuperWeaponNames(summary: BattleSummary) {
  return summary.evolvedWeapons.map((weapon) => WEAPON_CATALOG_BY_ID[weapon].evolution ?? WEAPON_CATALOG_BY_ID[weapon].name);
}

function buildHighlights(summary: BattleSummary): string[] {
  const highlights: string[] = [];
  if (summary.outcome === "victory") highlights.push("完成了本局巡夜");
  if (summary.kills >= 1000) highlights.push("击杀数超过1000");
  else if (summary.kills >= 300) highlights.push("清怪节奏不错");
  if (summary.evolvedWeapons.length > 0) highlights.push(`合成了${summary.evolvedWeapons.length}把超武器`);
  if (summary.bossDefeated) highlights.push(`击败了${MONSTER_CATALOG_BY_ID[summary.bossId].name}`);
  if (summary.achievements.length > 0) highlights.push(`解锁了${summary.achievements.length}个成就`);
  return highlights.slice(0, 4);
}

function buildMistakes(summary: BattleSummary): string[] {
  const mistakes: string[] = [];
  if (summary.outcome !== "victory" && summary.bossSpawned && !summary.bossDefeated) mistakes.push("Boss阶段需要继续保持走位");
  if (summary.damageTaken >= 8) mistakes.push("本局承受伤害偏多");
  if (summary.lowHpTriggered) mistakes.push("曾进入低血量危险状态");
  if (summary.evolvedWeapons.length === 0) mistakes.push("没有合成超武器");
  if (summary.level < 12 && summary.duration >= 60) mistakes.push("成长节奏偏慢");
  return mistakes.slice(0, 4);
}

export function createLastRunSummary(summary: BattleSummary): LastRunSummary {
  const map = getMapConfig(summary.mapId);
  const difficulty = getDifficultyPreset(summary.difficultyId);
  const bossName = MONSTER_CATALOG_BY_ID[summary.bossId].name;
  const result = summary.outcome === "victory" ? "victory" : "defeat";
  return {
    runId: summary.runId,
    mapName: map.name,
    difficulty: difficulty.name,
    result,
    survivedTime: summary.survivedTime,
    finalLevel: summary.level,
    kills: summary.kills,
    coins: summary.coins,
    bossName,
    bossDefeated: summary.bossDefeated,
    deathReason: result === "defeat" ? (summary.bossSpawned ? "Boss阶段压力过高" : "怪物包围导致倒下") : undefined,
    mainWeapons: getWeaponNames(summary),
    relics: summary.relics.map((relic) => RELIC_CATALOG_BY_ID[relic].name),
    superWeapons: getSuperWeaponNames(summary),
    achievementsUnlocked: summary.achievements,
    highlights: buildHighlights(summary),
    mistakes: buildMistakes(summary),
  };
}

export function readLastRunSummary(): LastRunSummary | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_RUN_STORAGE_KEY) ?? "null") as LastRunSummary | null;
  } catch {
    return null;
  }
}

export function readRecentRunSummaries(): LastRunSummary[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_RUNS_STORAGE_KEY) ?? "[]") as LastRunSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLastRunSummary(summary: LastRunSummary): void {
  const recent = [summary, ...readRecentRunSummaries().filter((run) => run.runId !== summary.runId)].slice(0, MAX_RECENT_RUNS);
  localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify(summary));
  localStorage.setItem(RECENT_RUNS_STORAGE_KEY, JSON.stringify(recent));
}
