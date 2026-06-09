import { MONSTER_CATALOG, RELIC_CATALOG, WEAPON_CATALOG } from "@/features/catalog/gameCatalog";
import { MAP_CONFIGS } from "@/features/maps/mapConfigs";

import type { CatalogEntryKind } from "@/features/catalog/gameCatalog";

export type CodexFilter = "all" | CatalogEntryKind;

export type CodexEntry = {
  id: string;
  category: CatalogEntryKind;
  code: string;
  name: string;
  unlocked: boolean;
  typeLabel: string;
  rarity: string;
  shortDesc: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
  tags: string[];
  unlockHint: string;
};

export type CodexArchiveState = {
  monsters: string[];
  weapons: string[];
  relics: string[];
};

const CATEGORY_LABELS: Record<CatalogEntryKind, string> = {
  monster: "怪物",
  boss: "Boss",
  weapon: "武器",
  relic: "遗物",
};

const weaponBuildHints: Record<string, string> = {
  mangoCake: "适合稳定单点与穿透清线，是默认构筑核心。",
  strawberryMilkshake: "适合近身防护，持续时间和冷却决定真空期。",
  starlightPaperPlane: "适合处理成排敌群，搭配攻击与弹体尺寸收益高。",
  luckyClover: "适合随机方向铺场，超进化后补充爆炸和金币收益。",
  moonBookmark: "适合最近目标弹射，面对密集敌群时收益更高。",
  starPulse: "适合定点范围爆发，压制高血量敌人与Boss周边敌群。",
};

const relicPairHints: Record<string, string> = {
  xingliHairpin: "对应芒果蛋糕超进化。",
  cafeCard: "对应星光纸飞机超进化。",
  dreamAlbum: "对应星轨脉冲超进化。",
  moonBookmarkRelic: "对应月光书签超进化。",
  luckyCharm: "对应幸运四叶草超进化。",
  strawberryShake: "对应草莓奶昔超进化。",
};

function isUnlocked(archive: CodexArchiveState, id: string) {
  return archive.monsters.includes(id) || archive.weapons.includes(id) || archive.relics.includes(id) || id === "mangoCake";
}

function monsterMapNames(id: string) {
  const names = MAP_CONFIGS.filter((map) => map.bossId === id || map.phaseWeights.some((phase) => phase.some((enemy) => enemy.id === id))).map((map) => map.name);
  return names.length > 0 ? names.join(" / ") : "后续地图";
}

function monsterTimeHint(code: string, note: string) {
  const match = note.match(/(\d+[-~]\d+分钟|\d+分钟后|\d+分钟登场|14分钟登场)/);
  if (match) return match[0];
  return code.startsWith("B") ? "Boss阶段" : "战斗中期";
}

function findRelicForWeapon(recipe?: string) {
  if (!recipe) return "???";
  const relic = RELIC_CATALOG.find((item) => recipe.includes(item.name));
  const parts = recipe.split("+");
  return relic?.name ?? parts[parts.length - 1]?.trim() ?? "???";
}

function findWeaponForRelic(relicName: string) {
  const weapon = WEAPON_CATALOG.find((item) => item.evolutionRecipe?.includes(relicName));
  return weapon ? `${weapon.name} -> ${weapon.evolution ?? "超武器"}` : "后续构筑";
}

export function buildCodexEntries(archive: CodexArchiveState): CodexEntry[] {
  const monsters = MONSTER_CATALOG.map((entry): CodexEntry => ({
    id: entry.id,
    category: entry.kind,
    code: entry.code,
    name: entry.name,
    unlocked: isUnlocked(archive, entry.id),
    typeLabel: CATEGORY_LABELS[entry.kind],
    rarity: entry.kind === "boss" ? "高危目标" : "梦境敌群",
    shortDesc: entry.gameplayNote,
    description: entry.artDescription,
    stats: [
      { label: "出现地图", value: monsterMapNames(entry.id) },
      { label: "出现时间", value: monsterTimeHint(entry.code, entry.gameplayNote) },
      { label: "掉落奖励", value: entry.kind === "boss" ? "传奇宝箱 / 通关" : "经验球，小概率资源" },
    ],
    tags: entry.kind === "boss" ? ["Boss", "高生命", "阶段目标"] : ["追击", "经验来源"],
    unlockHint: entry.unlockHint,
  }));

  const weapons = WEAPON_CATALOG.map((entry): CodexEntry => ({
    id: entry.id,
    category: "weapon",
    code: entry.code,
    name: entry.name,
    unlocked: isUnlocked(archive, entry.id),
    typeLabel: "武器",
    rarity: entry.evolution ? "可超进化" : "基础武器",
    shortDesc: entry.gameplayNote,
    description: entry.artDescription,
    stats: [
      { label: "攻击方式", value: entry.gameplayNote },
      { label: "等级成长", value: "最高 Lv8，升级强化数量、伤害、穿透或范围节奏。" },
      { label: "对应遗物", value: findRelicForWeapon(entry.evolutionRecipe) },
      { label: "超进化名称", value: entry.evolution ?? "???" },
      { label: "合成公式", value: entry.evolutionRecipe ?? "???" },
      { label: "适合 Build", value: weaponBuildHints[entry.id] ?? "根据掉落和地图压力灵活搭配。" },
    ],
    tags: ["主动武器", entry.evolution ? "超武器" : "基础"],
    unlockHint: "在战斗升级或宝箱中获得后解锁。",
  }));

  const relics = RELIC_CATALOG.map((entry): CodexEntry => ({
    id: entry.id,
    category: "relic",
    code: entry.code,
    name: entry.name,
    unlocked: isUnlocked(archive, entry.id),
    typeLabel: "遗物",
    rarity: "Lv7满级",
    shortDesc: entry.effect,
    description: entry.artDescription,
    stats: [
      { label: "属性效果", value: entry.effect },
      { label: "等级成长", value: "最高 Lv7，每级提升一个阶段。" },
      { label: "对应超武器", value: findWeaponForRelic(entry.name) },
      { label: "推荐搭配", value: relicPairHints[entry.id] ?? "与对应武器优先搭配。" },
    ],
    tags: ["被动成长", "超武器组件"],
    unlockHint: "从升级选项或宝箱奖励中获得后解锁。",
  }));

  return [...monsters, ...weapons, ...relics];
}
