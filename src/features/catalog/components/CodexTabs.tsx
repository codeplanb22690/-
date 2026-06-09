import { Bot, Crown, Gift, Grid2X2, Swords } from "lucide-react";

import type { CodexFilter } from "@/features/catalog/codexEntries";
import type { LucideIcon } from "lucide-react";

type CodexTabsProps = {
  activeFilter: CodexFilter;
  counts: Record<CodexFilter, number>;
  onSelect: (filter: CodexFilter) => void;
};

const FILTERS: Array<{ id: CodexFilter; label: string; icon: LucideIcon }> = [
  { id: "all", label: "全部", icon: Grid2X2 },
  { id: "monster", label: "怪物", icon: Bot },
  { id: "boss", label: "Boss", icon: Crown },
  { id: "weapon", label: "武器", icon: Swords },
  { id: "relic", label: "遗物", icon: Gift },
];

export function CodexTabs({ activeFilter, counts, onSelect }: CodexTabsProps) {
  return (
    <div className="codex-tabs" role="tablist" aria-label="图鉴分类" onClick={(event) => event.stopPropagation()}>
      {FILTERS.map((filter) => {
        const Icon = filter.icon;
        return (
          <button
            type="button"
            className={activeFilter === filter.id ? "codex-tab codex-tab--active" : "codex-tab"}
            role="tab"
            aria-selected={activeFilter === filter.id}
            key={filter.id}
            onClick={() => onSelect(filter.id)}
          >
            <Icon aria-hidden="true" size={13} strokeWidth={2.4} />
            <span>{filter.label}</span>
            <strong>{counts[filter.id]}</strong>
          </button>
        );
      })}
    </div>
  );
}
