import type { ChatMessage, XingliChatContext } from "@/features/xingli-chat/xingliChat.types";

export type XingliChatRequest = {
  sessionId: string;
  playerMessage: string;
  context?: XingliChatContext;
};

export type XingliChatResponse = {
  messageId: string;
  role: "xingli" | "system";
  content: string;
  emotion?: ChatMessage["emotion"];
  suggestedActions?: string[];
};

export function getOrCreateChatSessionId(): string {
  const key = "xingcunzhe-xingli-chat-session-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  localStorage.setItem(key, sessionId);
  return sessionId;
}

export async function sendMessageToXingli(input: string, context?: XingliChatContext): Promise<ChatMessage> {
  const request: XingliChatRequest = {
    sessionId: getOrCreateChatSessionId(),
    playerMessage: input,
    context: {
      lastRun: context?.lastRun,
      currentGameState: context?.currentGameState,
      codexProgress: context?.codexProgress,
      achievementsUnlocked: context?.achievementsUnlocked,
    },
  };

  const response = await fetch("/api/xingli/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: request.sessionId,
      playerMessage: request.playerMessage,
      context: {
        lastRunSummary: context?.lastRun ?? null,
        codexProgress: context?.codexProgress ?? null,
        achievements: [],
      },
    }),
  });

  const body = (await response.json()) as Partial<XingliChatResponse> & { error?: string };
  if (!response.ok) {
    return {
      id: crypto.randomUUID(),
      role: "system",
      content: body.error ?? "AI 接口请求失败",
      createdAt: Date.now(),
      emotion: "neutral",
      meta: { source: "system", runId: context?.lastRun?.runId },
    };
  }

  return {
    id: body.messageId ?? crypto.randomUUID(),
    role: body.role === "xingli" ? "xingli" : "system",
    content: body.content ?? "星黎刚才没有接收到清晰信号。",
    createdAt: Date.now(),
    emotion: body.emotion ?? "neutral",
    meta: { source: "manual_chat", runId: context?.lastRun?.runId },
  };
}
