import { X } from "lucide-react";

import type { CodexEntry } from "@/features/catalog/codexEntries";
import { CodexIcon } from "@/features/catalog/components/CodexIcon";

type CodexDetailBarProps = {
  entry: CodexEntry | null;
  onClose: () => void;
};

export function CodexDetailBar({ entry, onClose }: CodexDetailBarProps) {
  if (!entry) return null;

  return (
    <aside className="codex-detail-bar" aria-label="图鉴详情" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="codex-detail-bar__close" aria-label="关闭详情" onClick={onClose}>
        <X aria-hidden="true" size={18} strokeWidth={2.6} />
      </button>
      <div className="codex-detail-bar__icon" aria-hidden="true">
        {entry.unlocked ? <CodexIcon entry={entry} size={54} /> : <span>?</span>}
      </div>
      <div className="codex-detail-bar__content">
        <span className="codex-detail-bar__eyebrow">{entry.code} · {entry.typeLabel}</span>
        <h2>{entry.unlocked ? entry.name : "???"}</h2>
        {entry.unlocked ? (
          <>
            <p>{entry.description}</p>
            <p>{entry.shortDesc}</p>
            <div className="codex-detail-bar__stats">
              {entry.stats.map((stat) => (
                <span key={stat.label}>
                  <strong>{stat.label}</strong>
                  {stat.value}
                </span>
              ))}
            </div>
            <div className="codex-detail-bar__tags">
              {entry.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </>
        ) : (
          <p>{entry.unlockHint || "继续探索以解锁该资料。"}</p>
        )}
      </div>
    </aside>
  );
}
