import type { ChatMessage, PendingProactiveMessage } from "@/features/xingli-chat/xingliChat.types";

const CHAT_MESSAGES_STORAGE_KEY = "xingli_chat_messages";
const CHAT_STATE_STORAGE_KEY = "xingli_chat_state";
const MAX_CHAT_MESSAGES = 100;

export type XingliMessageState = {
  hasUnread: boolean;
  unreadCount: number;
  lastReadAt?: number;
};

type StoredChatState = {
  lastReadAt?: number;
  shownProactiveMessageIds?: string[];
};

function readStoredChatState(): StoredChatState {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STATE_STORAGE_KEY) ?? "{}") as StoredChatState;
    return {
      lastReadAt: parsed.lastReadAt,
      shownProactiveMessageIds: Array.isArray(parsed.shownProactiveMessageIds) ? parsed.shownProactiveMessageIds : [],
    };
  } catch {
    return { shownProactiveMessageIds: [] };
  }
}

function writeStoredChatState(state: StoredChatState): void {
  localStorage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(state));
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.id && message.content)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MAX_CHAT_MESSAGES);
}

export function readXingliChatMessages(): ChatMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY) ?? "[]") as ChatMessage[];
    return Array.isArray(parsed) ? sanitizeMessages(parsed) : [];
  } catch {
    return [];
  }
}

export function saveXingliChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const next = sanitizeMessages(messages);
  localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function appendXingliChatMessage(message: ChatMessage): ChatMessage[] {
  const current = readXingliChatMessages().filter((stored) => stored.id !== message.id);
  return saveXingliChatMessages([...current, message]);
}

export function upsertXingliChatMessage(message: ChatMessage): ChatMessage[] {
  const current = readXingliChatMessages();
  const index = current.findIndex((stored) => stored.id === message.id);
  if (index === -1) return saveXingliChatMessages([...current, message]);
  const next = [...current];
  next[index] = { ...next[index], ...message };
  return saveXingliChatMessages(next);
}

export function markAllXingliChatMessagesRead(now = Date.now()): ChatMessage[] {
  const messages = readXingliChatMessages().map((message) => (
    message.role === "xingli" ? { ...message, read: true } : message
  ));
  writeStoredChatState({ ...readStoredChatState(), lastReadAt: now });
  return saveXingliChatMessages(messages);
}

export function readXingliMessageState(pendingProactiveMessage?: PendingProactiveMessage | null): XingliMessageState {
  const messages = readXingliChatMessages();
  const unreadStoredCount = messages.filter((message) => message.role === "xingli" && message.read === false).length;
  const pendingAlreadyStored = Boolean(pendingProactiveMessage && messages.some((message) => message.id === pendingProactiveMessage.id));
  const pendingUnreadCount = pendingProactiveMessage && !pendingProactiveMessage.consumed && !pendingAlreadyStored ? 1 : 0;
  const unreadCount = unreadStoredCount + pendingUnreadCount;
  return {
    hasUnread: unreadCount > 0,
    unreadCount,
    lastReadAt: readStoredChatState().lastReadAt,
  };
}

export function shouldShowXingliProactiveToast(message: PendingProactiveMessage | null): boolean {
  if (!message || message.consumed) return false;
  const state = readStoredChatState();
  return !state.shownProactiveMessageIds?.includes(message.id);
}

export function markXingliProactiveToastShown(messageId: string): void {
  const state = readStoredChatState();
  writeStoredChatState({
    ...state,
    shownProactiveMessageIds: [...new Set([...(state.shownProactiveMessageIds ?? []), messageId])].slice(-32),
  });
}

export function clearXingliChatMessages(): void {
  localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
  writeStoredChatState({ ...readStoredChatState(), lastReadAt: Date.now() });
}
