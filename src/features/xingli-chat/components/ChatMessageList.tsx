import { useCallback, useEffect, useRef } from "react";

import type { ChatMessage } from "@/features/xingli-chat/xingliChat.types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  scrollToBottomKey?: number;
};

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 80;
}

export function ChatMessageList({ messages, scrollToBottomKey = 0 }: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = listRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    scrollToBottom("smooth");
    shouldStickToBottomRef.current = true;
  }, [scrollToBottom, scrollToBottomKey]);

  return (
    <div
      className="xingli-chat-messages"
      aria-label="聊天消息"
      data-chat-interactive="true"
      ref={listRef}
      onScroll={(event) => {
        shouldStickToBottomRef.current = isNearBottom(event.currentTarget);
      }}
    >
      <span className="xingli-chat-messages__spacer" aria-hidden="true" />
      {messages.map((message) => (
        <div className={`xingli-chat-bubble xingli-chat-bubble--${message.role}`} data-chat-interactive="true" key={message.id}>
          <span>{message.content}</span>
        </div>
      ))}
    </div>
  );
}
