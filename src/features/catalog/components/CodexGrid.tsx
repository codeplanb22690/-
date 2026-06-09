import { CodexCard } from "@/features/catalog/components/CodexCard";

import type { CodexEntry } from "@/features/catalog/codexEntries";

type CodexGridProps = {
  entries: CodexEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: CodexEntry) => void;
};

export function CodexGrid({ entries, selectedId, onSelectEntry }: CodexGridProps) {
  return (
    <div className="codex-page-grid" aria-label="图鉴条目">
      {entries.map((entry) => (
        <CodexCard entry={entry} selected={selectedId === entry.id} onSelect={onSelectEntry} key={`${entry.category}-${entry.id}`} />
      ))}
    </div>
  );
}

