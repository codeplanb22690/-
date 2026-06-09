import type { CodexEntry } from "@/features/catalog/codexEntries";
import { CodexIcon } from "@/features/catalog/components/CodexIcon";

type CodexCardProps = {
  entry: CodexEntry;
  selected: boolean;
  onSelect: (entry: CodexEntry) => void;
};

export function CodexCard({ entry, selected, onSelect }: CodexCardProps) {
  return (
    <button
      type="button"
      className={[
        "codex-page-card",
        entry.unlocked ? "codex-page-card--unlocked" : "codex-page-card--locked",
        selected ? "codex-page-card--selected" : "",
      ].join(" ")}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entry);
      }}
    >
      <span className="codex-page-card__icon">
        {entry.unlocked ? <CodexIcon entry={entry} /> : <span aria-hidden="true">?</span>}
      </span>
      <span className="codex-page-card__body">
        <span className="codex-page-card__code">{entry.code}</span>
        <strong>{entry.unlocked ? entry.name : "???"}</strong>
        <span>{entry.unlocked ? entry.typeLabel : "资料未解锁"}</span>
      </span>
      <span className="codex-page-card__rarity">{entry.unlocked ? entry.rarity : "未知"}</span>
    </button>
  );
}
