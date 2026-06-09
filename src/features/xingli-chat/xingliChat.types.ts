export type ChatMessageRole = "player" | "xingli" | "system";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: number;
  read?: boolean;
  emotion?: "neutral" | "happy" | "teasing" | "worried" | "proud" | "soft";
  meta?: {
    source?: "manual_chat" | "post_run" | "game_event" | "system";
    runId?: string;
    mapId?: string;
    bossId?: string;
  };
};

export type XingliChatContext = {
  playerName?: string;
  lastRun?: LastRunSummary;
  currentGameState?: {
    currentScreen?: string;
    selectedMap?: string;
    selectedDifficulty?: string;
  };
  codexProgress?: {
    unlocked: number;
    total: number;
  };
  achievementsUnlocked?: number;
};

export type LastRunSummary = {
  runId: string;
  mapName: string;
  difficulty: string;
  result: "victory" | "defeat" | "timeout";
  survivedTime: number;
  finalLevel: number;
  kills: number;
  coins: number;
  bossName?: string;
  bossDefeated?: boolean;
  deathReason?: string;
  mainWeapons: string[];
  relics: string[];
  superWeapons: string[];
  achievementsUnlocked: string[];
  highlights: string[];
  mistakes: string[];
};

export type PendingProactiveMessage = {
  id: string;
  runId?: string;
  content: string;
  createdAt: number;
  consumed: boolean;
  trigger:
    | "post_run_victory"
    | "post_run_defeat"
    | "high_kills"
    | "super_weapon"
    | "first_boss_defeat"
    | "failure_streak";
};
