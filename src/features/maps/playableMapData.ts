import map001 from "@/assets/generated/maps/data/map_001_starlight_cafe.json";
import map002 from "@/assets/generated/maps/data/map_002_moonlight_park.json";
import map003 from "@/assets/generated/maps/data/map_003_abandoned_lab.json";
import map004 from "@/assets/generated/maps/data/map_004_dream_library.json";
import map005 from "@/assets/generated/maps/data/map_005_cloud_tram_station.json";
import map006 from "@/assets/generated/maps/data/map_006_dawn_star_ring_tower.json";

import type { CatalogMonsterId } from "@/features/catalog/gameCatalog";
import type { MapId, MapMechanicId } from "@/features/maps/mapConfigs";

export const PLAYABLE_MAP_TILE_WORLD_SIZE = 32;

export type SpawnZoneDirection = "north" | "south" | "east" | "west" | "ne" | "nw" | "se" | "sw";

export type PlayableMapPoint = {
  id: string;
  x: number;
  y: number;
  unlockTime: number;
};

export type PlayableMapEventPoint = PlayableMapPoint & {
  name: string;
  type: string;
};

export type PlayableMapSpawnZone = PlayableMapPoint & {
  direction: SpawnZoneDirection;
};

export type PlayableMapRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlayableMapData = {
  id: MapId;
  name: string;
  scene: string;
  theme: string;
  size: { width: number; height: number; tileSize: number };
  playerSpawn: { x: number; y: number };
  bossArena: { centerX: number; centerY: number; radius: number };
  layers: string[];
  layerFiles: Record<string, string>;
  compositeFile: string;
  eventPoints: PlayableMapEventPoint[];
  spawnZones: PlayableMapSpawnZone[];
  collisionRects: PlayableMapRect[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  mapMechanic: MapMechanicId;
  bossId: CatalogMonsterId;
  baseDifficulty: number;
};

export const PLAYABLE_MAP_DATA_BY_ID: Record<MapId, PlayableMapData> = {
  MAP001: map001 as PlayableMapData,
  MAP002: map002 as PlayableMapData,
  MAP003: map003 as PlayableMapData,
  MAP004: map004 as PlayableMapData,
  MAP005: map005 as PlayableMapData,
  MAP006: map006 as PlayableMapData,
};

export function getPlayableMapData(mapId: MapId) {
  return PLAYABLE_MAP_DATA_BY_ID[mapId] ?? PLAYABLE_MAP_DATA_BY_ID.MAP001;
}

export function mapTileToWorld(tile: number) {
  return tile * PLAYABLE_MAP_TILE_WORLD_SIZE;
}
