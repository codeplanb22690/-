import { ArrowLeft, Settings } from "lucide-react";

type ChatTopBarProps = {
  onBack: () => void;
  onOpenSettings: () => void;
};

export function ChatTopBar({ onBack, onOpenSettings }: ChatTopBarProps) {
  return (
    <header className="xingli-chat-topbar" data-chat-interactive="true">
      <button type="button" className="xingli-chat-icon-button" aria-label="返回首页" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
      </button>
      <strong>星黎对话</strong>
      <button type="button" className="xingli-chat-icon-button" aria-label="设置" onClick={onOpenSettings}>
        <Settings aria-hidden="true" size={18} strokeWidth={2.6} />
      </button>
    </header>
  );
}
