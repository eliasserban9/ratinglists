import { useState } from "react";
import type { RatedList, Category } from "@/hooks/useLists";

interface Props {
  sourceList: RatedList;
  allLists: RatedList[];
  categories: Category[];
  onClose: () => void;
  onConfirm: (targetIds: string[]) => void;
}

export function CopyToListModal({ sourceList, allLists, categories, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const targets = allLists.filter((l) => l.id !== sourceList.id);

  const homeLists = targets.filter((l) => !l.categoryId);
  const catGroups = categories
    .map((cat) => ({ cat, lists: targets.filter((l) => l.categoryId === cat.id) }))
    .filter((g) => g.lists.length > 0);

  const hasAny = homeLists.length > 0 || catGroups.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    onConfirm([...selected]);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--card-border))",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div>
            <p className="font-semibold text-[15px] text-foreground leading-tight">Copy items to…</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
              from <span className="font-medium text-foreground">{sourceList.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-base text-muted-foreground transition-opacity hover:opacity-60"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {!hasAny ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">No other lists available.</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Home lists */}
              {homeLists.length > 0 && (
                <div>
                  {catGroups.length > 0 && (
                    <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Home
                    </p>
                  )}
                  {homeLists.map((list) => (
                    <ListRow
                      key={list.id}
                      list={list}
                      checked={selected.has(list.id)}
                      onToggle={() => toggle(list.id)}
                    />
                  ))}
                </div>
              )}

              {/* Category groups */}
              {catGroups.map(({ cat, lists }) => (
                <div key={cat.id}>
                  <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {cat.title}
                  </p>
                  {lists.map((list) => (
                    <ListRow
                      key={list.id}
                      list={list}
                      checked={selected.has(list.id)}
                      onToggle={() => toggle(list.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t shrink-0"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-30"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            {selected.size === 0
              ? "Select a list"
              : `Copy to ${selected.size} list${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListRow({ list, checked, onToggle }: { list: RatedList; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors active:opacity-70"
      style={{
        backgroundColor: checked ? "hsl(var(--muted))" : "transparent",
      }}
    >
      {/* Checkbox */}
      <span
        className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors"
        style={{
          borderColor: checked ? "hsl(var(--primary))" : "hsl(var(--border))",
          backgroundColor: checked ? "hsl(var(--primary))" : "transparent",
          color: "hsl(var(--primary-foreground))",
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{list.title}</p>
        <p className="text-xs text-muted-foreground">
          {list.items.length === 0 ? "Empty" : `${list.items.length} item${list.items.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </button>
  );
}
