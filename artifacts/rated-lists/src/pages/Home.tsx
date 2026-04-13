import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useLists } from "@/hooks/useLists";
import { useTheme } from "@/hooks/useTheme";
import { ListCard } from "@/components/ListCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ItemRow } from "@/components/ItemRow";
import { CreateTypeDialog } from "@/components/CreateTypeDialog";
import { SettingsSheet } from "@/components/SettingsSheet";
import { TrashModal } from "@/components/TrashModal";
import type { SortMode } from "@/hooks/useLists";

export default function Home() {
  useEffect(() => { document.body.dataset.page = "home"; }, []);

  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { theme, toggle } = useTheme();
  const { signOut } = useClerk();
  const {
    loading,
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-muted"
          style={{
            borderTopColor: "hsl(var(--primary))",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <p className="text-muted-foreground text-sm font-medium">Loading your lists…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
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
      const catA = a.kind === "category";
      const catB = b.kind === "category";
      if (catA && catB) return 0;
      if (catA) return 1;
      if (catB) return -1;
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
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Lists</h1>
            <p className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5 opacity-70">
              Rate &amp; rank anything
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasContent && (
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="appearance-none text-xs font-medium rounded-lg pl-3 pr-6 py-1.5 border cursor-pointer outline-none"
                  style={{
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                >
                  <option value="added">Recent</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                </select>
                <span
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px]"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >▾</span>
              </div>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
              style={{
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--muted-foreground))",
                letterSpacing: "0.08em",
              }}
            >
              ···
            </button>
          </div>
        </div>

        {hasContent && (
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none select-none" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg pl-8 pr-8 py-2 text-sm outline-none border"
              style={{
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                borderColor: "hsl(var(--border))",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm transition-opacity hover:opacity-70"
                style={{ color: "hsl(var(--muted-foreground))" }}
                aria-label="Clear search"
              >×</button>
            )}
          </div>
        )}

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-2 text-center">
            <p className="text-foreground font-semibold text-base">Nothing here yet</p>
            <p className="text-muted-foreground text-sm">Tap + to create your first list.</p>
          </div>
        ) : searchQuery.trim() ? (() => {
          const q = searchQuery.trim().toLowerCase();
          const matched = lists.filter((l) => l.title.toLowerCase().includes(q));
          return matched.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
              <div className="text-4xl">🔍</div>
              <p className="text-muted-foreground text-sm">No lists matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matched.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onClick={() => navigate(`/list/${list.id}`)}
                  onDelete={() => deleteList(list.id)}
                  onColorModeChange={(value) => setColorMode(list.id, value)}
                />
              ))}
            </div>
          );
        })() : (
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

      <TrashModal open={trashOpen} onClose={() => setTrashOpen(false)} />
      <CreateTypeDialog open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDownload={handleDownload}
        onUpload={handleUpload}
        theme={theme}
        onToggleTheme={toggle}
        onOpenTrash={() => setTrashOpen(true)}
        onSignOut={() => signOut({ redirectUrl: "/" })}
      />
    </div>
  );
}
