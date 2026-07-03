import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { consumePageAnimation, markAppNavigation } from "@/lib/navigation";
import { useLists } from "@/hooks/useLists";
import type { SortMode } from "@/hooks/useLists";
import { ListCard } from "@/components/ListCard";
import { NewListDialog } from "@/components/NewListDialog";
import { CopyToListModal } from "@/components/CopyToListModal";

interface Props {
  params: { id: string };
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "added", label: "As Added" },
  { value: "rating", label: "By Rating" },
  { value: "name", label: "By Name" },
];

function avgRating(items: { rating: number }[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((s, i) => s + i.rating, 0) / items.length;
}

export default function CategoryPage({ params }: Props) {
  const { id } = params;
  const [, navigate] = useLocation();
  const [shouldAnimate] = useState(() => consumePageAnimation());
  const {
    loading: listsLoading,
    getCategory, getListsForCategory, createListInCategory,
    deleteList, setColorMode, renameCategory, setCategorySortMode,
    copyItemsToLists, allLists,
  } = useLists();
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copySourceListId, setCopySourceListId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }
  const category = getCategory(id);
  const rawLists = getListsForCategory(id);

  useEffect(() => { document.body.dataset.page = "category"; }, []);

  useEffect(() => {
    if (editingTitle) setTimeout(() => titleInputRef.current?.focus(), 30);
  }, [editingTitle]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{listsLoading ? "Loading…" : "Category not found."}</p>
      </div>
    );
  }

  const currentSortMode: SortMode = category.sortMode ?? "added";

  const lists = [...rawLists].sort((a, b) => {
    if (currentSortMode === "name") return a.title.localeCompare(b.title);
    if (currentSortMode === "rating") {
      const ra = avgRating(a.items);
      const rb = avgRating(b.items);
      if (ra === null && rb === null) return 0;
      if (ra === null) return 1;
      if (rb === null) return -1;
      return rb - ra;
    }
    return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
  });

  function handleCreate(title: string) {
    const listId = createListInCategory(id, title);
    navigate(`/list/${listId}`);
  }

  function startTitleEdit() {
    setTitleValue(category!.title);
    setEditingTitle(true);
  }

  function commitTitleEdit() {
    if (titleValue.trim()) renameCategory(id, titleValue.trim());
    setEditingTitle(false);
  }

  function handleTitleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitTitleEdit();
    if (e.key === "Escape") setEditingTitle(false);
  }

  return (
    <div className={`min-h-screen pb-24${shouldAnimate ? " page-enter" : ""}`}>
      <div className="max-w-lg mx-auto px-4 pt-10 pb-4">
        <button
          onClick={() => { markAppNavigation(); window.history.length > 1 ? window.history.back() : navigate("/", { replace: true }); }}
          className="flex items-center gap-1 text-primary text-sm mb-6 hover:opacity-70 transition-opacity"
        >
          <span className="text-lg leading-none">‹</span>
          <span>Rating Lists</span>
        </button>

        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">📁</span>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={handleTitleKey}
                className="flex-1 text-3xl font-bold bg-transparent border-b-2 outline-none text-foreground"
                style={{ borderColor: "hsl(var(--primary))" }}
                maxLength={60}
              />
            ) : (
              <h1
                className="text-3xl font-bold text-foreground cursor-pointer hover:opacity-75 transition-opacity truncate"
                onClick={startTitleEdit}
                title="Tap to rename"
              >
                {category.title}
              </h1>
            )}
          </div>

          <div className="relative shrink-0">
            <select
              value={currentSortMode}
              onChange={(e) => setCategorySortMode(id, e.target.value as SortMode)}
              className="appearance-none text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 border cursor-pointer outline-none"
              style={{
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--foreground))",
                borderColor: "hsl(var(--border))",
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >▾</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-5 pl-12">
          {lists.length === 0
            ? "No lists yet"
            : `${lists.length} list${lists.length === 1 ? "" : "s"}`}
        </p>

        {lists.length > 0 && (
          <div className="relative mb-5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: "hsl(var(--muted-foreground))" }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lists…"
              className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none border"
              style={{
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--foreground))",
                borderColor: "hsl(var(--border))",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-opacity hover:opacity-70"
                style={{ color: "hsl(var(--muted-foreground))" }}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
        )}

        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="text-5xl">📋</div>
            <p className="text-muted-foreground text-base">Tap + to add your first list.</p>
          </div>
        ) : (() => {
          const filtered = searchQuery.trim()
            ? lists.filter((l) => l.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
            : lists;
          return filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
              <div className="text-4xl">🔍</div>
              <p className="text-muted-foreground text-sm">No lists matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onClick={() => navigate(`/list/${list.id}`)}
                  onDelete={() => deleteList(list.id)}
                  onColorModeChange={(value) => setColorMode(list.id, value)}
                  onAddToList={() => setCopySourceListId(list.id)}
                />
              ))}
            </div>
          );
        })()}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label="New list"
      >+</button>

      <NewListDialog open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-2xl shadow-lg text-sm font-medium text-white flex items-center gap-2"
          style={{ backgroundColor: toast.ok ? "#16a34a" : "#dc2626", maxWidth: "calc(100vw - 2rem)" }}
        >
          <span>{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {copySourceListId && (() => {
        const src = allLists.find((l) => l.id === copySourceListId);
        if (!src) return null;
        return (
          <CopyToListModal
            sourceList={src}
            allLists={allLists}
            onClose={() => setCopySourceListId(null)}
            onConfirm={(targetIds) => {
              copyItemsToLists(copySourceListId, targetIds);
              showToast(`Copied to ${targetIds.length} list${targetIds.length === 1 ? "" : "s"}`, true);
            }}
          />
        );
      })()}
    </div>
  );
}
