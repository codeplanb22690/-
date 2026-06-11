import { ArrowLeft, Coins, Crown, Info, Lock, ShieldCheck, Star, Swords, Trophy, X } from "lucide-react";
import { useState } from "react";

import { MONSTER_CATALOG_BY_ID } from "@/features/catalog/gameCatalog";
import { characters } from "@/features/character-select/characters";
import { DIFFICULTY_PRESETS, MAP_CONFIGS, getDifficultyPreset, getMapConfig } from "@/features/maps/mapConfigs";

import type { DifficultyId, MapId } from "@/features/maps/mapConfigs";

const starlightCafeSceneUrl = new URL("../../assets/generated/maps/starlight-cafe.png", import.meta.url).href;

const MAP_PREVIEW_URLS: Record<MapId, string> = {
  MAP001: starlightCafeSceneUrl,
  MAP002: starlightCafeSceneUrl,
  MAP003: starlightCafeSceneUrl,
  MAP004: starlightCafeSceneUrl,
  MAP005: starlightCafeSceneUrl,
  MAP006: starlightCafeSceneUrl,
};

const MAP_SHORT_NAMES: Record<MapId, string> = {
  MAP001: "咖啡厅",
  MAP002: "公园",
  MAP003: "研究所",
  MAP004: "图书馆",
  MAP005: "电车站",
  MAP006: "星环塔",
};

type CharacterSelectScreenProps = {
  onBack: () => void;
  selectedMapId: MapId;
  selectedDifficultyId: DifficultyId;
  mapClearRecords: Partial<Record<MapId, Partial<Record<DifficultyId, { cleared: boolean }>>>>;
  isMapUnlocked: (mapId: MapId) => boolean;
  isDifficultyUnlocked: (difficultyId: DifficultyId) => boolean;
  onSelectMap: (mapId: MapId) => void;
  onSelectDifficulty: (difficultyId: DifficultyId) => void;
  onEnterBattle: () => void;
  isPreparingBattleAssets?: boolean;
};

export function CharacterSelectScreen({
  onBack,
  selectedMapId,
  selectedDifficultyId,
  mapClearRecords,
  isMapUnlocked,
  isDifficultyUnlocked,
  onSelectMap,
  onSelectDifficulty,
  onEnterBattle,
  isPreparingBattleAssets = false,
}: CharacterSelectScreenProps) {
  const selectedCharacter = characters[0];
  const selectedMap = getMapConfig(selectedMapId);
  const selectedDifficulty = getDifficultyPreset(selectedDifficultyId);
  const [showAttributes, setShowAttributes] = useState(false);
  const selectedMapUnlocked = isMapUnlocked(selectedMapId);
  const selectedDifficultyUnlocked = isDifficultyUnlocked(selectedDifficultyId);
  const normalCleared = Boolean(mapClearRecords[selectedMapId]?.DIFF001?.cleared);
  const battleBlockedReason = !selectedMapUnlocked ? selectedMap.unlockHint : !selectedDifficultyUnlocked ? selectedDifficulty.unlockHint : "";
  const canEnterBattle = selectedMapUnlocked && selectedDifficultyUnlocked && !isPreparingBattleAssets;
  const hpStat = selectedCharacter.stats.find((stat) => stat.kind === "health");
  const luckStat = selectedCharacter.stats.find((stat) => stat.kind === "luck");
  const weaponStat = selectedCharacter.stats.find((stat) => stat.kind === "weapon");

  return (
    <section className="character-select" aria-label="战斗准备">
      <div className="character-select__topbar">
        <button type="button" className="character-select__back" aria-label="返回" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        </button>
        <strong>战斗准备</strong>
      </div>

      <section className="prep-character-card" aria-label={`${selectedCharacter.name}摘要`}>
        <span className="prep-character-card__portrait">
          <img src={selectedCharacter.portraitUrl} alt="" draggable="false" />
        </span>
        <div className="prep-character-card__main">
          <strong>{selectedCharacter.name}</strong>
          <span>均衡成长型</span>
          <p>{hpStat?.label ?? "HP"} {hpStat?.value ?? "100"} · Luck {luckStat?.value ?? "20%"}</p>
          <p>初始武器：{weaponStat?.value ?? "芒果蛋糕"}</p>
        </div>
        <button type="button" className="prep-character-card__details" onClick={() => setShowAttributes(true)}>
          <Info aria-hidden="true" size={14} strokeWidth={2.4} />
          详细属性
        </button>
      </section>

      <section className={selectedMapUnlocked ? "selected-map-hero" : "selected-map-hero selected-map-hero--locked"} aria-label="当前地图">
        <img src={MAP_PREVIEW_URLS[selectedMap.id]} alt="" draggable="false" />
        <div className="selected-map-hero__shade" aria-hidden="true" />
        <div className="selected-map-hero__content">
          <span>{selectedMap.code}</span>
          <h2>{selectedMap.name}</h2>
          <p>{selectedMap.description}</p>
          <div className="selected-map-hero__meta">
            <span>
              推荐 {Array.from({ length: selectedMap.recommendedPower }, (_, index) => <Star aria-hidden="true" size={11} fill="currentColor" key={index} />)}
            </span>
            <span><Crown aria-hidden="true" size={11} strokeWidth={2.4} />{MONSTER_CATALOG_BY_ID[selectedMap.bossId].name}</span>
          </div>
          <div className="selected-map-hero__tags">
            {selectedMap.mechanicTags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <strong>{selectedMapUnlocked ? (normalCleared ? "普通已通关" : "已解锁") : selectedMap.unlockHint}</strong>
        </div>
      </section>

      <section className="map-carousel" aria-label="地图选择">
        {MAP_CONFIGS.map((mapConfig) => {
          const unlocked = isMapUnlocked(mapConfig.id);
          const selected = selectedMapId === mapConfig.id;
          return (
            <button
              type="button"
              className={`map-mini-card ${selected ? "map-mini-card--selected" : ""} ${unlocked ? "" : "map-mini-card--locked"}`}
              key={mapConfig.id}
              aria-pressed={selected}
              onClick={() => onSelectMap(mapConfig.id)}
            >
              <img src={MAP_PREVIEW_URLS[mapConfig.id]} alt="" draggable="false" />
              <span>{MAP_SHORT_NAMES[mapConfig.id]}</span>
              {unlocked ? <ShieldCheck aria-hidden="true" size={13} /> : <Lock aria-hidden="true" size={13} />}
            </button>
          );
        })}
      </section>

      <section className="difficulty-compact" aria-label="难度选择">
        <div className="difficulty-compact__title">
          <span><Trophy aria-hidden="true" size={14} strokeWidth={2.4} />难度</span>
          <strong>{selectedDifficulty.name}</strong>
        </div>
        <div className="difficulty-button-grid">
          {DIFFICULTY_PRESETS.map((difficulty) => {
            const unlocked = isDifficultyUnlocked(difficulty.id);
            const selected = selectedDifficultyId === difficulty.id;
            const cleared = Boolean(mapClearRecords[selectedMapId]?.[difficulty.id]?.cleared);
            return (
              <button
                type="button"
                className={`difficulty-mini-button ${selected ? "difficulty-mini-button--selected" : ""} ${unlocked ? "" : "difficulty-mini-button--locked"}`}
                key={difficulty.id}
                aria-pressed={selected}
                onClick={() => onSelectDifficulty(difficulty.id)}
              >
                <strong>{difficulty.name}{cleared ? " ✓" : ""}</strong>
                <span><Swords aria-hidden="true" size={12} strokeWidth={2.3} />x{difficulty.enemyHpMultiplier}</span>
                <span><Coins aria-hidden="true" size={12} strokeWidth={2.3} />x{difficulty.coinRewardMultiplier}</span>
                {!unlocked ? <em><Lock aria-hidden="true" size={11} strokeWidth={2.3} />锁定</em> : null}
              </button>
            );
          })}
        </div>
        <p className="difficulty-compact__desc">
          {selectedDifficultyUnlocked ? selectedDifficulty.description : selectedDifficulty.unlockHint}
          <span>金币 x{selectedDifficulty.coinRewardMultiplier} / 敌强 x{selectedDifficulty.enemyHpMultiplier}</span>
        </p>
      </section>

      <div className="battle-bottom-bar" aria-label="战斗操作">
        <p>
          <span>{selectedMap.name} / {selectedDifficulty.name}</span>
          <strong>{battleBlockedReason || (isPreparingBattleAssets ? "资源准备中" : "准备就绪")}</strong>
        </p>
        <div className="battle-bottom-bar__actions">
          <button type="button" className="btn-battle" disabled={!canEnterBattle} onClick={onEnterBattle}>
            <Swords aria-hidden="true" size={18} strokeWidth={2.6} />
            {selectedMapUnlocked && selectedDifficultyUnlocked ? (isPreparingBattleAssets ? "准备中" : "进入战斗") : "未解锁"}
          </button>
        </div>
      </div>

      {showAttributes ? (
        <div className="attribute-modal-layer" role="dialog" aria-modal="true" aria-labelledby="attribute-modal-title">
          <div className="attribute-modal-panel">
            <button type="button" className="attribute-modal-close" aria-label="关闭属性" onClick={() => setShowAttributes(false)}>
              <X aria-hidden="true" size={18} strokeWidth={2.6} />
            </button>
            <h2 id="attribute-modal-title">{selectedCharacter.name}详细属性</h2>
            <div className="attribute-modal-grid">
              {selectedCharacter.stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div className={`character-stat character-stat--${stat.kind}`} key={stat.label}>
                    <span className="character-stat__icon" aria-hidden="true">
                      <Icon strokeWidth={2.25} />
                    </span>
                    <span className="character-stat__label">{stat.label}：</span>
                    <span className="character-stat__value">{stat.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
