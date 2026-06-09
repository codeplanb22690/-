import { ArrowLeft, BookOpen, Settings, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { buildCodexEntries } from "@/features/catalog/codexEntries";
import { CodexDetailBar } from "@/features/catalog/components/CodexDetailBar";
import { CodexGrid } from "@/features/catalog/components/CodexGrid";
import { CodexTabs } from "@/features/catalog/components/CodexTabs";

import type { CodexArchiveState, CodexEntry, CodexFilter } from "@/features/catalog/codexEntries";

type CodexPageProps = {
  archive: CodexArchiveState;
  onBack: () => void;
  onOpenSettings: () => void;
};

export function CodexPage({ archive, onBack, onOpenSettings }: CodexPageProps) {
  const entries = useMemo(() => buildCodexEntries(archive), [archive]);
  const [activeFilter, setActiveFilter] = useState<CodexFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredEntries = useMemo(
    () => (activeFilter === "all" ? entries : entries.filter((entry) => entry.category === activeFilter)),
    [activeFilter, entries],
  );
  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedId) ?? null;
  const unlockedCount = entries.filter((entry) => entry.unlocked).length;
  const counts: Record<CodexFilter, number> = {
    all: entries.length,
    monster: entries.filter((entry) => entry.category === "monster").length,
    boss: entries.filter((entry) => entry.category === "boss").length,
    weapon: entries.filter((entry) => entry.category === "weapon").length,
    relic: entries.filter((entry) => entry.category === "relic").length,
  };

  useEffect(() => {
    if (selectedId && !filteredEntries.some((entry) => entry.id === selectedId)) setSelectedId(null);
  }, [activeFilter, filteredEntries, selectedId]);

  useEffect(() => {
    function closeWithEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    window.addEventListener("keydown", closeWithEsc);
    return () => window.removeEventListener("keydown", closeWithEsc);
  }, []);

  function selectEntry(entry: CodexEntry) {
    setSelectedId(entry.id);
  }

  return (
    <section className="codex-page" aria-label="图鉴" onClick={() => setSelectedId(null)}>
      <header className="codex-page__header" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="codex-page__back" aria-label="返回首页" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        </button>
        <div className="codex-page__title">
          <span><BookOpen aria-hidden="true" size={18} strokeWidth={2.5} />资料终端</span>
          <h1>图鉴</h1>
        </div>
        <button type="button" className="codex-page__settings" aria-label="设置" onClick={onOpenSettings}>
          <Settings aria-hidden="true" size={18} strokeWidth={2.6} />
        </button>
      </header>

      <div className="codex-page__progress" aria-label={`已发现 ${unlockedCount}/${entries.length}`}>
        <Sparkles aria-hidden="true" size={17} strokeWidth={2.5} />
        <span>已发现</span>
        <strong>{unlockedCount}/{entries.length}</strong>
      </div>

      <CodexTabs activeFilter={activeFilter} counts={counts} onSelect={setActiveFilter} />
      <CodexGrid entries={filteredEntries} selectedId={selectedEntry?.id ?? null} onSelectEntry={selectEntry} />
      <CodexDetailBar entry={selectedEntry} onClose={() => setSelectedId(null)} />
    </section>
  );
}
