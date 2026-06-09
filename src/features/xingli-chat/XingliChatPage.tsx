import { useEffect, useMemo, useState } from "react";

import { characters } from "@/features/character-select/characters";
import { ChatBackground } from "@/features/xingli-chat/components/ChatBackground";
import { ChatEmptyState } from "@/features/xingli-chat/components/ChatEmptyState";
import { ChatInputBar } from "@/features/xingli-chat/components/ChatInputBar";
import { ChatMessageList } from "@/features/xingli-chat/components/ChatMessageList";
import { ChatTopBar } from "@/features/xingli-chat/components/ChatTopBar";
import { useKeyboardInset } from "@/features/xingli-chat/hooks/useKeyboardInset";
import { XingliCharacterStage } from "@/features/xingli-chat/components/XingliCharacterStage";
import { markAllXingliChatMessagesRead, readXingliChatMessages, saveXingliChatMessages, upsertXingliChatMessage } from "@/services/xingliChatStorage";
import { sendMessageToXingli } from "@/services/xingliChatService";

import type { CSSProperties, MouseEvent } from "react";
import type { ChatMessage, LastRunSummary, PendingProactiveMessage, XingliChatContext } from "@/features/xingli-chat/xingliChat.types";

type XingliChatPageProps = {
  unlockedCodexCount: number;
  totalCodexCount: number;
  achievementsUnlocked: number;
  lastRunSummary: LastRunSummary | null;
  pendingProactiveMessage: PendingProactiveMessage | null;
  currentScreen: string;
  selectedMapName: string;
  selectedDifficultyName: string;
  onConsumeProactiveMessage: (messageId: string) => void;
  onChatStateChange?: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
};

export function XingliChatPage({
  unlockedCodexCount,
  totalCodexCount,
  achievementsUnlocked,
  lastRunSummary,
  pendingProactiveMessage,
  currentScreen,
  selectedMapName,
  selectedDifficultyName,
  onConsumeProactiveMessage,
  onChatStateChange,
  onBack,
  onOpenSettings,
}: XingliChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readXingliChatMessages());
  const [draft, setDraft] = useState("");
  const [showCharacterStage, setShowCharacterStage] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [scrollToBottomKey, setScrollToBottomKey] = useState(0);
  const keyboardInset = useKeyboardInset();
  const pageStyle = useMemo(
    () => ({ "--keyboard-offset": `${keyboardInset}px` }) as CSSProperties,
    [keyboardInset],
  );
  const chatContext = useMemo<XingliChatContext>(
    () => ({
      lastRun: lastRunSummary ?? undefined,
      currentGameState: {
        currentScreen,
        selectedMap: selectedMapName,
        selectedDifficulty: selectedDifficultyName,
      },
      codexProgress: {
        unlocked: unlockedCodexCount,
        total: totalCodexCount,
      },
      achievementsUnlocked,
    }),
    [achievementsUnlocked, currentScreen, lastRunSummary, selectedDifficultyName, selectedMapName, totalCodexCount, unlockedCodexCount],
  );

  function commitMessages(updater: (current: ChatMessage[]) => ChatMessage[]) {
    setMessages((current) => saveXingliChatMessages(updater(current)));
  }

  useEffect(() => {
    const readMessages = markAllXingliChatMessagesRead();
    setMessages(readMessages);
    onChatStateChange?.();
  }, [onChatStateChange]);

  useEffect(() => {
    if (!pendingProactiveMessage || pendingProactiveMessage.consumed) return;
    const proactiveMessage: ChatMessage = {
      id: pendingProactiveMessage.id,
      role: "xingli",
      content: pendingProactiveMessage.content,
      createdAt: pendingProactiveMessage.createdAt,
      read: true,
      emotion: pendingProactiveMessage.trigger === "post_run_defeat" ? "soft" : "proud",
      meta: { source: "post_run", runId: pendingProactiveMessage.runId },
    };
    setMessages(upsertXingliChatMessage(proactiveMessage));
    onConsumeProactiveMessage(pendingProactiveMessage.id);
    onChatStateChange?.();
  }, [onChatStateChange, onConsumeProactiveMessage, pendingProactiveMessage]);

  async function submitDraft() {
    const content = draft.trim();
    if (!content || isSending) return;
    setDraft("");
    setIsSending(true);
    const playerMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "player",
      content,
      createdAt: Date.now(),
      read: true,
      meta: { source: "manual_chat", runId: lastRunSummary?.runId },
    };
    commitMessages((current) => [...current, playerMessage]);
    setScrollToBottomKey((current) => current + 1);
    try {
      const serviceMessage = await sendMessageToXingli(content, chatContext);
      commitMessages((current) => {
        if (serviceMessage.role === "system" && current.some((message) => message.id === "system-ai-not-connected" || message.content === serviceMessage.content)) return current;
        return [
          ...current,
          {
            ...serviceMessage,
            id: serviceMessage.role === "system" ? "system-ai-not-connected" : serviceMessage.id,
            read: true,
          },
        ];
      });
      onChatStateChange?.();
    } finally {
      setIsSending(false);
    }
  }

  function handleInputFocus() {
    window.setTimeout(() => window.scrollTo(0, 0), 60);
    window.setTimeout(() => window.scrollTo(0, 0), 220);
    window.setTimeout(() => setScrollToBottomKey((current) => current + 1), 220);
  }

  function handleBackgroundClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-chat-interactive="true"]') ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    if (keyboardInset > 24) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) activeElement.blur();
      return;
    }

    setShowCharacterStage((current) => !current);
  }

  return (
    <section
      className={`xingli-chat-page ${showCharacterStage ? "character-visible" : "character-hidden"}`}
      aria-label="星黎对话页面"
      onClick={handleBackgroundClick}
      style={pageStyle}
    >
      <ChatBackground />
      <XingliCharacterStage portraitUrl={characters[0].portraitUrl} />
      <ChatTopBar onBack={onBack} onOpenSettings={onOpenSettings} />
      <main className="xingli-chat-layer" data-chat-interactive="true">
        {messages.length > 0 ? <ChatMessageList messages={messages} scrollToBottomKey={scrollToBottomKey} /> : <ChatEmptyState />}
      </main>
      <ChatInputBar value={draft} onChange={setDraft} onSubmit={submitDraft} onFocus={handleInputFocus} disabled={isSending} />
    </section>
  );
}
