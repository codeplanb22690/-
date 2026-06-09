import { SendHorizontal } from "lucide-react";

type ChatInputBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export function ChatInputBar({ value, onChange, onSubmit, onFocus, onBlur, disabled = false }: ChatInputBarProps) {
  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <form
      className="xingli-chat-input"
      data-chat-interactive="true"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <label className="xingli-chat-input__field">
        <span className="sr-only">输入给星黎的消息</span>
        <input
          value={value}
          disabled={disabled}
          maxLength={120}
          placeholder="和星黎说点什么..."
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
      </label>
      <button type="submit" className="xingli-chat-input__send" aria-label="发送" disabled={!canSubmit}>
        <SendHorizontal aria-hidden="true" size={17} strokeWidth={2.6} />
      </button>
    </form>
  );
}
