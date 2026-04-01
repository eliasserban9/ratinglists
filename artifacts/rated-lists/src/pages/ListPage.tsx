import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLists } from "@/hooks/useLists";
import type { SortMode } from "@/hooks/useLists";
import { ItemRow, fmt, ratingColors } from "@/components/ItemRow";
import { NewItemDialog } from "@/components/NewItemDialog";

interface Props {
  params: { id: string };
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "added", label: "As Added" },
  { value: "rating", label: "By Rating" },
  { value: "name", label: "By Name" },
];

function sortLabel(mode: SortMode) {
  if (mode === "rating") return "sorted by rating";
  if (mode === "name") return "sorted by name";
  return "custom order";
}

const PREVIEW_SCALE = 0.58;

export default function ListPage({ params }: Props) {
  const { id } = params;
  const [, navigate] = useLocation();
  const {
    getList, getCategory, addItem, updateItemRating, deleteItem,
    setSortMode, moveItem, renameList, renameItem, setListDescription,
  } = useLists();
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const list = getList(id);

  useEffect(() => {
    if (editingTitle) setTimeout(() => titleInputRef.current?.focus(), 30);
  }, [editingTitle]);

  useEffect(() => {
    if (editingDesc) setTimeout(() => descRef.current?.focus(), 30);
  }, [editingDesc]);

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">List not found.</p>
      </div>
    );
  }

  const currentSortMode: SortMode = list.sortMode ?? "rating";
  const parentCategory = list.categoryId ? getCategory(list.categoryId) : undefined;
  const backLabel = parentCategory ? parentCategory.title : "Rating Lists";
  const backPath = parentCategory ? `/category/${parentCategory.id}` : "/";

  const avg =
    list.items.length > 0
      ? list.items.reduce((s, i) => s + i.rating, 0) / list.items.length
      : null;
  const avgColors = avg !== null ? ratingColors(avg) : null;

  let displayedItems = [...list.items];
  if (currentSortMode === "rating") {
    displayedItems.sort((a, b) => b.rating - a.rating);
  } else if (currentSortMode === "name") {
    displayedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  function startTitleEdit() {
    if (previewMode) return;
    setTitleValue(list!.title);
    setEditingTitle(true);
  }

  function commitTitleEdit() {
    if (titleValue.trim()) renameList(id, titleValue.trim());
    setEditingTitle(false);
  }

  function handleTitleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitTitleEdit();
    if (e.key === "Escape") setEditingTitle(false);
  }

  function startDescEdit() {
    if (previewMode) return;
    setDescValue(list!.description ?? "");
    setEditingDesc(true);
  }

  function commitDescEdit() {
    setListDescription(id, descValue);
    setEditingDesc(false);
  }

  function handleDescKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") commitDescEdit();
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1 text-primary text-sm hover:opacity-70 transition-opacity"
          >
            <span className="text-lg leading-none">‹</span>
            <span>{backLabel}</span>
          </button>

          <button
            onClick={() => setPreviewMode((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
            style={
              previewMode
                ? {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary))",
                  }
                : {
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                    borderColor: "hsl(var(--border))",
                  }
            }
            aria-label="Toggle preview mode"
          >
            <span>📷</span>
            <span>{previewMode ? "Exit Preview" : "Preview"}</span>
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between gap-3 mb-1">
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
              className="text-3xl font-bold text-foreground truncate cursor-pointer hover:opacity-75 transition-opacity"
              onClick={startTitleEdit}
              title={previewMode ? undefined : "Tap to rename"}
            >
              {list.title}
            </h1>
          )}

          {!previewMode && (
            <div className="relative shrink-0">
              <select
                value={currentSortMode}
                onChange={(e) => setSortMode(id, e.target.value as SortMode)}
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
          )}
        </div>

        {/* Average rating badge */}
        {avgColors && avg !== null && (
          <div className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl mb-2"
            style={{ backgroundColor: avgColors.bg }}>
            <span className="text-lg font-bold" style={{ color: avgColors.ratingColor }}>
              {fmt(avg)}
            </span>
            <span className="text-xs font-medium" style={{ color: avgColors.rankColor }}>
              avg
            </span>
          </div>
        )}

        {/* Description — hidden in preview mode */}
        {!previewMode && (
          editingDesc ? (
            <textarea
              ref={descRef}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={commitDescEdit}
              onKeyDown={handleDescKey}
              placeholder="Add a description…"
              rows={3}
              className="w-full text-sm bg-transparent border-b outline-none resize-none text-muted-foreground mb-2 placeholder:text-muted-foreground/50"
              style={{ borderColor: "hsl(var(--border))" }}
            />
          ) : (
            <p
              className="text-muted-foreground text-sm mb-2 cursor-pointer hover:opacity-70 transition-opacity min-h-[1.5rem] whitespace-pre-wrap"
              onClick={startDescEdit}
              title="Tap to add description"
            >
              {list.description || <span className="opacity-40 italic">Add a description…</span>}
            </p>
          )
        )}

        {!previewMode && (
          <p className="text-muted-foreground text-sm mb-6">
            {list.items.length === 0
              ? "No items yet"
              : `${list.items.length} item${list.items.length === 1 ? "" : "s"} · ${sortLabel(currentSortMode)}`}
          </p>
        )}

        {previewMode && <div className="mb-3" />}

        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="text-5xl">🎯</div>
            <p className="text-muted-foreground text-base">Tap + to add your first item.</p>
          </div>
        ) : (
          <div className={previewMode ? "flex flex-col gap-0.5" : "flex flex-col gap-2"}>
            {displayedItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                rank={index + 1}
                onRatingChange={(rating) => updateItemRating(id, item.id, rating)}
                onRename={(name) => renameItem(id, item.id, name)}
                onDelete={() => deleteItem(id, item.id)}
                showMoveBar={!previewMode && currentSortMode === "added"}
                onMoveUp={() => moveItem(id, item.id, "up")}
                onMoveDown={() => moveItem(id, item.id, "down")}
                isFirst={index === 0}
                isLast={index === displayedItems.length - 1}
                scale={previewMode ? PREVIEW_SCALE : 1}
              />
            ))}
          </div>
        )}
      </div>

      {!previewMode && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all z-50"
          aria-label="Add item"
        >+</button>
      )}

      <NewItemDialog
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(name, rating) => { addItem(id, name, rating); setOpen(false); }}
      />
    </div>
  );
}
