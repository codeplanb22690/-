import type { LastRunSummary, PendingProactiveMessage } from "@/features/xingli-chat/xingliChat.types";

const PENDING_MESSAGE_STORAGE_KEY = "xingcunzhe-xingli-pending-message-v1";
const PROACTIVE_COOLDOWN_STORAGE_KEY = "xingcunzhe-xingli-proactive-cooldown-v1";
const NORMAL_COOLDOWN_MS = 60_000;

type CooldownState = {
  lastCreatedAt: number;
  consumedRunIds: string[];
};

function readCooldownState(): CooldownState {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROACTIVE_COOLDOWN_STORAGE_KEY) ?? "{}") as Partial<CooldownState>;
    return {
      lastCreatedAt: parsed.lastCreatedAt ?? 0,
      consumedRunIds: parsed.consumedRunIds ?? [],
    };
  } catch {
    return { lastCreatedAt: 0, consumedRunIds: [] };
  }
}

function writeCooldownState(state: CooldownState): void {
  localStorage.setItem(PROACTIVE_COOLDOWN_STORAGE_KEY, JSON.stringify(state));
}

export function readPendingProactiveMessage(): PendingProactiveMessage | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING_MESSAGE_STORAGE_KEY) ?? "null") as PendingProactiveMessage | null;
  } catch {
    return null;
  }
}

export function savePendingProactiveMessage(message: PendingProactiveMessage): void {
  localStorage.setItem(PENDING_MESSAGE_STORAGE_KEY, JSON.stringify(message));
}

export function consumePendingProactiveMessage(messageId: string): PendingProactiveMessage | null {
  const current = readPendingProactiveMessage();
  if (!current || current.id !== messageId) return current;
  const next = { ...current, consumed: true };
  savePendingProactiveMessage(next);
  const cooldown = readCooldownState();
  writeCooldownState({
    ...cooldown,
    consumedRunIds: [...new Set([...cooldown.consumedRunIds, current.runId ?? current.id])].slice(-24),
  });
  return next;
}

export function createPendingProactiveMessage(summary: LastRunSummary, now = Date.now()): PendingProactiveMessage | null {
  const cooldown = readCooldownState();
  if (cooldown.consumedRunIds.includes(summary.runId)) return null;
  if (now - cooldown.lastCreatedAt < NORMAL_COOLDOWN_MS) return null;

  let trigger: PendingProactiveMessage["trigger"] = summary.result === "victory" ? "post_run_victory" : "post_run_defeat";
  if (summary.superWeapons.length > 0) trigger = "super_weapon";
  if (summary.bossDefeated) trigger = "first_boss_defeat";
  if (summary.kills >= 1000) trigger = "high_kills";

  const build = summary.mainWeapons[0] ? `，主力是${summary.mainWeapons[0]}` : "";
  const content =
    summary.result === "victory"
      ? `这局${summary.mapName}打得很稳，${summary.difficulty}也压住了${build}。要不要让我帮你复盘一下 Build？`
      : `刚才在${summary.mapName}倒下有点可惜，尤其是${summary.mistakes[0] ?? "后半段压力起来以后"}。来，我陪你拆一下哪里能更顺。`;

  const message: PendingProactiveMessage = {
    id: crypto.randomUUID(),
    runId: summary.runId,
    content,
    createdAt: now,
    consumed: false,
    trigger,
  };
  savePendingProactiveMessage(message);
  writeCooldownState({ ...cooldown, lastCreatedAt: now });
  return message;
}
