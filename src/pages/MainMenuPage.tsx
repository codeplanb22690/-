import { BookOpen, MessageCircle, Play, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BattleScreen } from "@/features/battle/BattleScreen";
import { MONSTER_CATALOG, RELIC_CATALOG, WEAPON_CATALOG } from "@/features/catalog/gameCatalog";
import { CodexPage } from "@/features/catalog/CodexPage";
import { characters } from "@/features/character-select/characters";
import { CharacterSelectScreen } from "@/features/character-select/CharacterSelectScreen";
import { DIFFICULTY_PRESETS, MAP_CONFIGS, getDifficultyPreset, getMapConfig } from "@/features/maps/mapConfigs";
import { SettingsDialog } from "@/features/settings/SettingsDialog";
import { XingliChatPage } from "@/features/xingli-chat/XingliChatPage";
import { persistRunTelemetryFromSummary } from "@/services/gameTelemetry";
import { createLastRunSummary, readLastRunSummary, saveLastRunSummary } from "@/services/runSummaryService";
import { markXingliProactiveToastShown, readXingliMessageState, shouldShowXingliProactiveToast } from "@/services/xingliChatStorage";
import { consumePendingProactiveMessage, createPendingProactiveMessage, readPendingProactiveMessage } from "@/services/xingliProactiveService";
import { startLobbyMusic, stopLobbyMusic } from "@/shared/audio/music";

import type { BattleSummary } from "@/features/battle/BattleScreen";
import type { DifficultyId, MapId } from "@/features/maps/mapConfigs";
import type { LastRunSummary, PendingProactiveMessage } from "@/features/xingli-chat/xingliChat.types";

const xingliPortraitUrl = characters[0].portraitUrl;

type GameScreen = "menu" | "codex" | "xingli-chat" | "character-select" | "battle";

type ArchiveSave = {
  runs: number;
  victories: number;
  bestLevel: number;
  walletCoins: number;
  totalCoins: number;
  unlockedMaps: MapId[];
  unlockedDifficulties: DifficultyId[];
  mapClearRecords: Partial<Record<MapId, Partial<Record<DifficultyId, MapClearRecord>>>>;
  monsters: string[];
  weapons: string[];
  relics: string[];
  achievements: string[];
};

type MapClearRecord = {
  cleared: boolean;
  bestLevel: number;
  bestKills: number;
  bestCoins: number;
};

const STORAGE_KEY = "xingcunzhe-archive-v1";

const DEFAULT_ARCHIVE: ArchiveSave = {
  runs: 0,
  victories: 0,
  bestLevel: 1,
  walletCoins: 0,
  totalCoins: 0,
  unlockedMaps: ["MAP001"],
  unlockedDifficulties: ["DIFF001"],
  mapClearRecords: {},
  monsters: [],
  weapons: ["mangoCake"],
  relics: [],
  achievements: ["wake"],
};

function readArchive(): ArchiveSave {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_ARCHIVE;
  try {
    const parsed = JSON.parse(raw) as Partial<ArchiveSave>;
    return {
      ...DEFAULT_ARCHIVE,
      ...parsed,
      walletCoins: parsed.walletCoins ?? parsed.totalCoins ?? DEFAULT_ARCHIVE.walletCoins,
      unlockedMaps: parsed.unlockedMaps?.length ? parsed.unlockedMaps : DEFAULT_ARCHIVE.unlockedMaps,
      unlockedDifficulties: parsed.unlockedDifficulties?.length ? parsed.unlockedDifficulties : DEFAULT_ARCHIVE.unlockedDifficulties,
      mapClearRecords: parsed.mapClearRecords ?? DEFAULT_ARCHIVE.mapClearRecords,
    };
  } catch {
    return DEFAULT_ARCHIVE;
  }
}

function saveArchive(archive: ArchiveSave) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

function mergeUnique(items: string[], additions: string[]) {
  return [...new Set([...items, ...additions])];
}

function hasCleared(archive: ArchiveSave, mapId: MapId, difficultyId: DifficultyId) {
  return Boolean(archive.mapClearRecords[mapId]?.[difficultyId]?.cleared);
}

function isMapUnlocked(archive: ArchiveSave, mapId: MapId) {
  return archive.unlockedMaps.includes(mapId) || getMapConfig(mapId).defaultUnlocked;
}

function getAdvancedClearCount(archive: ArchiveSave) {
  return MAP_CONFIGS.filter((map) => hasCleared(archive, map.id, "DIFF002")).length;
}

function isDifficultyUnlocked(archive: ArchiveSave, difficultyId: DifficultyId) {
  if (difficultyId === "DIFF001") return true;
  if (archive.unlockedDifficulties.includes(difficultyId)) return true;
  if (difficultyId === "DIFF002") return MAP_CONFIGS.some((map) => hasCleared(archive, map.id, "DIFF001"));
  if (difficultyId === "DIFF003") return getAdvancedClearCount(archive) >= 3 || hasCleared(archive, "MAP004", "DIFF001");
  if (difficultyId === "DIFF004") return hasCleared(archive, "MAP006", "DIFF001");
  return false;
}

function getExpectedClearUnlocks(archive: ArchiveSave, mapId: MapId, difficultyId: DifficultyId) {
  const mapConfig = getMapConfig(mapId);
  const difficulty = getDifficultyPreset(difficultyId);
  const unlocks: string[] = [];
  if (difficultyId === "DIFF001" && mapConfig.nextMapId && !isMapUnlocked(archive, mapConfig.nextMapId)) unlocks.push(`解锁${getMapConfig(mapConfig.nextMapId).name}`);
  if (difficultyId === "DIFF001" && !isDifficultyUnlocked(archive, "DIFF002")) unlocks.push("解锁进阶难度");
  if ((mapId === "MAP004" && difficultyId === "DIFF001") || (difficultyId === "DIFF002" && getAdvancedClearCount(archive) >= 2)) {
    if (!isDifficultyUnlocked(archive, "DIFF003")) unlocks.push("解锁噩梦难度");
  }
  if (mapId === "MAP006" && difficultyId === "DIFF001" && !isDifficultyUnlocked(archive, "DIFF004")) unlocks.push("解锁星蚀难度");
  const coinReward = mapConfig.firstClearCoins[difficultyId];
  if (coinReward) unlocks.push(`首次${difficulty.name}通关金币 +${coinReward}`);
  return unlocks;
}

function mergeUnlockedDifficulties(archive: ArchiveSave) {
  return DIFFICULTY_PRESETS.filter((difficulty) => isDifficultyUnlocked(archive, difficulty.id)).map((difficulty) => difficulty.id);
}

export function MainMenuPage() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [battleDurationSeconds, setBattleDurationSeconds] = useState(15 * 60);
  const [testFullBuild, setTestFullBuild] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<MapId>("MAP001");
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<DifficultyId>("DIFF001");
  const [archive, setArchive] = useState<ArchiveSave>(() => readArchive());
  const [lastRunSummary, setLastRunSummary] = useState<LastRunSummary | null>(() => readLastRunSummary());
  const [pendingProactiveMessage, setPendingProactiveMessage] = useState<PendingProactiveMessage | null>(() => readPendingProactiveMessage());
  const [xingliMessageState, setXingliMessageState] = useState(() => readXingliMessageState(pendingProactiveMessage));
  const [activeXingliToast, setActiveXingliToast] = useState<PendingProactiveMessage | null>(null);

  const refreshXingliMessageState = useCallback(() => {
    setXingliMessageState(readXingliMessageState(pendingProactiveMessage));
  }, [pendingProactiveMessage]);

  useEffect(() => {
    if (screen === "battle") {
      stopLobbyMusic();
      return;
    }

    startLobbyMusic();
  }, [screen]);

  useEffect(() => {
    setXingliMessageState(readXingliMessageState(pendingProactiveMessage));
  }, [pendingProactiveMessage]);

  useEffect(() => {
    const message = pendingProactiveMessage;
    if (screen !== "menu" || !message || !shouldShowXingliProactiveToast(message)) return;
    setActiveXingliToast(message);
    markXingliProactiveToastShown(message.id);
    const timer = window.setTimeout(() => setActiveXingliToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [pendingProactiveMessage, screen]);

  function openSettings() {
    dialogRef.current?.showModal();
  }

  function startGame() {
    setScreen("character-select");
  }

  function enterBattle() {
    setBattleDurationSeconds(15 * 60);
    setTestFullBuild(false);
    setScreen("battle");
  }

  function completeBattle(summary: BattleSummary) {
    const isVictory = summary.outcome === "victory";
    const firstClear = isVictory && !hasCleared(archive, summary.mapId, summary.difficultyId);
    const selectedMap = getMapConfig(summary.mapId);
    const firstClearCoins = firstClear ? selectedMap.firstClearCoins[summary.difficultyId] ?? 0 : 0;
    const nextArchive: ArchiveSave = {
      runs: archive.runs + 1,
      victories: archive.victories + (isVictory ? 1 : 0),
      bestLevel: Math.max(archive.bestLevel, summary.level),
      walletCoins: archive.walletCoins + summary.coins + firstClearCoins,
      totalCoins: archive.totalCoins + summary.coins + firstClearCoins,
      unlockedMaps: archive.unlockedMaps,
      unlockedDifficulties: archive.unlockedDifficulties,
      mapClearRecords: archive.mapClearRecords,
      monsters: mergeUnique(archive.monsters, summary.encounteredMonsters),
      weapons: mergeUnique(
        archive.weapons,
        Object.entries(summary.weapons)
          .filter(([, level]) => level > 0)
          .map(([weapon]) => weapon),
      ),
      relics: mergeUnique(archive.relics, summary.relics),
      achievements: archive.achievements,
    };
    if (isVictory) {
      nextArchive.mapClearRecords = {
        ...nextArchive.mapClearRecords,
        [summary.mapId]: {
          ...nextArchive.mapClearRecords[summary.mapId],
          [summary.difficultyId]: {
            cleared: true,
            bestLevel: Math.max(nextArchive.mapClearRecords[summary.mapId]?.[summary.difficultyId]?.bestLevel ?? 0, summary.level),
            bestKills: Math.max(nextArchive.mapClearRecords[summary.mapId]?.[summary.difficultyId]?.bestKills ?? 0, summary.kills),
            bestCoins: Math.max(nextArchive.mapClearRecords[summary.mapId]?.[summary.difficultyId]?.bestCoins ?? 0, summary.coins),
          },
        },
      };
      if (summary.difficultyId === "DIFF001" && selectedMap.nextMapId) nextArchive.unlockedMaps = mergeUnique(nextArchive.unlockedMaps, [selectedMap.nextMapId]) as MapId[];
    }
    nextArchive.unlockedDifficulties = mergeUnique(nextArchive.unlockedDifficulties, mergeUnlockedDifficulties(nextArchive)) as DifficultyId[];
    const unlocked = new Set(nextArchive.achievements);
    unlocked.add("wake");
    unlocked.add("firstRun");
    if (isVictory) unlocked.add("firstVictory");
    if (isVictory && summary.timeLeft > 1) unlocked.add("bossHunter");
    if (isVictory && summary.mapId === "MAP002" && summary.difficultyId === "DIFF001") unlocked.add("moonParkClear");
    if (isVictory && summary.mapId === "MAP006" && summary.difficultyId === "DIFF004") unlocked.add("trueStarSurvivor");
    if (isVictory && MAP_CONFIGS.every((map) => hasCleared(nextArchive, map.id, "DIFF001"))) unlocked.add("allNormalMaps");
    if (isVictory && MAP_CONFIGS.every((map) => hasCleared(nextArchive, map.id, "DIFF002"))) unlocked.add("allAdvancedMaps");
    if (summary.weapons.moonBookmark > 0) unlocked.add("dualBuild");
    if (summary.relics.length >= 3) unlocked.add("relicCollector");
    if (summary.weapons.mangoCake >= 8) unlocked.add("cakeMaster");
    for (const achievement of summary.achievements) unlocked.add(achievement);
    if (summary.evolvedWeapons.length > 0) unlocked.add("weaponMaster");
    if (summary.kills >= 100) unlocked.add("clearExpert");
    if (summary.eliteKills >= 50) unlocked.add("eliteHunter");
    if (nextArchive.totalCoins >= 50) unlocked.add("starlitPurse");
    nextArchive.achievements = [...unlocked];
    setArchive(nextArchive);
    saveArchive(nextArchive);
    persistRunTelemetryFromSummary(summary);
    const runSummary = createLastRunSummary(summary);
    saveLastRunSummary(runSummary);
    setLastRunSummary(runSummary);
    const proactiveMessage = createPendingProactiveMessage(runSummary);
    if (proactiveMessage) setPendingProactiveMessage(proactiveMessage);
  }

  function consumeXingliProactiveMessage(messageId: string) {
    const next = consumePendingProactiveMessage(messageId);
    setPendingProactiveMessage(next);
    setXingliMessageState(readXingliMessageState(next));
  }

  function returnFromBattle(summary?: BattleSummary) {
    if (summary) completeBattle(summary);
    setScreen("menu");
  }

  const unlockedCodex = archive.monsters.length + archive.weapons.length + archive.relics.length;
  const totalCodex = MONSTER_CATALOG.length + WEAPON_CATALOG.length + RELIC_CATALOG.length;

  return (
    <div id="viewport">
      <main id="game-frame" className={`game-frame game-frame--${screen}`} aria-label="游戏主画面" tabIndex={-1}>
        <div className="game-frame__bg" aria-hidden="true" />
        <div className="game-frame__vignette" aria-hidden="true" />

        {screen === "battle" ? (
          <BattleScreen
            durationSeconds={battleDurationSeconds}
            testFullBuild={testFullBuild}
            mapId={selectedMapId}
            difficultyId={selectedDifficultyId}
            archivedAchievements={archive.achievements}
            isFirstMapDifficultyClear={!hasCleared(archive, selectedMapId, selectedDifficultyId)}
            expectedClearUnlocks={getExpectedClearUnlocks(archive, selectedMapId, selectedDifficultyId)}
            onReturnMain={returnFromBattle}
          />
        ) : (
          <>
            {screen !== "codex" && screen !== "character-select" && screen !== "xingli-chat" ? (
              <div className="game-frame__topbar">
                <button
                  type="button"
                  className="btn-settings"
                  aria-label="设置"
                  title="设置"
                  onClick={openSettings}
                >
                  <Settings className="btn-settings__icon" aria-hidden="true" strokeWidth={2.2} />
                </button>
              </div>
            ) : null}

            <div className="game-frame__content">
              {screen === "menu" ? (
                <section className="lobby-screen" aria-label="星黎大厅">
                  {activeXingliToast ? (
                    <button
                      type="button"
                      className="xingli-message-toast"
                      onClick={() => {
                        setActiveXingliToast(null);
                        setScreen("xingli-chat");
                      }}
                    >
                      <img src={xingliPortraitUrl} alt="" draggable="false" />
                      <span>小星黎给你发消息啦</span>
                    </button>
                  ) : null}
                  <div className="lobby-hero">
                    <div className="lobby-hero__stage" aria-label="星黎动态展示">
                      <div className="lobby-hero__halo" aria-hidden="true" />
                      <img className="lobby-hero__portrait" src={xingliPortraitUrl} alt="星黎" draggable="false" />
                    </div>
                    <div className="lobby-hero__copy">
                      <p className="title-block__subtitle">SURVIVOR · DAWN</p>
                      <h1 className="title-block__title">黎明时分：星存者</h1>
                      <div className="lobby-action-stack">
                        <button type="button" className="btn-start btn-start--lobby" onClick={startGame}>
                          <Play aria-hidden="true" size={20} strokeWidth={2.6} />
                          <span className="btn-start__text">开始游戏</span>
                        </button>
                        <button type="button" className="btn-codex-entry" onClick={() => setScreen("codex")}>
                          <BookOpen aria-hidden="true" size={19} strokeWidth={2.5} />
                          <span>图鉴</span>
                          <strong>{unlockedCodex}/{totalCodex}</strong>
                        </button>
                        <button type="button" className="btn-codex-entry btn-xingli-chat-entry" onClick={() => setScreen("xingli-chat")}>
                          <MessageCircle aria-hidden="true" size={19} strokeWidth={2.5} />
                          <span>星黎对话</span>
                          {xingliMessageState.hasUnread ? <span className="xingli-unread-badge" aria-label={`${xingliMessageState.unreadCount}条未读消息`}>{xingliMessageState.unreadCount > 9 ? "9+" : xingliMessageState.unreadCount}</span> : null}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : screen === "codex" ? (
                <CodexPage archive={archive} onBack={() => setScreen("menu")} onOpenSettings={openSettings} />
              ) : screen === "xingli-chat" ? (
                <XingliChatPage
                  unlockedCodexCount={unlockedCodex}
                  totalCodexCount={totalCodex}
                  achievementsUnlocked={archive.achievements.length}
                  lastRunSummary={lastRunSummary}
                  pendingProactiveMessage={pendingProactiveMessage}
                  currentScreen={screen}
                  selectedMapName={getMapConfig(selectedMapId).name}
                  selectedDifficultyName={getDifficultyPreset(selectedDifficultyId).name}
                  onConsumeProactiveMessage={consumeXingliProactiveMessage}
                  onChatStateChange={refreshXingliMessageState}
                  onBack={() => setScreen("menu")}
                  onOpenSettings={openSettings}
                />
              ) : (
                <CharacterSelectScreen
                  onBack={() => setScreen("menu")}
                  selectedMapId={selectedMapId}
                  selectedDifficultyId={selectedDifficultyId}
                  mapClearRecords={archive.mapClearRecords}
                  isMapUnlocked={(mapId) => isMapUnlocked(archive, mapId)}
                  isDifficultyUnlocked={(difficultyId) => isDifficultyUnlocked(archive, difficultyId)}
                  onSelectMap={setSelectedMapId}
                  onSelectDifficulty={setSelectedDifficultyId}
                  onEnterBattle={enterBattle}
                />
              )}
            </div>

            <footer className="frame-footer">
              <span>v0.1 · React Prototype</span>
            </footer>
          </>
        )}
      </main>

      <SettingsDialog ref={dialogRef} />
    </div>
  );
}
