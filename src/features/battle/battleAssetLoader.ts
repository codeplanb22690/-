import {
  BATTLE_PIXEL_EVOLVED_PROJECTILES,
  BATTLE_PIXEL_MONSTER_IMAGES,
  BATTLE_PIXEL_PROJECTILES,
  BATTLE_PIXEL_RELIC_ICONS,
  BATTLE_PIXEL_WEAPON_DISPLAY_IMAGES,
} from "@/shared/assets/battlePixelAssets";

import type { CatalogMonsterId } from "@/features/catalog/gameCatalog";
import type { MapId } from "@/features/maps/mapConfigs";

const starlightCafeSceneUrl = new URL("../../assets/generated/maps/starlight-cafe.png", import.meta.url).href;
const xingliLeftWalkUrl = new URL("../../assets/generated/battle-optimized/characters/xingli-left-walk-battle.png", import.meta.url).href;
const xingliRightWalkUrl = new URL("../../assets/generated/battle-optimized/characters/xingli-right-walk-battle.png", import.meta.url).href;
const expCrystalUrl = new URL("../../assets/generated/battle-optimized/pickups/exp-crystal.png", import.meta.url).href;
const coinUrl = new URL("../../assets/generated/battle-optimized/pickups/coin.png", import.meta.url).href;
const chestUrl = new URL("../../assets/generated/battle-optimized/pickups/chest.png", import.meta.url).href;
const healingCakeUrl = new URL("../../assets/generated/battle-optimized/pickups/healing-cake.png", import.meta.url).href;

export type BattlePickupImageKey = "exp" | "coin" | "heal" | "chest" | "luckyStar" | "energyDrink" | "mysteryBox";

export type BattleImageKey =
  | MapId
  | "xingliLeft"
  | "xingliRight"
  | "mangoCakeProjectile"
  | "rainbowCakeProjectile"
  | CatalogMonsterId
  | BattlePickupImageKey;

const MAP_IMAGE_SOURCES: Record<MapId, string> = {
  MAP001: starlightCafeSceneUrl,
  MAP002: starlightCafeSceneUrl,
  MAP003: starlightCafeSceneUrl,
  MAP004: starlightCafeSceneUrl,
  MAP005: starlightCafeSceneUrl,
  MAP006: starlightCafeSceneUrl,
};

const BATTLE_IMAGE_SOURCES: Record<Exclude<BattleImageKey, MapId>, string> = {
  xingliLeft: xingliLeftWalkUrl,
  xingliRight: xingliRightWalkUrl,
  mangoCakeProjectile: BATTLE_PIXEL_PROJECTILES.mangoCake,
  rainbowCakeProjectile: BATTLE_PIXEL_EVOLVED_PROJECTILES.mangoCake,
  "lost-dango": BATTLE_PIXEL_MONSTER_IMAGES["lost-dango"],
  "patrol-robot": BATTLE_PIXEL_MONSTER_IMAGES["patrol-robot"],
  "sleepy-ghost": BATTLE_PIXEL_MONSTER_IMAGES["sleepy-ghost"],
  "repair-robot": BATTLE_PIXEL_MONSTER_IMAGES["repair-robot"],
  "cloud-spirit": BATTLE_PIXEL_MONSTER_IMAGES["cloud-spirit"],
  "alert-robot": BATTLE_PIXEL_MONSTER_IMAGES["alert-robot"],
  "giant-dango-king": BATTLE_PIXEL_MONSTER_IMAGES["giant-dango-king"],
  "nightmare-cat": BATTLE_PIXEL_MONSTER_IMAGES["nightmare-cat"],
  "rogue-robot-mk01": BATTLE_PIXEL_MONSTER_IMAGES["rogue-robot-mk01"],
  "forgotten-shadow": BATTLE_PIXEL_MONSTER_IMAGES["forgotten-shadow"],
  "starrail-conductor": BATTLE_PIXEL_MONSTER_IMAGES["starrail-conductor"],
  "dawn-core": BATTLE_PIXEL_MONSTER_IMAGES["dawn-core"],
  exp: expCrystalUrl,
  coin: coinUrl,
  heal: healingCakeUrl,
  chest: chestUrl,
  luckyStar: BATTLE_PIXEL_RELIC_ICONS.luckyCharm,
  energyDrink: BATTLE_PIXEL_RELIC_ICONS.strawberryShake,
  mysteryBox: coinUrl,
};

const BATTLE_IMAGE_CACHE = new Map<string, Promise<HTMLImageElement>>();

const BATTLE_PREWARM_ONLY_IMAGE_SOURCES = [
  BATTLE_PIXEL_WEAPON_DISPLAY_IMAGES.mangoCake,
];

function loadBattleImage(src: string) {
  const cached = BATTLE_IMAGE_CACHE.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      image.decode?.().then(() => resolve(image)).catch(() => resolve(image));
    };
    image.onerror = () => resolve(image);
    image.src = src;
  });
  BATTLE_IMAGE_CACHE.set(src, promise);
  return promise;
}

function getBattleImageEntries(mapId: MapId) {
  return [[mapId, MAP_IMAGE_SOURCES[mapId]], ...(Object.entries(BATTLE_IMAGE_SOURCES) as [Exclude<BattleImageKey, MapId>, string][])] as [
    BattleImageKey,
    string,
  ][];
}

export async function loadBattleImages(mapId: MapId) {
  const images = {} as Record<BattleImageKey, HTMLImageElement>;
  await Promise.all(
    getBattleImageEntries(mapId).map(async ([key, src]) => {
      images[key] = await loadBattleImage(src);
    }),
  );
  return images;
}

export async function prewarmBattleAssets(mapId: MapId) {
  await Promise.all([
    loadBattleImages(mapId),
    ...BATTLE_PREWARM_ONLY_IMAGE_SOURCES.map(loadBattleImage),
  ]);
}
