import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useLists } from "@/hooks/useLists";
import { useTheme } from "@/hooks/useTheme";
import { ListCard } from "@/components/ListCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ItemRow } from "@/components/ItemRow";
import { CreateTypeDialog } from "@/components/CreateTypeDialog";
import { SettingsSheet } from "@/components/SettingsSheet";
import type { SortMode } from "@/hooks/useLists";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { theme, toggle } = useTheme();
  const {
    lists,
    categories,
    standaloneItems,
    createList,
    deleteList,
    setColorMode,
    createCategory,
    deleteCategory,
    getListsForCategory,
    addStandaloneItem,
    updateStandaloneItemRating,
    deleteStandaloneItem,
    renameStandaloneItem,
    getAllData,
    importData,
  } = useLists();
  const [, navigate] = useLocation();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function handleDownload() {
    const data = getAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rating-lists-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Data downloaded successfully!", true);
  }

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.lists)) {
          showToast("Invalid file — not a Rating Lists backup.", false);
          return;
        }
        importData(parsed);
        showToast("Data imported successfully!", true);
      } catch {
        showToast("Failed to read file. Make sure it's a valid JSON backup.", false);
      }
    };
    reader.readAsText(file);
  }

  function handleCreate(type: "list" | "category" | "item", title: string, rating?: number) {
    if (type === "list") {
      const id = createList(title);
      navigate(`/list/${id}`);
    } else if (type === "category") {
      const id = createCategory(title);
      navigate(`/category/${id}`);
    } else {
      addStandaloneItem(title, rating ?? 5);
    }
  }

  const hasContent = lists.length > 0 || categories.length > 0 || standaloneItems.length > 0;

  function avgOf(ratings: number[]): number | null {
    if (ratings.length === 0) return null;
    return ratings.reduce((s, r) => s + r, 0) / ratings.length;
  }

  // Merge all home-screen items
  type HomeEntry =
    | { kind: "category"; item: (typeof categories)[0]; sortKey: number; avgRating: number | null }
    | { kind: "list"; item: (typeof lists)[0]; sortKey: number; avgRating: number | null }
    | { kind: "item"; item: (typeof standaloneItems)[0]; sortKey: number; avgRating: number | null };

  const allItems: HomeEntry[] = [
    ...categories.map((c) => {
      const catLists = getListsForCategory(c.id);
      const ratings = catLists.flatMap((l) => l.items.map((i) => i.rating));
      return { kind: "category" as const, item: c, sortKey: c.createdAt, avgRating: avgOf(ratings) };
    }),
    ...lists.map((l) => ({
      kind: "list" as const,
      item: l,
      sortKey: l.updatedAt ?? l.createdAt,
      avgRating: avgOf(l.items.map((i) => i.rating)),
    })),
    ...standaloneItems.map((i) => ({
      kind: "item" as const,
      item: i,
      sortKey: i.updatedAt,
      avgRating: i.rating,
    })),
  ].sort((a, b) => {
    if (sortMode === "name") {
      const nameA = a.kind === "item" ? a.item.name : a.item.title;
      const nameB = b.kind === "item" ? b.item.name : b.item.title;
      return nameA.localeCompare(nameB);
    }
    if (sortMode === "rating") {
      const ra = a.avgRating;
      const rb = b.avgRating;
      if (ra === null && rb === null) return 0;
      if (ra === null) return 1;
      if (rb === null) return -1;
      return rb - ra;
    }
    // "added" — most recent first
    return b.sortKey - a.sortKey;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-4">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-bold text-foreground">Rating Lists</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="mt-1 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            ⚙️
          </button>
        </div>
        <div className="flex items-center justify-between mt-1 mb-8">
          <p className="text-muted-foreground text-sm"></p>
          {hasContent && (
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="appearance-none text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 border cursor-pointer outline-none"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  color: "hsl(var(--foreground))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <option value="added">As Added</option>
                <option value="rating">By Rating</option>
                <option value="name">By Name</option>
              </select>
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >▾</span>
            </div>
          )}
        </div>

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
            <div className="text-5xl">📝</div>
            <p className="text-muted-foreground text-base">No lists yet. Tap + to create one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allItems.map(({ kind, item }) => {
              if (kind === "category") {
                return (
                  <CategoryCard
                    key={item.id}
                    category={item}
                    lists={getListsForCategory(item.id)}
                    onClick={() => navigate(`/category/${item.id}`)}
                    onDelete={() => deleteCategory(item.id)}
                  />
                );
              }
              if (kind === "list") {
                return (
                  <ListCard
                    key={item.id}
                    list={item}
                    onClick={() => navigate(`/list/${item.id}`)}
                    onDelete={() => deleteList(item.id)}
                    onColorModeChange={(value) => setColorMode(item.id, value)}
                  />
                );
              }
              // Standalone item — render as a colored row
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  onRatingChange={(rating) => updateStandaloneItemRating(item.id, rating)}
                  onRename={(name) => renameStandaloneItem(item.id, name)}
                  onDelete={() => deleteStandaloneItem(item.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label="Create new"
      >
        +
      </button>

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-2xl shadow-lg text-sm font-medium text-white flex items-center gap-2 transition-all"
          style={{ backgroundColor: toast.ok ? "#16a34a" : "#dc2626", maxWidth: "calc(100vw - 2rem)" }}
        >
          <span>{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      <CreateTypeDialog open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDownload={handleDownload}
        onUpload={handleUpload}
        theme={theme}
        onToggleTheme={toggle}
      />
    </div>
  );
}
