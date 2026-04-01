import { useState, useLayoutEffect, useRef, useEffect } from "react";
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

// Max items shown per preview page
const ITEMS_PER_PAGE = 10;

export default function ListPage({ params }: Props) {
  const { id } = params;
  const [, navigate] = useLocation();
  const {
    getList, getCategory, addItem, updateItemRating, deleteItem,
    setSortMode, moveItem, renameList, renameItem, setListDescription, setListNote,
  } = useLists();

  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  // Preview mode state
  const [previewMode, setPreviewMode] = useState(false);
  const [pageScale, setPageScale] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);
  const [scrolledPastHalf, setScrolledPastHalf] = useState(false);

  // Refs for measurement
  const measureRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const prevPreviewModeRef = useRef(false);
  const prevItemCountRef = useRef(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = getList(id);

  useEffect(() => {
    if (editingTitle) setTimeout(() => titleInputRef.current?.focus(), 30);
  }, [editingTitle]);

  useEffect(() => {
    if (editingDesc) setTimeout(() => descRef.current?.focus(), 30);
  }, [editingDesc]);

  useEffect(() => {
    if (editingNote) setTimeout(() => noteRef.current?.focus(), 30);
  }, [editingNote]);

  useEffect(() => {
    function onScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setScrolledPastHalf(scrollable > 0 && window.scrollY > scrollable / 2);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Compute preview scale whenever mode or item count changes.
  // Scale is based on fitting ITEMS_PER_PAGE items so it stays consistent across pages.
  useLayoutEffect(() => {
    const itemCount = list?.items.length ?? 0;
    const previewModeChanged = prevPreviewModeRef.current !== previewMode;
    const itemCountChanged = prevItemCountRef.current !== itemCount;

    prevPreviewModeRef.current = previewMode;
    prevItemCountRef.current = itemCount;

    if (!previewMode) {
      if (previewModeChanged) {
        setPageScale(1);
        setPreviewPage(0);
      }
      return;
    }

    if (!previewModeChanged && !itemCountChanged) return;
    if (!measureRef.current || !itemsRef.current) return;

    setPreviewPage(0);

    const naturalHeight = measureRef.current.scrollHeight;
    const rect = itemsRef.current.getBoundingClientRect();
    const availableHeight = window.innerHeight - rect.top - 8;

    if (naturalHeight <= 0 || availableHeight <= 0 || itemCount <= 0) return;

    // Compute a consistent scale based on a full page of ITEMS_PER_PAGE items.
    // If fewer items exist, base it on however many there are (capped at ITEMS_PER_PAGE).
    const perItemHeight = naturalHeight / itemCount;
    const referenceItems = Math.min(ITEMS_PER_PAGE, itemCount);
    const referenceHeight = perItemHeight * referenceItems;
    // Cap at 1 so items are never larger than their natural size
    const scale = Math.min(1, availableHeight / referenceHeight);
    setPageScale(scale);
  }, [previewMode, list?.items.length]);

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

  // Pagination derived values — always ITEMS_PER_PAGE per page in preview mode
  const totalPages = previewMode ? Math.ceil(displayedItems.length / ITEMS_PER_PAGE) : 1;
  const safePage = Math.min(previewPage, Math.max(0, totalPages - 1));
  const pageStart = safePage * ITEMS_PER_PAGE;
  const pageEnd = Math.min(pageStart + ITEMS_PER_PAGE, displayedItems.length);
  const currentPageItems = previewMode
    ? displayedItems.slice(pageStart, pageEnd)
    : displayedItems;

  function handleTogglePreview() {
    setPreviewMode((v) => !v);
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

  function startNoteEdit() {
    if (previewMode) return;
    setNoteValue(list!.note ?? "");
    setEditingNote(true);
  }

  function commitNoteEdit() {
    setListNote(id, noteValue);
    setEditingNote(false);
  }

  function handleNoteKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") commitNoteEdit();
  }

  function handleScrollArrow() {
    if (scrolledPastHalf) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div
      className="min-h-screen"
      style={previewMode ? { overflow: "hidden", backgroundColor: "hsl(var(--bg-list))" } : { paddingBottom: "6rem", backgroundColor: "hsl(var(--bg-list))" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-10 pb-4">

        {/* Top bar: back + preview toggle */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1 text-primary text-sm hover:opacity-70 transition-opacity"
          >
            <span className="text-lg leading-none">‹</span>
            <span>{backLabel}</span>
          </button>

          <button
            onClick={handleTogglePreview}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
            style={
              previewMode
                ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
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
          <div
            className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl mb-2"
            style={{ backgroundColor: avgColors.bg }}
          >
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

        {previewMode && <div className="mb-2" />}

        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="text-5xl">🎯</div>
            <p className="text-muted-foreground text-base">Tap + to add your first item.</p>
          </div>
        ) : (
          <>
            {/* Off-screen measurement div — always has ALL items at natural scale */}
            {previewMode && (
              <div
                ref={measureRef}
                className="flex flex-col gap-0.5"
                style={{ position: "absolute", top: -9999, left: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}
                aria-hidden="true"
              >
                {displayedItems.map((item, index) => (
                  <ItemRow
                    key={`measure-${item.id}`}
                    item={item}
                    rank={index + 1}
                    onRatingChange={() => {}}
                    onDelete={() => {}}
                    hideDelete
                  />
                ))}
              </div>
            )}

            {/* Visible items area */}
            <div
              ref={itemsRef}
              className={previewMode ? "flex flex-col gap-0.5" : "flex flex-col gap-2"}
              style={previewMode ? { zoom: `${pageScale * 100}%` } : undefined}
            >
              {currentPageItems.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  rank={pageStart + index + 1}
                  onRatingChange={(rating) => updateItemRating(id, item.id, rating)}
                  onRename={(name) => renameItem(id, item.id, name)}
                  onDelete={() => deleteItem(id, item.id)}
                  showMoveBar={!previewMode && currentSortMode === "added"}
                  onMoveUp={() => moveItem(id, item.id, "up")}
                  onMoveDown={() => moveItem(id, item.id, "down")}
                  isFirst={index === 0}
                  isLast={index === currentPageItems.length - 1}
                  hideDelete={previewMode}
                />
              ))}
            </div>

            {/* Page navigation — arrows + dots */}
            {previewMode && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-25"
                  style={{
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                  }}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewPage(i)}
                      aria-label={`Page ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{
                        width: i === safePage ? 20 : 8,
                        height: 8,
                        backgroundColor:
                          i === safePage
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground) / 35%)",
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-25"
                  style={{
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                  }}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
        {/* Note section — below items, hidden in preview mode */}
        {!previewMode && (
          <div className="mt-6">
            {editingNote ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={noteRef}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={handleNoteKey}
                  placeholder="Add a note…"
                  rows={4}
                  className="w-full text-sm bg-transparent border-b outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/50"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <div className="flex justify-start">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitNoteEdit(); }}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : list.note ? (
              <p
                className="text-muted-foreground text-sm cursor-pointer hover:opacity-70 transition-opacity whitespace-pre-wrap"
                onClick={startNoteEdit}
                title="Tap to edit note"
              >
                {list.note}
              </p>
            ) : (
              <button
                onClick={startNoteEdit}
                className="text-sm font-medium transition-opacity hover:opacity-60"
                style={{ color: "hsl(var(--muted-foreground) / 45%)" }}
              >
                + note
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!previewMode && (
        <div className="fixed bottom-6 right-6 flex flex-col items-center gap-2 z-50">
          <button
            onClick={handleScrollArrow}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
            aria-label={scrolledPastHalf ? "Scroll to top" : "Scroll to bottom"}
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ transform: scrolledPastHalf ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all"
            aria-label="Add item"
          >
            +
          </button>
        </div>
      )}

      <NewItemDialog
        open={open}
        onClose={() => setOpen(false)}
        onAdd={(name, rating) => { addItem(id, name, rating); setOpen(false); }}
      />
    </div>
  );
}
